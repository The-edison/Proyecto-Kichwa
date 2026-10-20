<?php

namespace App\Services;

use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\IntentoEvaluacion;
use App\Models\Pregunta;
use App\Models\RespuestaActividad;
use App\Models\RespuestaEvaluacion;
use App\Models\Tema;
use App\Models\Unidad;
use App\Models\VistaIntento;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DominioLecciones
{
    public static function rewardActivity(Actividad $exercise, RespuestaActividad $answer): array
    {
        $earned = 0;
        if ($answer->acierto_actividad) {
            $key = 'actividad:'.($exercise->origen_reactivo ?? $exercise->id_actividad);
            if (str_starts_with($exercise->origen_reactivo ?? '', 'practice:')) {
                $source = substr($exercise->origen_reactivo, 9);
                if (Pregunta::where('origen_reactivo', $source)->exists()) {
                    $key = 'reactivo:'.$source;
                }
            }
            if ($answer->id_sesion_practica !== null) {
                $key = 'practica:'.$answer->id_sesion_practica.':'.hash('sha256', $key);
            }
            $earned = DB::table('recompensas')->insertOrIgnore(['id_usuario' => $answer->id_usuario, 'id_respuesta_actividad' => $answer->id_respuesta_actividad,
                'clave' => $key, 'xp' => 10]) * 10;
        }

        return ['xp_earned' => $earned, 'xp_total' => (int) DB::table('recompensas')->where('id_usuario', $answer->id_usuario)->sum('xp'),
            'xp_attempt' => $answer->id_sesion_practica === null ? $earned : self::practiceXp($answer->id_usuario, $exercise->id_unidad, $answer->id_sesion_practica)];
    }

    public static function practiceXp(int $user, int $unit, string $session): int
    {
        return (int) DB::table('recompensas as r')->join('respuestas_actividad as a', 'a.id_respuesta_actividad', '=', 'r.id_respuesta_actividad')
            ->join('actividades as e', 'e.id_actividad', '=', 'a.id_actividad')->where('r.id_usuario', $user)->where('a.id_sesion_practica', $session)
            ->where('e.id_unidad', $unit)->sum('r.xp');
    }

    public static function prerequisites(EvaluacionKichwa $evaluation): Collection
    {
        return EvaluacionKichwa::where('id_unidad', $evaluation->id_unidad)->where('id_tema', '<>', $evaluation->id_tema)
            ->where('configuracion->managed', true)->whereRaw("COALESCE((configuracion->>'final')::boolean,false) = false")->distinct()->pluck('id_tema');
    }

    public static function assertUnlocked(EvaluacionKichwa $evaluation, int $user): void
    {
        if ($evaluation->tipo_evaluacion === 'modulo') {
            EvaluacionModulo::assertUnlocked($evaluation, $user);

            return;
        }
        if ($evaluation->configuracion['sequence_mode'] ?? false) {
            SecuenciaUnidad::assertUnlocked($evaluation, $user);

            return;
        }
        if (! ($evaluation->configuracion['final'] ?? false)) {
            return;
        }
        $topics = self::prerequisites($evaluation);
        abort_unless($topics->isNotEmpty() && DB::table('recompensas')->where('id_usuario', $user)->whereIn('clave', $topics->map(fn ($id) => 'dominio:'.$id))->count() === $topics->count(), 403, 'Domina primero las lecciones anteriores con al menos 80 %.');
    }

    public static function selected(IntentoEvaluacion $attempt): Collection
    {
        $questions = Pregunta::where('id_evaluacion', $attempt->id_evaluacion)->orderBy('orden_pregunta')->get();
        if ($attempt->preguntas_seleccionadas !== null) {
            $byId = $questions->keyBy('id_pregunta');

            return collect($attempt->preguntas_seleccionadas)->map(fn ($id) => $byId[$id]);
        }

        return $questions;
    }

    public static function present(IntentoEvaluacion $attempt): array
    {
        $questions = self::selected($attempt);
        $answers = $attempt->estado_intento === 'finalizado' ? RespuestaEvaluacion::where('id_intento', $attempt->id_intento)->pluck('respuesta_evaluacion', 'id_pregunta')->all() : ($attempt->respuestas_borrador ?? []);
        $confirmed = [];
        $evaluation = EvaluacionKichwa::findOrFail($attempt->id_evaluacion);
        if (($evaluation->configuracion['managed'] ?? false) && ! ($evaluation->configuracion['final'] ?? false)) {
            foreach ($questions as $question) {
                if ($question->tipo_pregunta !== 'relacionar') {
                    continue;
                }
                $pairs = $answers[$question->id_pregunta]['pares'] ?? [];
                $confirmed[$question->id_pregunta] = collect($pairs)->filter(fn ($pair) => in_array($pair, $question->solucion_pregunta['pares'], true))->pluck('origen')->values()->all();
            }
        }

        return ['attempt_id' => $attempt->id_intento, 'numero_intento' => $attempt->numero_intento,
            'state' => $attempt->estado_intento, 'answers' => (object) $answers, 'confirmed_pairs' => (object) $confirmed, 'result' => self::result($attempt),
            'questions' => $questions->map(fn ($q) => KichwaResource::present('questions', $q))->values()];
    }

    public static function result(IntentoEvaluacion $attempt): ?array
    {
        if ($attempt->resultado !== null) {
            return $attempt->resultado;
        }
        if ($attempt->estado_intento !== 'finalizado') {
            return null;
        }
        $view = VistaIntento::findOrFail($attempt->id_intento);
        $questions = self::selected($attempt)->keyBy('id_pregunta');
        $results = RespuestaEvaluacion::where('id_intento', $attempt->id_intento)->orderBy('id_pregunta')->get()->map(fn ($answer) => [
            'question_id' => $answer->id_pregunta, 'is_correct' => (float) $answer->puntaje_respuesta_evaluacion === (float) $questions[$answer->id_pregunta]->puntaje_pregunta,
            'feedback' => 'Puntaje histórico registrado: '.$answer->puntaje_respuesta_evaluacion.'.']);

        return ['attempt_id' => $attempt->id_intento, 'score' => (float) $view->porcentaje_calificacion, 'puntaje_obtenido' => (float) $view->puntaje_obtenido,
            'puntaje_maximo' => (float) $view->puntaje_maximo_evaluacion, 'correct_count' => $results->where('is_correct', true)->count(), 'total_questions' => $questions->count(), 'results' => $results->all(),
            'xp_earned' => 0, 'xp_total' => (int) DB::table('recompensas')->where('id_usuario', $attempt->id_usuario)->sum('xp'), 'stars' => 0];
    }

    public static function reward(IntentoEvaluacion $attempt, EvaluacionKichwa $evaluation, array $results, float $score): array
    {
        $before = (int) DB::table('recompensas')->where('id_usuario', $attempt->id_usuario)->sum('xp');
        $grant = function (string $key, int $xp, ?string $medal = null) use ($attempt): void {
            DB::table('recompensas')->insertOrIgnore(['id_usuario' => $attempt->id_usuario, 'id_intento' => $attempt->id_intento, 'clave' => $key, 'xp' => $xp, 'medalla' => $medal]);
        };
        foreach ($results as $result) {
            if ($result['is_correct']) {
                $grant('intento:'.$attempt->id_intento.':pregunta:'.$result['question_id'], 10);
            }
        }
        if ($evaluation->tipo_evaluacion === 'modulo' && $score >= ($evaluation->configuracion['pass_percentage'] ?? 80)) {
            $grant('modulo:'.$evaluation->id_modulo, 50, 'Primeros contactos con el kichwa');
        }
        if ($evaluation->id_tema !== null && ($evaluation->configuracion['managed'] ?? false)) {
            if (($evaluation->configuracion['sequence_mode'] ?? false) ? count(array_filter($results, fn ($result) => $result['is_correct'])) >= ($evaluation->configuracion['required_correct'] ?? 5) : $score >= ($evaluation->configuracion['pass_percentage'] ?? 80)) {
                if ($evaluation->configuracion['final'] ?? false) {
                    $grant('final:'.$evaluation->id_unidad, 0, 'Mis primeras palabras en Kichwa');
                    $grant('intento:'.$attempt->id_intento.':final:'.$evaluation->id_unidad, 50);
                } else {
                    $grant('dominio:'.$evaluation->id_tema, 0);
                    $grant('intento:'.$attempt->id_intento.':dominio:'.$evaluation->id_tema, 20);
                }
            }
        }
        $after = (int) DB::table('recompensas')->where('id_usuario', $attempt->id_usuario)->sum('xp');

        return ['xp_earned' => $after - $before, 'xp_total' => $after, 'stars' => $score >= 100 ? 3 : ($score >= 90 ? 2 : ($score >= 80 ? 1 : 0))];
    }

    public static function progress(int $user, ?int $unit = null): array
    {
        $query = DB::table('intentos_evaluacion as i')->join('evaluaciones as e', 'e.id_evaluacion', '=', 'i.id_evaluacion')->join('temas as t', 't.id_tema', '=', 'e.id_tema')->where('i.id_usuario', $user)->whereNotNull('e.id_tema');
        if ($unit !== null) {
            $query->where('e.id_unidad', $unit);
        }
        $lessons = $query->select('e.id_tema', 'e.id_unidad', 't.titulo_tema')->selectRaw("count(*) AS attempt_count, COALESCE(max((i.resultado->>'score')::numeric) FILTER (WHERE i.estado_intento='finalizado'),0) AS best_score, (array_agg((i.resultado->>'score')::numeric ORDER BY i.id_intento DESC) FILTER (WHERE i.estado_intento='finalizado'))[1] AS latest_score")
            ->groupBy('e.id_tema', 'e.id_unidad', 't.titulo_tema')->orderBy('e.id_tema')->get()->map(function ($row): array {
                $best = (float) $row->best_score;

                return ['topic_id' => (int) $row->id_tema, 'unit_id' => (int) $row->id_unidad, 'name' => $row->titulo_tema, 'attempt_count' => (int) $row->attempt_count, 'best_score' => $best, 'latest_score' => $row->latest_score === null ? null : (float) $row->latest_score, 'stars' => $best >= 100 ? 3 : ($best >= 90 ? 2 : ($best >= 80 ? 1 : 0))];
            });
        $xp = (int) DB::table('recompensas')->where('id_usuario', $user)->sum('xp');
        $rewards = DB::table('recompensas')->where('id_usuario', $user)
            ->where(fn ($query) => $query->where('clave', 'like', 'dominio:%')->orWhere('clave', 'like', 'final:%')->orWhereNotNull('medalla'))
            ->get(['clave', 'medalla']);
        $sequenceUnits = Unidad::where('configuracion->learning_mode', 'sequence')->pluck('id_unidad');
        $guidedUnits = Unidad::where('configuracion->learning_mode', 'guided')->pluck('id_unidad');
        $completedGuidedUnits = DB::table('v_progreso')->where('id_usuario', $user)->whereIn('id_unidad', $guidedUnits)
            ->where('porcentaje_progreso', 100)->pluck('id_unidad');
        $passedUnits = DB::table('intentos_evaluacion as i')->join('evaluaciones as e', 'e.id_evaluacion', '=', 'i.id_evaluacion')
            ->where('i.id_usuario', $user)->where('i.estado_intento', 'finalizado')->where('e.configuracion->sequence_mode', true)->where('i.resultado->passed', true)->pluck('e.id_unidad');
        $visibleTopics = Tema::where('publicado', true)->pluck('id_tema');
        $lessons = $lessons->filter(fn ($lesson) => $visibleTopics->contains($lesson['topic_id']))->values();

        $completedUnits = $rewards->filter(fn ($r) => str_starts_with($r->clave, 'final:') && ! $guidedUnits->contains((int) substr($r->clave, 6)) && (! $sequenceUnits->contains((int) substr($r->clave, 6)) || $passedUnits->contains((int) substr($r->clave, 6))))->map(fn ($r) => (int) substr($r->clave, 6))->merge($completedGuidedUnits->map(fn ($id) => (int) $id))->unique()->values();
        $report = ProgresoAprendizaje::forUser($user, $completedUnits->all());

        return ['learning_report' => $report, 'lessons' => $lessons, 'xp' => $xp, 'medals' => $rewards->whereNotNull('medalla')->pluck('medalla')->unique()->values(),
            'mastered_topics' => $rewards->filter(fn ($r) => str_starts_with($r->clave, 'dominio:') && $visibleTopics->contains((int) substr($r->clave, 8)))->map(fn ($r) => (int) substr($r->clave, 8))->values(),
            'completed_units' => collect($report['levels'])->flatMap(fn ($level) => $level['modules'])->flatMap(fn ($module) => $module['units'])->where('completed', true)->pluck('id')->values()];
    }
}
