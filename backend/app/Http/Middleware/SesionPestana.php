<?php

namespace App\Http\Middleware;

use App\Models\Usuario;
use App\Services\AutenticacionPestana;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class SesionPestana
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->hasSession() && $request->is('api/*')) {
            $public = $request->is('api/config', 'api/diccionario', 'api/diccionario/*', 'api/media/*')
                || ($request->is('api/testimonials') && $request->isMethod('GET'))
                || $request->is('api/auth/login', 'api/auth/register', 'api/auth/forgot-password', 'api/auth/reset-password', 'api/auth/google/prepare');
            if (! $public) {
                $key = AutenticacionPestana::key($request);
                $sessions = AutenticacionPestana::sessions($request);
                $user = isset($sessions[$key]) ? Usuario::find($sessions[$key]['user_id']) : null;
                abort_unless($user && hash_equals($sessions[$key]['password_hash'] ?? '', AutenticacionPestana::passwordHash($user)), 401, 'Inicia sesión en esta pestaña.');
                Auth::guard('web')->setUser($user);
                Auth::guard('sanctum')->forgetUser();
                AutenticacionPestana::bind($request, $user, $key);
            }
        }

        return $next($request);
    }
}
