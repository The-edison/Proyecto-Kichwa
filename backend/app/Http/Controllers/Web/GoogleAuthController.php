<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Nivel;
use App\Models\Usuario;
use App\Models\UsuarioNivel;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class GoogleAuthController extends Controller
{
    public function redirect(Request $request): RedirectResponse
    {
        $this->ensureConfigured();
        $request->session()->put('google_auth_intent', 'login');
        $request->session()->forget('google_link_user_id');

        return Socialite::driver('google')->redirect();
    }

    public function link(Request $request): RedirectResponse
    {
        $this->ensureConfigured();
        $request->session()->put('google_auth_intent', 'link');
        $request->session()->put('google_link_user_id', Auth::guard('web')->id());

        return Socialite::driver('google')->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        $intent = $request->session()->pull('google_auth_intent');
        $linkUserId = $request->session()->pull('google_link_user_id');

        if (! $intent || $request->filled('error')) {
            return $this->fail($intent, 'No se completó el acceso con Google. Inténtalo de nuevo.');
        }

        try {
            // Socialite comprueba el parámetro state con la sesión; no usar stateless().
            $googleUser = Socialite::driver('google')->user();
        } catch (Throwable) {
            return $this->fail($intent, 'No se pudo verificar la sesión de Google. Inténtalo de nuevo.');
        }

        $googleId = (string) $googleUser->getId();
        $email = mb_strtolower(trim((string) $googleUser->getEmail()));
        $raw = $googleUser->getRaw();
        $emailVerified = ($raw['email_verified'] ?? $raw['verified_email'] ?? false) === true;

        if ($googleId === '' || strlen($googleId) > 255 || strlen($email) > 254 || ! filter_var($email, FILTER_VALIDATE_EMAIL) || ! $emailVerified) {
            return $this->fail($intent, 'Google no proporcionó un correo verificado.');
        }

        $linked = Usuario::where('google_id', $googleId)->first();

        if ($intent === 'link') {
            $user = Auth::guard('web')->user();
            if (! $user || $user->estado_usuario !== 'activo' || $user->id_usuario !== $linkUserId || mb_strtolower($user->correo_usuario) !== $email || ($linked && $linked->id_usuario !== $user->id_usuario)) {
                return $this->fail('link', 'Usa la misma cuenta de Google que tu correo registrado.');
            }

            $user->google_id = $googleId;
            $user->email_verified_at ??= now();
            $user->save();

            return redirect()->away($this->frontendPath('/cuenta', [
                'google_status' => 'Tu cuenta de Google quedó vinculada.',
            ]));
        }

        if ($intent !== 'login') {
            return $this->fail('login', 'La solicitud de acceso no es válida.');
        }

        if (! $linked) {
            $existing = Usuario::whereRaw('LOWER(correo_usuario) = ?', [$email])->first();
            if ($existing) {
                return $this->fail('login', 'Este correo ya tiene una cuenta. Ingresa con tu contraseña y vincula Google desde Mi cuenta.');
            }

            $linked = new Usuario;
            $linked->nombre_usuario = mb_substr($googleUser->getName() ?: $email, 0, 150);
            $linked->correo_usuario = $email;
            $linked->email_verified_at = now();
            $linked->google_id = $googleId;
            $linked->rol_usuario = 'estudiante';
            $linked->save();
            $linked->refresh();
        }

        if ($linked->estado_usuario !== 'activo') {
            return $this->fail('login', 'Tu cuenta está bloqueada.');
        }
        if ($linked->rol_usuario === 'estudiante') {
            UsuarioNivel::firstOrCreate(['id_usuario' => $linked->id_usuario, 'id_nivel' => Nivel::where('orden_nivel', 1)->firstOrFail()->id_nivel]);
        }
        Auth::guard('web')->login($linked);
        $request->session()->regenerate();

        return redirect()->away($this->frontendPath($linked->rol_usuario === 'administrador' ? '/admin' : '/aprender'));
    }

    private function ensureConfigured(): void
    {
        abort_unless(config('services.google.client_id') && config('services.google.client_secret'), 503, 'El acceso con Google aún no está disponible.');
    }

    private function fail(?string $intent, string $message): RedirectResponse
    {
        return redirect()->away($this->frontendPath($intent === 'link' ? '/cuenta' : '/iniciar-sesion', [
            'google_error' => $message,
        ]));
    }

    /** @param array<string, string> $query */
    private function frontendPath(string $path, array $query = []): string
    {
        $url = rtrim(config('app.frontend_url'), '/').$path;

        return $query ? $url.'?'.http_build_query($query) : $url;
    }
}
