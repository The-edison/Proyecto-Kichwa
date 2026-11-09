<?php

namespace App\Services;

use App\Models\Modulo;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Collection;

class AccesoModulos
{
    public static function forUser(int $user): Collection
    {
        $report = DominioLecciones::progress($user)['learning_report'];

        return collect($report['levels'])->flatMap(fn (array $level) => $level['modules'])
            ->mapWithKeys(fn (array $module): array => [$module['id'] => [
                'unlocked' => $module['unlocked'], 'lock' => $module['lock'], 'completed' => $module['completed'],
            ]]);
    }

    public static function assertUnlocked(int $module, int $user): void
    {
        $first = Modulo::join('niveles', 'niveles.id_nivel', '=', 'modulos.id_nivel')
            ->where('niveles.publicado', true)->where('modulos.publicado', true)
            ->orderBy('niveles.orden_nivel')->orderBy('niveles.id_nivel')->orderBy('modulos.orden_modulo')->orderBy('modulos.id_modulo')
            ->value('modulos.id_modulo');
        if ($first !== null && (int) $first === $module) {
            return;
        }
        $access = self::forUser($user)->get($module);
        if ($access !== null && ! $access['unlocked']) {
            throw new HttpResponseException(response()->json([
                'code' => 'module_locked', 'message' => $access['lock']['message'], 'module_lock' => $access['lock'],
            ], 403));
        }
    }
}
