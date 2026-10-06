<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireRole
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $expected = $role === 'admin' ? 'administrador' : 'estudiante';
        abort_unless($request->user()?->rol_usuario === $expected, 403, 'No tienes permiso para esta acción.');

        return $next($request);
    }
}
