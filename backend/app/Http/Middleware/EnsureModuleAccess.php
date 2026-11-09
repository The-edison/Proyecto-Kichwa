<?php

namespace App\Http\Middleware;

use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\IntentoEvaluacion;
use App\Models\Unidad;
use App\Services\AccesoModulos;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureModuleAccess
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $module = $request->route('module');
        $unit = $request->route('unit');
        $evaluation = $request->route('evaluation');
        if ($request->route('exercise')) {
            $unit = Actividad::whereKey($request->route('exercise'))->where('publicado', true)->value('id_unidad');
        }
        if ($request->route('attempt')) {
            $evaluation = IntentoEvaluacion::whereKey($request->route('attempt'))
                ->where('id_usuario', $request->user()->id_usuario)->value('id_evaluacion');
        }
        if ($evaluation) {
            $record = EvaluacionKichwa::find($evaluation);
            $module = $record?->id_modulo;
            $unit = $record?->id_unidad;
        }
        if (! $unit && $request->is('api/levels/*/evaluations') && $request->filled('unit_id') && ctype_digit((string) $request->input('unit_id'))) {
            $unit = $request->integer('unit_id');
        }
        if ($unit) {
            $module = Unidad::whereKey($unit)->where('publicado', true)->value('id_modulo');
        }
        if ($module) {
            AccesoModulos::assertUnlocked((int) $module, $request->user()->id_usuario);
        }

        return $next($request);
    }
}
