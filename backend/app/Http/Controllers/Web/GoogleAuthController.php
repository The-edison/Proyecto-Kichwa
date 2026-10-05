<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
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

        if ($googleId === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL) || ! $emailVerified) {
            return $this->fail($intent, 'Google no proporcionó un correo verificado.');
        }

        $linked = User::where('google_id', $googleId)->first();

        if ($intent === 'link') {
            $user = Auth::guard('web')->user();
            if (! $user || $user->id !== $linkUserId || mb_strtolower($user->email) !== $email || ($linked && $linked->id !== $user->id)) {
                return $this->fail('link', 'Usa la misma cuenta de Google que tu correo registrado.');
            }

            $user->google_id = $googleId;
            $user->email_verified_at ??= now();
            $user->save();

            return redirect()->route('account')->with('status', 'Tu cuenta de Google quedó vinculada.');
        }

        if ($intent !== 'login') {
            return $this->fail('login', 'La solicitud de acceso no es válida.');
        }

        if (! $linked) {
            $existing = User::whereRaw('LOWER(email) = ?', [$email])->first();
            if ($existing) {
                return $this->fail('login', 'Este correo ya tiene una cuenta. Ingresa con tu contraseña y vincula Google desde Mi cuenta.');
            }

            $linked = new User;
            $linked->name = $googleUser->getName() ?: $email;
            $linked->email = $email;
            $linked->email_verified_at = now();
            $linked->google_id = $googleId;
            $linked->role_id = Role::where('code', 'student')->firstOrFail()->id;
            $linked->save();
        }

        Auth::guard('web')->login($linked);
        $request->session()->regenerate();

        return redirect()->route($linked->role?->code === 'admin' ? 'admin.dashboard' : 'student.dashboard');
    }

    private function ensureConfigured(): void
    {
        abort_unless(config('services.google.client_id') && config('services.google.client_secret'), 503, 'El acceso con Google aún no está disponible.');
    }

    private function fail(?string $intent, string $message): RedirectResponse
    {
        return redirect()->route($intent === 'link' ? 'account' : 'login')->withErrors(['google' => $message]);
    }
}
