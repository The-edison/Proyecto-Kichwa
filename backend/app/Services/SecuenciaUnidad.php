<?php

namespace App\Services;

use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\IntentoEvaluacion;
use App\Models\Unidad;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SecuenciaUnidad
{
    public static function evaluation(int $unit): ?EvaluacionKichwa
    {
        return EvaluacionKichwa::where('id_unidad', $unit)->where('configuracion->sequence_mode', true)
            ->orderByDesc('publicado')->orderByDesc('id_evaluacion')->first();
    }

    public static function practices(EvaluacionKichwa $evaluation): Collection
    {
        $ids = $evaluation->configuracion['prerequisite_activities'] ?? [];
        $references = Actividad::where('id_unidad', $evaluation->id_unidad)->whereIn('id_actividad', $ids)->get()->keyBy('id_actividad');
        $published = Actividad::where('id_unidad', $evaluation->id_unidad)->where('publicado', true)
            ->where(fn ($query) => $query->whereNull('id_tema')->orWhereIn('id_tema', DB::table('temas')->where('publicado', true)->select('id_tema')))
            ->orderByDesc('id_actividad')->get()->unique(fn ($record) => self::origin($record))->keyBy(fn ($record) => self::origin($record));

        return collect($ids)->map(fn ($id) => isset($references[$id]) ? ($published[self::origin($references[$id])] ?? null) : null)->filter()->values();
    }

    public static function origin(Actividad $exercise): string
    {
        return $exercise->origen_reactivo ?? (string) $exercise->id_actividad;
    }

    public static function completed(EvaluacionKichwa $evaluation, int $user): Collection
    {
        $origins = self::practices($evaluation)->map(fn ($record) => self::origin($record));

        return DB::table('respuestas_actividad as r')->join('actividades as a', 'a.id_actividad', '=', 'r.id_actividad')
            ->where('a.id_unidad', $evaluation->id_unidad)->where('r.id_usuario', $user)->where('r.acierto_actividad', true)
            ->whereIn(DB::raw('COALESCE(a.origen_reactivo,a.id_actividad::text)'), $origins)
            ->selectRaw('DISTINCT COALESCE(a.origen_reactivo,a.id_actividad::text) as origin')->get()->pluck('origin');
    }

    public static function assertReady(EvaluacionKichwa $evaluation): void
    {
        $config = $evaluation->configuracion;
        $practices = self::practices($evaluation);
        $errors = [];
        if (($config['question_count'] ?? 0) !== 6 || ($config['required_correct'] ?? 0) !== 5 || ! ($config['fixed_order'] ?? false) || ! ($config['final'] ?? false)) {
            $errors[] = 'La prueba de secuencia requiere seis preguntas, cinco aciertos y orden fijo.';
        }
        if (count(array_unique($config['prerequisite_activities'] ?? [])) !== 7 || $practices->count() !== 7 || $practices->unique(fn ($record) => self::origin($record))->count() !== 7) {
            $errors[] = 'Selecciona siete actividades distintas, publicadas y de la misma unidad.';
        }
        foreach ($practices as $practice) {
            $errors = array_merge($errors, EstadoContenido::errors(KichwaResource::present('exercises', $practice, true)));
        }
        $questions = EstadoContenido::eligible($evaluation->id_evaluacion);
        if ($questions->count() !== 6 || $questions->contains(fn ($question) => (float) $question->puntaje_pregunta !== 1.0)) {
            $errors[] = 'Publica exactamente seis preguntas completas y revisadas, de un punto cada una.';
        }
        if ($errors !== []) {
            throw ValidationException::withMessages(['publication' => array_values(array_unique($errors))]);
        }
    }

    public static function assertUnlocked(EvaluacionKichwa $evaluation, int $user): void
    {
        self::assertReady($evaluation);
        abort_unless(self::completed($evaluation, $user)->count() === 7, 403, 'Acertar las siete actividades desbloquea la Prueba de la Unidad 1.');
    }

    public static function present(Unidad $unit, int $user): array
    {
        $evaluation = self::evaluation($unit->id_unidad);
        if (! $evaluation) {
            return ['exercises' => [], 'completed_count' => 0, 'total' => 7, 'unlocked' => false, 'evaluation_id' => null, 'result' => null];
        }
        $completed = self::completed($evaluation, $user);
        $practices = self::practices($evaluation);
        $ready = true;
        try {
            self::assertReady($evaluation);
        } catch (ValidationException) {
            $ready = false;
        }
        $attempts = IntentoEvaluacion::where('id_usuario', $user)->whereIn('id_evaluacion', EvaluacionKichwa::where('id_unidad', $unit->id_unidad)->where('configuracion->sequence_mode', true)->select('id_evaluacion'))
            ->where('estado_intento', 'finalizado');
        $stats = (clone $attempts)->selectRaw("(array_agg((resultado->>'score')::numeric ORDER BY id_intento))[1] AS first_score, max((resultado->>'score')::numeric) AS best_score, bool_or(COALESCE((resultado->>'passed')::boolean,false)) AS passed")->first();
        $latest = (clone $attempts)->orderByDesc('id_intento')->first(['resultado']);

        return ['exercises' => $practices->map(fn ($record) => KichwaResource::present('exercises', $record) + ['completed' => $completed->contains(self::origin($record))])->values(),
            'completed_count' => $completed->count(), 'total' => 7, 'unlocked' => $evaluation->publicado && $ready && $completed->count() === 7,
            'evaluation_id' => $evaluation->publicado && $ready ? $evaluation->id_evaluacion : null, 'result' => $latest?->resultado,
            'first_score' => $stats->first_score === null ? null : (float) $stats->first_score, 'best_score' => $stats->best_score === null ? null : (float) $stats->best_score, 'passed' => (bool) $stats->passed];
    }
}
