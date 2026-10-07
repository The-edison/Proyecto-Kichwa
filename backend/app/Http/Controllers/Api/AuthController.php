<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Models\Nivel;
use App\Models\Usuario;
use App\Models\UsuarioNivel;
use App\Services\AutenticacionPestana;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        if ($request->hasSession()) {
            AutenticacionPestana::key($request);
        }
        $data = $request->validated();
        $user = DB::transaction(function () use ($data) {
            $user = Usuario::create(['nombre_usuario' => $data['name'], 'correo_usuario' => $data['email'],
                'cedula_usuario' => $data['cedula'] ?? null, 'contrasena_usuario' => $data['password']]);
            $nivel = Nivel::where('orden_nivel', 1)->firstOrFail();
            UsuarioNivel::create(['id_usuario' => $user->id_usuario, 'id_nivel' => $nivel->id_nivel]);

            return $user->refresh();
        });
        event(new Registered($user));

        return $this->authenticate($request, $user, 201);
    }

    public function login(Request $request): JsonResponse
    {
        if ($request->hasSession()) {
            AutenticacionPestana::key($request);
        }
        $data = $request->validate(['identifier' => ['required', 'string', 'max:254'], 'password' => ['required', 'string', 'max:1024']]);
        $identifier = mb_strtolower(trim($data['identifier']));
        $key = 'login:'.hash('sha256', $identifier.'|'.$request->ip());
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json(['message' => 'Demasiados intentos. Espera unos minutos.'], 429);
        }
        $user = Usuario::where('correo_usuario', $identifier)->first();
        if (! $user || $user->estado_usuario !== 'activo' || ! $user->contrasena_usuario || ! Hash::check($data['password'], $user->contrasena_usuario)) {
            RateLimiter::hit($key, 300);
            throw ValidationException::withMessages(['identifier' => 'Correo o contraseña incorrectos, o cuenta bloqueada.']);
        }
        RateLimiter::clear($key);

        return $this->authenticate($request, $user);
    }

    private function authenticate(Request $request, Usuario $user, int $status = 200): JsonResponse
    {
        if ($request->hasSession()) {
            Auth::guard('web')->login($user);
            $request->session()->regenerate();
            AutenticacionPestana::bind($request, $user);

            return response()->json(['user' => $user->perfil()], $status);
        }

        return response()->json(['user' => $user->perfil(),
            'token' => $user->createToken('api', ['*'], now()->addDays(7))->plainTextToken], $status);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user()->perfil());
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();
        if ($request->hasSession()) {
            AutenticacionPestana::revoke($request);
            Auth::guard('web')->logout();
            $request->session()->regenerate();
            $request->session()->regenerateToken();
        }

        return response()->json(null, 204);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate(['current_password' => ['required', 'string'], 'password' => ['required', 'confirmed', RegisterRequest::passwordRule()]]);
        $user = $request->user();
        if (! Hash::check($data['current_password'], (string) $user->contrasena_usuario)) {
            throw ValidationException::withMessages(['current_password' => 'La contraseña actual es incorrecta.']);
        }
        if (Hash::check($data['password'], (string) $user->contrasena_usuario)) {
            throw ValidationException::withMessages(['password' => 'Elige una contraseña distinta de la inicial.']);
        }
        $user->contrasena_usuario = $data['password'];
        $user->debe_cambiar_contrasena = false;
        $user->remember_token = null;
        $user->save();
        $user->tokens()->delete();
        DB::table('sessions')->where('user_id', $user->id_usuario)->delete();
        if ($request->hasSession()) {
            $sessions = array_filter(AutenticacionPestana::sessions($request), fn (array $session): bool => $session['user_id'] !== $user->id_usuario);
            $request->session()->put('tab_sessions', $sessions);
            AutenticacionPestana::bind($request, $user);
            $request->session()->regenerate();
        }

        return response()->json(['user' => $user->perfil()]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->merge(['email' => mb_strtolower(trim((string) $request->input('email')))]);
        $data = $request->validate(['email' => ['required', 'email:rfc', 'max:254']]);
        Password::sendResetLink(['correo_usuario' => $data['email']]);

        return response()->json(['message' => 'Si el correo está registrado, recibirás un enlace para recuperar tu contraseña.']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->merge(['email' => mb_strtolower(trim((string) $request->input('email')))]);
        $data = $request->validate(['email' => ['required', 'email:rfc'], 'token' => ['required', 'string'],
            'password' => ['required', 'confirmed', RegisterRequest::passwordRule()]]);
        $status = Password::reset(['correo_usuario' => $data['email'], 'token' => $data['token'],
            'password' => $data['password'], 'password_confirmation' => $request->input('password_confirmation')],
            function (Usuario $user, string $password): void {
                $user->contrasena_usuario = $password;
                $user->debe_cambiar_contrasena = false;
                $user->remember_token = null;
                $user->save();
                $user->tokens()->delete();
                DB::table('sessions')->where('user_id', $user->id_usuario)->delete();
                event(new PasswordReset($user));
            });
        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => 'El enlace es inválido o venció. Solicita uno nuevo.']);
        }

        return response()->json(['message' => 'Contraseña actualizada. Inicia sesión.']);
    }

    public function resendVerification(Request $request): JsonResponse
    {
        if (! $request->user()->hasVerifiedEmail()) {
            $request->user()->sendEmailVerificationNotification();
        }

        return response()->json(['message' => 'Revisa tu correo para verificar tu cuenta.']);
    }
}
