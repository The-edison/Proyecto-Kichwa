<?php

namespace App\Services;

use App\Models\Usuario;
use Illuminate\Http\Request;

class AutenticacionPestana
{
    public static function key(Request $request): string
    {
        $token = $request->header('X-Tab-Session', '');
        abort_unless(is_string($token) && preg_match('/^[a-f0-9]{64}$/D', $token), 401, 'Inicia sesión en esta pestaña.');

        return hash('sha256', $token);
    }

    public static function bind(Request $request, Usuario $user, ?string $key = null): void
    {
        $sessions = self::sessions($request);
        $sessions[$key ?? self::key($request)] = ['user_id' => $user->id_usuario, 'last_activity' => now()->timestamp, 'password_hash' => self::passwordHash($user)];
        $request->session()->put('tab_sessions', array_slice($sessions, -16, null, true));
    }

    public static function passwordHash(Usuario $user): string
    {
        return hash_hmac('sha256', $user->getAuthPassword(), config('app.key'));
    }

    /** @return array<string, array{user_id: int, last_activity: int, password_hash: string}> */
    public static function sessions(Request $request): array
    {
        $cutoff = now()->timestamp - ((int) config('session.lifetime') * 60);

        return array_filter($request->session()->get('tab_sessions', []), fn (array $session): bool => $session['last_activity'] > $cutoff);
    }

    public static function revoke(Request $request): void
    {
        $sessions = self::sessions($request);
        unset($sessions[self::key($request)]);
        $request->session()->put('tab_sessions', $sessions);
    }
}
