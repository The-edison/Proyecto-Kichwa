<?php

use App\Http\Middleware\CabecerasSeguridad;
use App\Http\Middleware\CompressJsonResponse;
use App\Http\Middleware\CuentaActiva;
use App\Http\Middleware\RequireRole;
use App\Services\ErroresIntegridad;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias(['role' => RequireRole::class, 'active' => CuentaActiva::class]);
        $middleware->statefulApi();
        $middleware->append(CabecerasSeguridad::class);
        $middleware->append(CompressJsonResponse::class);
        $middleware->redirectGuestsTo(fn (): string => rtrim(config('app.frontend_url'), '/').'/iniciar-sesion');
        $middleware->redirectUsersTo(fn (Request $request): string => rtrim(config('app.frontend_url'), '/').($request->user()?->rol_usuario === 'administrador' ? '/admin' : '/aprender'));
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (QueryException $exception, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }
            $state = $exception->errorInfo[0] ?? '';
            if ($state === '23505') {
                return ErroresIntegridad::response($exception);
            }
            if (in_array($state, ['23001', '23503', '23514'], true)) {
                return response()->json(['message' => 'Este cambio está bloqueado por contenido relacionado o respuestas históricas. Conserva el registro y crea una nueva versión.'], 409);
            }

            return null;
        });
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
