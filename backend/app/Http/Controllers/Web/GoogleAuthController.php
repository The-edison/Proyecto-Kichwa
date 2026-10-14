<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Nivel;
use App\Models\Usuario;
use App\Models\UsuarioNivel;
use App\Services\AutenticacionPestana;
use GuzzleHttp\Exception\TransferException;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;
use Throwable;

class GoogleAuthController extends Controller
{
    public function prepare(Request $request): JsonResponse
    {
        $this->ensureConfigured();
        abort_unless($request->hasSession(), 401);
        $link = $request->route('intent') === 'link';
        $request->session()->put('google_pending_tab', ['key' => AutenticacionPestana::key($request), 'intent' => $link ? 'link' : 'login', 'expires' => now()->timestamp + 300, 'user_id' => $link ? $request->user()->id_usuario : null]);

        return response()->json(['url' => url($link ? '/cuenta/google' : '/auth/google')]);
    }

    private function preparedTab(Request $request, string $intent): ?array
    {
        $pending = $request->session()->pull('google_pending_tab');
        if (! $pending || $pending['intent'] !== $intent || $pending['expires'] <= now()->timestamp) {
            return null;
        }
        $request->session()->put('google_auth_tab_key', $pending['key']);
        $request->session()->put('google_auth_expires', now()->timestamp + 600);

        return $pending;
    }

    public function redirect(Request $request): RedirectResponse
    {
        $this->ensureConfigured();
        if (! $this->preparedTab($request, 'login')) {
            return $this->fail('login', 'La solicitud venció. Pulsa Continuar con Google de nuevo.');
        }
        $request->session()->put('google_auth_intent', 'login');
        $request->session()->forget('google_link_user_id');

        return Socialite::driver('google')->redirect();
    }

    public function link(Request $request): RedirectResponse
    {
        $this->ensureConfigured();
        $pending = $this->preparedTab($request, 'link');
        if (! $pending) {
            return $this->fail('link', 'La solicitud venció. Vuelve a vincular Google desde Mi cuenta.');
        }
        $request->session()->put('google_auth_intent', 'link');
        $request->session()->put('google_link_user_id', $pending['user_id']);

        return Socialite::driver('google')->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        $intent = $request->session()->pull('google_auth_intent');
        $linkUserId = $request->session()->pull('google_link_user_id');
        $tabKey = $request->session()->pull('google_auth_tab_key');
        $expires = $request->session()->pull('google_auth_expires', 0);

        if (! $intent || ! $tabKey || $expires <= now()->timestamp || $request->filled('error')) {
            return $this->fail($intent, 'No se completó el acceso con Google. Inténtalo de nuevo.');
        }

        try {
            // Socialite comprueba el parámetro state con la sesión; no usar stateless().
            $googleUser = Socialite::driver('google')->user();
        } catch (InvalidStateException) {
            return $this->fail($intent, 'La sesión de Google venció o cambió. Vuelve a iniciar desde el botón Continuar con Google en esta misma pestaña.');
        } catch (TransferException $exception) {
            preg_match('/\bcURL error ([0-9]+):/', $exception->getMessage(), $matches);
            $curlError = (int) ($matches[1] ?? 0);
            Log::warning('Fallo de conexión OAuth con Google.', ['exception' => $exception::class, 'curl_errno' => $curlError]);

            return $this->fail($intent, $curlError === 60
                ? 'El servidor no pudo verificar el certificado HTTPS de Google. Contacta con el administrador de Yachay.'
                : 'No se pudo completar la conexión del servidor con Google. Inténtalo de nuevo.');
        } catch (Throwable $exception) {
            Log::warning('Fallo al verificar OAuth de Google.', ['exception' => $exception::class]);

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
            $session = AutenticacionPestana::sessions($request)[$tabKey] ?? null;
            $user = $session ? Usuario::find($session['user_id']) : null;
            if (! $user || $user->estado_usuario !== 'activo' || ! hash_equals($session['password_hash'] ?? '', AutenticacionPestana::passwordHash($user)) || $user->id_usuario !== $linkUserId || mb_strtolower($user->correo_usuario) !== $email || ($linked && $linked->id_usuario !== $user->id_usuario)) {
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

            try {
                $linked = DB::transaction(function () use ($googleUser, $email, $googleId): Usuario {
                    $user = new Usuario;
                    $user->nombre_usuario = mb_substr($googleUser->getName() ?: $email, 0, 150);
                    $user->correo_usuario = $email;
                    $user->email_verified_at = now();
                    $user->google_id = $googleId;
                    $user->rol_usuario = 'estudiante';
                    $user->save();
                    UsuarioNivel::create(['id_usuario' => $user->id_usuario, 'id_nivel' => Nivel::where('orden_nivel', 1)->firstOrFail()->id_nivel]);

                    return $user->refresh();
                });
            } catch (QueryException $exception) {
                report($exception);

                return $this->fail('login', 'No se pudo completar el registro con Google. Inténtalo de nuevo.');
            }
        }

        if ($linked->estado_usuario !== 'activo') {
            return $this->fail('login', 'Tu cuenta está bloqueada.');
        }
        if ($linked->rol_usuario === 'estudiante') {
            UsuarioNivel::firstOrCreate(['id_usuario' => $linked->id_usuario, 'id_nivel' => Nivel::where('orden_nivel', 1)->firstOrFail()->id_nivel]);
        }
        Auth::guard('web')->login($linked);
        $request->session()->regenerate();
        AutenticacionPestana::bind($request, $linked, $tabKey);

        return redirect()->away($this->frontendPath($linked->debe_cambiar_contrasena ? '/cuenta' : ($linked->rol_usuario === 'administrador' ? '/admin' : '/aprender')));
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
