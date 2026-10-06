<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CuentaActiva
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user && $user->estado_usuario !== 'activo') {
            $user->tokens()->delete();
            if ($request->hasSession()) {
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }
            abort(401, 'Tu cuenta está bloqueada.');
        }
        if ($user?->debe_cambiar_contrasena && ! $request->is('api/auth/me', 'api/auth/logout', 'api/auth/change-password')) {
            abort(403, 'Debes cambiar la contraseña inicial desde Mi cuenta.');
        }

        return $next($request);
    }
}
