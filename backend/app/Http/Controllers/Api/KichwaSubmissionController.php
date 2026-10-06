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
use App\Models\Usuario;
use App\Models\VistaIntento;
use App\Services\ContratoEjercicio;
use App\Services\KichwaResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class KichwaSubmissionController extends Controller
{
    public function activity(Request $request, int $exercise): JsonResponse
    {
        $data = $request->validate(['answer' => ['required', 'array']]);
        $result = DB::transaction(function () use ($request, $exercise, $data): array {
            $record = Actividad::whereKey($exercise)->lockForUpdate()->firstOrFail();
            KichwaCatalogController::publishedUnit($record->id_unidad);
            if ($record->id_tema !== null) {
                abort_unless(Tema::whereKey($record->id_tema)->where('publicado', true)->exists(), 404);
            }
            $correct = ContratoEjercicio::grade(KichwaResource::present('exercises', $record, true), $data['answer']);
            $feedback = $correct ? 'Respuesta correcta. Continúa practicando.' : 'Revisa el tema y vuelve a intentarlo.';
            RespuestaActividad::create([
                'id_usuario' => $request->user()->id_usuario, 'id_actividad' => $exercise,
                'respuesta_actividad' => $data['answer'], 'acierto_actividad' => $correct,
                'retroalimentacion_actividad' => $feedback]);

            return ['is_correct' => $correct, 'feedback' => $feedback];
        });

        return response()->json($result);
    }

    public function start(Request $request, int $evaluation): JsonResponse
    {
        $record = EvaluacionKichwa::findOrFail($evaluation);
        KichwaCatalogController::publishedEvaluation($record);
        abort_unless(Pregunta::where('id_evaluacion', $evaluation)->exists(), 422, 'Añade preguntas antes de iniciar una evaluación.');
        $attempt = DB::transaction(function () use ($request, $evaluation) {
            Usuario::whereKey($request->user()->id_usuario)->lockForUpdate()->firstOrFail();
            $open = IntentoEvaluacion::where('id_usuario', $request->user()->id_usuario)->where('id_evaluacion', $evaluation)->where('estado_intento', 'en_curso')->first();

            return $open ?: IntentoEvaluacion::create(['id_usuario' => $request->user()->id_usuario, 'id_evaluacion' => $evaluation,
                'numero_intento' => 1 + (int) IntentoEvaluacion::where('id_usuario', $request->user()->id_usuario)->where('id_evaluacion', $evaluation)->max('numero_intento')]);
        });

        return response()->json(['attempt_id' => $attempt->id_intento, 'numero_intento' => $attempt->numero_intento, 'state' => 'en_curso']);
    }

    public function submit(Request $request, int $evaluation): JsonResponse
    {
        $record = EvaluacionKichwa::findOrFail($evaluation);
        KichwaCatalogController::publishedEvaluation($record);
        $data = $request->validate(['attempt_id' => ['required', 'integer', 'min:1'],
            'answers' => ['required', 'array', 'min:1', 'max:200'],
            'answers.*' => ['array:question_id,answer'],
            'answers.*.question_id' => ['required', 'integer', 'distinct'],
            'answers.*.answer' => ['required', 'array']]);
        $results = DB::transaction(function () use ($request, $evaluation, $data): array {
            Usuario::whereKey($request->user()->id_usuario)->lockForUpdate()->firstOrFail();
            $attempt = IntentoEvaluacion::where('id_usuario', $request->user()->id_usuario)->where('id_evaluacion', $evaluation)->lockForUpdate()->findOrFail($data['attempt_id']);
            abort_unless($attempt->estado_intento === 'en_curso', 409, 'Este intento ya finalizó.');
            $questions = Pregunta::where('id_evaluacion', $evaluation)->orderBy('orden_pregunta')->get()->keyBy('id_pregunta');
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
                    'feedback' => $correct ? 'Respuesta correcta.' : 'Revisa el tema y vuelve a practicar.'];
            }
            $attempt->estado_intento = 'finalizado';
            $attempt->fecha_fin_intento = now();
            $attempt->save();
            $view = VistaIntento::findOrFail($attempt->id_intento);

            return ['attempt_id' => $attempt->id_intento, 'score' => (float) $view->porcentaje_calificacion,
                'puntaje_obtenido' => (float) $view->puntaje_obtenido, 'puntaje_maximo' => (float) $view->puntaje_maximo_evaluacion,
                'correct_count' => count(array_filter($results, fn ($r) => $r['is_correct'])),
                'total_questions' => count($results), 'results' => $results];
        });

        return response()->json($results);
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
