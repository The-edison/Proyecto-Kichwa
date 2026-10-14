<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\IntentoEvaluacion;
use App\Models\Pregunta;
use App\Models\RespuestaActividad;
use App\Models\RespuestaEvaluacion;
use App\Models\Tema;
use App\Models\Unidad;
use App\Models\Usuario;
use App\Services\ContratoEjercicio;
use App\Services\DominioLecciones;
use App\Services\EstadoContenido;
use App\Services\KichwaResource;
use App\Services\SecuenciaUnidad;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class KichwaSubmissionController extends Controller
{
    public function pair(Request $request, int $attempt): JsonResponse
    {
        $data = $request->validate(['question_id' => ['required', 'integer'], 'origin' => ['required', 'string', 'max:40'], 'destination' => ['required', 'string', 'max:40']]);
        $record = IntentoEvaluacion::where('id_usuario', $request->user()->id_usuario)->findOrFail($attempt);
        abort_unless($record->estado_intento === 'en_curso', 409, 'El intento ya está cerrado.');
        $evaluation = EvaluacionKichwa::findOrFail($record->id_evaluacion);
        abort_unless($evaluation->configuracion['managed'] ?? false, 403, 'Esta evaluación se corrige al finalizar.');
        abort_if($evaluation->configuracion['final'] ?? false, 403, 'El desafío se corrige al finalizar.');
        $question = DominioLecciones::selected($record)->firstWhere('id_pregunta', $data['question_id']);
        abort_unless($question && $question->tipo_pregunta === 'relacionar', 422, 'La pregunta no corresponde a este intento.');
        $exercise = KichwaResource::present('questions', $question, true);
        abort_unless(collect($exercise['elements'])->contains(fn ($e) => $e['id'] === $data['origin'] && ($e['grupo'] ?? '') === 'origen')
            && collect($exercise['elements'])->contains(fn ($e) => $e['id'] === $data['destination'] && ($e['grupo'] ?? '') === 'destino'), 422, 'Selecciona una pareja válida.');
        $correct = collect($exercise['solution']['pares'])->contains(fn ($pair) => $pair['origen'] === $data['origin'] && $pair['destino'] === $data['destination']);

        return response()->json(['is_correct' => $correct, 'feedback' => $correct ? 'Pareja correcta.' : 'Esta pareja no corresponde. Intenta nuevamente.']);
    }

    public function activity(Request $request, int $exercise): JsonResponse
    {
        $data = $request->validate(['answer' => ['required', 'array']]);
        $result = DB::transaction(function () use ($request, $exercise, $data): array {
            Usuario::whereKey($request->user()->id_usuario)->lockForUpdate()->firstOrFail();
            $record = Actividad::whereKey($exercise)->lockForUpdate()->firstOrFail();
            $unit = KichwaCatalogController::publishedUnit($record->id_unidad);
            if (($unit->configuracion['learning_mode'] ?? '') === 'sequence') {
                $evaluation = SecuenciaUnidad::evaluation($unit->id_unidad);
                abort_unless($evaluation && SecuenciaUnidad::practices($evaluation)->contains('id_actividad', $record->id_actividad), 404);
            }
            if ($record->id_tema !== null) {
                abort_unless(Tema::whereKey($record->id_tema)->where('publicado', true)->exists(), 404);
            }
            abort_unless($record->publicado, 404);
            EstadoContenido::assertReady(KichwaResource::present('exercises', $record, true));
            $correct = ContratoEjercicio::grade(KichwaResource::present('exercises', $record, true), $data['answer']);
            $feedback = ContratoEjercicio::feedback(KichwaResource::present('exercises', $record, true), $correct);
            $answer = RespuestaActividad::create([
                'id_usuario' => $request->user()->id_usuario, 'id_actividad' => $exercise,
                'respuesta_actividad' => $data['answer'], 'acierto_actividad' => $correct,
                'retroalimentacion_actividad' => $feedback]);

            return ['response_id' => $answer->id_respuesta_actividad, 'is_correct' => $correct, 'feedback' => $feedback, 'highlight' => $record->configuracion['reveal_highlight'] ?? null] + DominioLecciones::rewardActivity($record, $answer);
        });

        return response()->json($result);
    }

    public function guidedResult(Request $request, int $unit): JsonResponse
    {
        $record = KichwaCatalogController::publishedUnit($unit);
        abort_unless(($record->configuracion['learning_mode'] ?? '') === 'guided', 404);
        $exercises = Actividad::where('id_unidad', $unit)->where('publicado', true)->whereNull('id_tema')->orderBy('orden_actividad')->get();
        abort_unless($exercises->count() === 2, 409, 'La unidad está en preparación.');
        $data = $request->validate(['response_ids' => ['required', 'array', 'size:2'], 'response_ids.*' => ['required', 'integer', 'distinct', 'min:1']]);
        $responses = RespuestaActividad::where('id_usuario', $request->user()->id_usuario)->whereIn('id_respuesta_actividad', $data['response_ids'])
            ->whereIn('id_actividad', $exercises->pluck('id_actividad'))->get()->keyBy('id_actividad');
        if ($responses->count() !== $exercises->count()) {
            throw ValidationException::withMessages(['response_ids' => 'Responde las dos actividades de esta unidad antes de ver tu resultado.']);
        }
        $correctItems = 0;
        $totalItems = 0;
        $details = [];
        foreach ($exercises as $exercise) {
            $response = $responses[$exercise->id_actividad];
            if ($exercise->tipo_actividad === 'relacionar') {
                $pairs = $exercise->solucion_actividad['pares'];
                $total = count($pairs);
                $correct = collect($pairs)->filter(fn ($pair) => collect($response->respuesta_actividad['pares'] ?? [])
                    ->contains(fn ($given) => ($given['origen'] ?? null) === $pair['origen'] && ($given['destino'] ?? null) === $pair['destino']))->count();
            } else {
                $total = 1;
                $correct = $response->acierto_actividad ? 1 : 0;
            }
            $correctItems += $correct;
            $totalItems += $total;
            $details[] = ['exercise_id' => $exercise->id_actividad, 'title' => $exercise->configuracion['title'] ?? $exercise->enunciado_actividad, 'correct' => $correct, 'total' => $total];
        }
        $score = $totalItems > 0 ? (int) round(20 * $correctItems / $totalItems) : 0;
        $next = Unidad::where('id_modulo', $record->id_modulo)->where('publicado', true)->where('orden_unidad', '>', $record->orden_unidad)->orderBy('orden_unidad')->value('id_unidad');

        return response()->json(['score' => $score, 'max_score' => 20, 'correct_count' => $correctItems, 'total_items' => $totalItems,
            'passed' => $score >= 16, 'details' => $details, 'next_unit_id' => $next]);
    }

    public function start(Request $request, int $evaluation): JsonResponse
    {
        $record = EvaluacionKichwa::findOrFail($evaluation);
        abort_unless(Pregunta::where('id_evaluacion', $evaluation)->exists(), 422, 'Añade preguntas antes de iniciar una evaluación.');
        $attempt = DB::transaction(function () use ($request, $evaluation) {
            Usuario::whereKey($request->user()->id_usuario)->lockForUpdate()->firstOrFail();
            $open = IntentoEvaluacion::where('id_usuario', $request->user()->id_usuario)->where('id_evaluacion', $evaluation)->where('estado_intento', 'en_curso')->first();

            if ($open) {
                return $open;
            }
            $record = EvaluacionKichwa::whereKey($evaluation)->lockForUpdate()->firstOrFail();
            KichwaCatalogController::publishedEvaluation($record);
            DominioLecciones::assertUnlocked($record, $request->user()->id_usuario);
            $eligible = EstadoContenido::eligible($evaluation);
            abort_unless($eligible->isNotEmpty(), 422, 'No hay preguntas completas y publicadas para iniciar.');
            $selected = $eligible->pluck('id_pregunta')->all();
            if ($record->configuracion['managed'] ?? false) {
                $count = $record->configuracion['question_count'] ?? 10;
                abort_unless($eligible->count() >= $count, 422, 'No hay suficientes preguntas publicadas y validadas.');
                $selected = ($record->configuracion['fixed_order'] ?? false) ? $eligible->take($count)->pluck('id_pregunta')->all() : $eligible->shuffle()->take($count)->pluck('id_pregunta')->all();
            }

            return IntentoEvaluacion::create(['preguntas_seleccionadas' => $selected] + ['id_usuario' => $request->user()->id_usuario, 'id_evaluacion' => $evaluation,
                'numero_intento' => 1 + (int) IntentoEvaluacion::where('id_usuario', $request->user()->id_usuario)->where('id_evaluacion', $evaluation)->max('numero_intento')]);
        });

        return response()->json(DominioLecciones::present($attempt));
    }

    public function submit(Request $request, int $evaluation): JsonResponse
    {
        $record = EvaluacionKichwa::findOrFail($evaluation);
        $data = $request->validate(['attempt_id' => ['required', 'integer', 'min:1'],
            'answers' => ['required', 'array', 'min:1', 'max:200'],
            'answers.*' => ['array:question_id,answer'],
            'answers.*.question_id' => ['required', 'integer', 'distinct'],
            'answers.*.answer' => ['required', 'array']]);
        $results = DB::transaction(function () use ($request, $evaluation, $data, $record): array {
            Usuario::whereKey($request->user()->id_usuario)->lockForUpdate()->firstOrFail();
            $attempt = IntentoEvaluacion::where('id_usuario', $request->user()->id_usuario)->where('id_evaluacion', $evaluation)->lockForUpdate()->findOrFail($data['attempt_id']);
            if ($attempt->estado_intento === 'finalizado' && $attempt->resultado !== null && ($record->configuracion['managed'] ?? false)) {
                return $attempt->resultado;
            }
            abort_unless($attempt->estado_intento === 'en_curso', 409, 'Este intento ya finalizó.');
            $questions = DominioLecciones::selected($attempt)->keyBy('id_pregunta');
            $submitted = collect($data['answers'])->keyBy('question_id');
            if ($questions->isEmpty() || $submitted->count() !== $questions->count() || $submitted->keys()->diff($questions->keys())->isNotEmpty()) {
                throw ValidationException::withMessages(['answers' => 'Responde una vez cada pregunta de esta evaluación.']);
            }
            $results = [];
            foreach ($questions as $id => $question) {
                $answer = $submitted[$id]['answer'];
                $correct = ContratoEjercicio::grade(KichwaResource::present('questions', $question, true), $answer);
                RespuestaEvaluacion::updateOrCreate(['id_intento' => $attempt->id_intento, 'id_pregunta' => $id],
                    ['id_evaluacion' => $evaluation, 'respuesta_evaluacion' => $answer,
                        'puntaje_respuesta_evaluacion' => $correct ? $question->puntaje_pregunta : 0]);
                $results[] = ['question_id' => $id, 'is_correct' => $correct,
                    'feedback' => ContratoEjercicio::feedback(KichwaResource::present('questions', $question, true), $correct)];
            }
            $maximum = (float) $questions->sum('puntaje_pregunta');
            $obtained = (float) RespuestaEvaluacion::where('id_intento', $attempt->id_intento)->sum('puntaje_respuesta_evaluacion');
            $score = round(100 * $obtained / $maximum, 2);
            $rewards = DominioLecciones::reward($attempt, EvaluacionKichwa::findOrFail($evaluation), $results, $score);
            $passed = ($record->configuracion['sequence_mode'] ?? false) ? count(array_filter($results, fn ($r) => $r['is_correct'])) >= ($record->configuracion['required_correct'] ?? 5) : $score >= ($record->configuracion['pass_percentage'] ?? 80);
            $attempt->resultado = ['passed' => $passed] + $rewards + ['attempt_id' => $attempt->id_intento, 'score' => $score, 'puntaje_obtenido' => $obtained, 'puntaje_maximo' => $maximum, 'correct_count' => count(array_filter($results, fn ($r) => $r['is_correct'])), 'total_questions' => count($results), 'results' => $results];
            $attempt->estado_intento = 'finalizado';
            $attempt->fecha_fin_intento = now();
            $attempt->save();

            return $attempt->resultado;
        });

        return response()->json($results);
    }

    public function resume(Request $request, int $attempt): JsonResponse
    {
        return response()->json(DominioLecciones::present(IntentoEvaluacion::where('id_usuario', $request->user()->id_usuario)->findOrFail($attempt)));
    }

    public function draft(Request $request, int $attempt): JsonResponse
    {
        $data = $request->validate(['answers' => ['present', 'array', 'max:100'], 'answers.*' => ['array']]);
        $record = DB::transaction(function () use ($request, $attempt, $data) {
            $record = IntentoEvaluacion::where('id_usuario', $request->user()->id_usuario)->lockForUpdate()->findOrFail($attempt);
            abort_unless($record->estado_intento === 'en_curso', 409, 'Este intento ya está cerrado.');
            $questions = DominioLecciones::selected($record)->keyBy('id_pregunta');
            $ids = $questions->keys()->all();
            foreach (array_keys($data['answers']) as $id) {
                abort_unless(in_array((int) $id, $ids, true), 422, 'Pregunta ajena al intento.');
            }
            foreach ($data['answers'] as $id => $answer) {
                ContratoEjercicio::validateDraft(KichwaResource::present('questions', $questions[$id], true), $answer);
            }
            abort_if(strlen(json_encode($data['answers'])) > 100000, 422, 'Respuestas demasiado extensas.');
            $record->respuestas_borrador = $data['answers'];
            $record->save();

            return $record;
        });

        return response()->json(['saved' => true]);
    }

    public function abandon(Request $request, int $attempt): JsonResponse
    {
        DB::transaction(function () use ($request, $attempt): void {
            $record = IntentoEvaluacion::where('id_usuario', $request->user()->id_usuario)->lockForUpdate()->findOrFail($attempt);
            abort_unless($record->estado_intento === 'en_curso', 409, 'Este intento ya está cerrado.');
            $record->estado_intento = 'abandonado';
            $record->fecha_fin_intento = now();
            $record->save();
        });

        return response()->json(null, 204);
    }
}
