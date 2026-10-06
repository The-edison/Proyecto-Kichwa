<?php

namespace App\Services;

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

    public static function unitIds(int $level): Builder
    {
        return DB::table('unidades')->join('modulos', 'modulos.id_modulo', '=', 'unidades.id_modulo')
            ->where('modulos.id_nivel', $level)->where('modulos.publicado', true)->where('unidades.publicado', true)->select('unidades.id_unidad');
    }
}
