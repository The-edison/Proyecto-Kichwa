<?php

namespace App\Services;

use App\Models\Actividad;
use App\Models\Unidad;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class PublicacionContenido
{
    public static function remember(string $key, callable $load): mixed
    {
        $version = Cache::get('kichwa:catalog-version', 'initial');

        return Cache::remember('kichwa:catalog:'.$version.':'.$key, 300, $load);
    }

    public static function invalidate(): void
    {
        Cache::forever('kichwa:catalog-version', bin2hex(random_bytes(12)));
    }

    public static function unitIds(?int $level = null): Builder
    {
        return DB::table('unidades')->join('modulos', 'modulos.id_modulo', '=', 'unidades.id_modulo')
            ->join('niveles', 'niveles.id_nivel', '=', 'modulos.id_nivel')->where('niveles.publicado', true)
            ->when($level !== null, fn ($query) => $query->where('modulos.id_nivel', $level))
            ->where('modulos.publicado', true)->where('unidades.publicado', true)->select('unidades.id_unidad');
    }

    public static function exercises(?int $unit = null): EloquentBuilder
    {
        $units = Unidad::whereIn('id_unidad', self::unitIds())->when($unit !== null, fn ($query) => $query->whereKey($unit))->get(['id_unidad', 'configuracion']);
        $classic = [];
        $guided = [];
        $sequence = [];
        foreach ($units as $record) {
            $mode = $record->configuracion['learning_mode'] ?? 'classic';
            if ($mode === 'guided') {
                $guided[] = $record->id_unidad;
            } elseif ($mode === 'sequence') {
                $evaluation = SecuenciaUnidad::evaluation($record->id_unidad);
                if ($evaluation) {
                    $sequence = array_merge($sequence, SecuenciaUnidad::practices($evaluation)->pluck('id_actividad')->all());
                }
            } else {
                $classic[] = $record->id_unidad;
            }
        }

        return Actividad::where('publicado', true)
            ->where(fn ($query) => $query->whereNull('id_tema')->orWhereIn('id_tema', DB::table('temas')->where('publicado', true)->select('id_tema')))
            ->where(fn ($query) => $query->whereIn('id_unidad', $classic)
                ->orWhere(fn ($query) => $query->whereIn('id_unidad', $guided)->whereNull('id_tema'))
                ->orWhereIn('id_actividad', $sequence))
            ->whereRaw('id_actividad = (SELECT max(a2.id_actividad) FROM actividades a2 WHERE a2.id_unidad=actividades.id_unidad AND a2.publicado AND COALESCE(a2.origen_reactivo,a2.id_actividad::text)=COALESCE(actividades.origen_reactivo,actividades.id_actividad::text) AND (a2.id_tema IS NULL OR EXISTS(SELECT 1 FROM temas t2 WHERE t2.id_tema=a2.id_tema AND t2.publicado)))');
    }
}
