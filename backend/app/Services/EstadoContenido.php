<?php

namespace App\Services;

use App\Models\EvaluacionKichwa;
use App\Models\Pregunta;
use App\Models\Tema;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class EstadoContenido
{
    public static function sources(EvaluacionKichwa $final): Collection
    {
        return EvaluacionKichwa::where('id_unidad', $final->id_unidad)->where('publicado', true)->where('id_tema', '<>', $final->id_tema)
            ->where('configuracion->managed', true)->whereRaw("COALESCE((configuracion->>'final')::boolean,false) = false")
            ->whereIn('id_tema', Tema::where('publicado', true)->select('id_tema'))
            ->whereRaw('id_evaluacion = (SELECT max(v.id_evaluacion) FROM evaluaciones v WHERE v.id_tema=evaluaciones.id_tema AND v.publicado)')->orderBy('id_evaluacion')->get();
    }

    public static function errors(array $exercise): array
    {
        $errors = [];
        try {
            ContratoEjercicio::validate($exercise);
        } catch (ValidationException $exception) {
            $errors = array_merge(...array_values($exception->errors()));
        }

        return array_values(array_unique(array_merge($errors, self::requirements($exercise))));
    }

    private static function requirements(array $exercise): array
    {
        $errors = [];
        $config = $exercise['config'] ?? [];
        if (($config['managed'] ?? false) && ! ($config['reviewed'] ?? false)) {
            $errors[] = 'Pendiente de validación lingüística docente.';
        }
        if (($config['requires_audio'] ?? false) && empty($exercise['resource'])) {
            $errors[] = 'Pendiente de audio obligatorio.';
        }
        if (($config['requires_images'] ?? false) && (empty($exercise['elements']) || collect($exercise['elements'])->contains(fn ($element) => empty($element['imagen'])))) {
            $errors[] = 'Pendiente de imágenes para las opciones.';
        }

        return array_values(array_unique($errors));
    }

    public static function assertReady(array $exercise): void
    {
        ContratoEjercicio::validate($exercise);
        $errors = self::requirements($exercise);
        if ($errors !== []) {
            throw ValidationException::withMessages(['publication' => $errors]);
        }
    }

    public static function eligible(int $evaluation): Collection
    {
        $questions = Pregunta::where('id_evaluacion', $evaluation)->where('publicado', true)->orderBy('orden_pregunta')->get()
            ->filter(fn ($question) => self::errors(KichwaResource::present('questions', $question, true)) === [])
            ->sortByDesc('id_pregunta')->unique(fn ($question) => $question->origen_reactivo ?? (string) $question->id_pregunta)->sortBy('orden_pregunta')->values();
        $record = EvaluacionKichwa::findOrFail($evaluation);
        if ($record->tipo_evaluacion === 'modulo' || ($record->configuracion['sequence_mode'] ?? false) || ! ($record->configuracion['final'] ?? false)) {
            return $questions;
        }
        $sources = self::sources($record);
        $sourceQuestions = $sources->flatMap(fn ($source) => self::eligible($source->id_evaluacion))
            ->keyBy(fn ($q) => $q->origen_reactivo ?? (string) $q->id_pregunta);

        return $questions->filter(function ($question) use ($sourceQuestions): bool {
            $source = $sourceQuestions[$question->origen_reactivo] ?? null;
            if (! $source) {
                return false;
            }
            foreach (['tipo_pregunta', 'enunciado_pregunta', 'elementos_pregunta', 'zonas_pregunta', 'recurso_pregunta', 'solucion_pregunta', 'puntaje_pregunta'] as $field) {
                if ($source->$field !== $question->$field) {
                    return false;
                }
            }
            foreach (['max_selections' => 50, 'exact_selections' => false, 'ignore_accents' => false] as $field => $default) {
                if (($source->configuracion[$field] ?? $default) !== ($question->configuracion[$field] ?? $default)) {
                    return false;
                }
            }

            return true;
        });
    }
}
