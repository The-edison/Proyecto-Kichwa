<?php

namespace Tests\Feature;

use App\Models\Usuario;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Symfony\Component\Mailer\Exception\TransportException;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class PasswordRecoveryTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_recovery_sends_a_spanish_email_with_a_frontend_link_and_does_not_disclose_unknown_accounts(): void
    {
        Notification::fake();
        $user = Usuario::factory()->create(['correo_usuario' => 'ana+prueba@example.test']);

        $sent = $this->postJson('/api/auth/forgot-password', ['email' => ' ANA+PRUEBA@EXAMPLE.TEST '])->assertOk();
        $unknown = $this->postJson('/api/auth/forgot-password', ['email' => 'unknown@example.test'])->assertOk();

        $this->assertSame($sent->json(), $unknown->json());
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user): bool {
            $mail = $notification->toMail($user);
            $this->assertSame('Recupera tu contraseña de Yachay', $mail->subject);
            $parts = parse_url($mail->actionUrl);
            parse_str($parts['query'], $query);
            $this->assertSame('/recuperar-contrasena', $parts['path']);
            $this->assertSame($user->correo_usuario, $query['email']);
            $this->assertTrue(Password::tokenExists($user, $query['token']));

            return true;
        });
    }

    public function test_recovery_requests_do_not_send_repeated_emails_during_the_broker_throttle(): void
    {
        Notification::fake();
        $user = Usuario::factory()->create();

        $this->postJson('/api/auth/forgot-password', ['email' => $user->correo_usuario])->assertOk();
        $this->postJson('/api/auth/forgot-password', ['email' => $user->correo_usuario])->assertOk();

        Notification::assertSentToTimes($user, ResetPassword::class, 1);
    }

    public function test_a_reset_token_is_single_use_and_rejects_existing_sessions_and_api_tokens(): void
    {
        $user = Usuario::factory()->create();
        config(['sanctum.stateful' => ['127.0.0.1:5173']]);
        $this->withHeaders(['Origin' => 'http://127.0.0.1:5173', 'X-Tab-Session' => str_repeat('a', 64)]);
        $this->postJson('/api/auth/login', ['identifier' => $user->correo_usuario, 'password' => 'PruebaSegura#2026'])->assertOk();
        $user->createToken('old-token');
        $token = Password::createToken($user);
        $payload = ['email' => $user->correo_usuario, 'token' => $token, 'password' => 'NuevaClaveSegura#2026', 'password_confirmation' => 'NuevaClaveSegura#2026'];

        $this->postJson('/api/auth/reset-password', $payload)->assertOk();

        $this->assertTrue(Hash::check('NuevaClaveSegura#2026', $user->fresh()->contrasena_usuario));
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->assertDatabaseCount('password_reset_tokens', 0);
        $this->postJson('/api/auth/reset-password', $payload)->assertUnprocessable();
        $this->getJson('/api/auth/me')->assertUnauthorized();
        $this->postJson('/api/auth/login', ['identifier' => $user->correo_usuario, 'password' => 'PruebaSegura#2026'])->assertUnprocessable();
        $this->postJson('/api/auth/login', ['identifier' => $user->correo_usuario, 'password' => 'NuevaClaveSegura#2026'])->assertOk();
    }

    public function test_expired_and_wrong_account_tokens_leave_the_password_unchanged(): void
    {
        $this->freezeTime();
        $user = Usuario::factory()->create();
        $other = Usuario::factory()->create();
        $original = $user->contrasena_usuario;
        $token = Password::createToken($user);
        $payload = ['email' => $other->correo_usuario, 'token' => $token, 'password' => 'NuevaClaveSegura#2026', 'password_confirmation' => 'NuevaClaveSegura#2026'];
        $this->postJson('/api/auth/reset-password', $payload)->assertUnprocessable();
        $this->travel(61)->minutes();

        $this->postJson('/api/auth/reset-password', array_replace($payload, ['email' => $user->correo_usuario]))->assertUnprocessable();

        $this->assertSame($original, $user->fresh()->contrasena_usuario);
    }

    public function test_confirmation_and_password_strength_are_validated_before_consuming_the_token(): void
    {
        $user = Usuario::factory()->create();
        $original = $user->contrasena_usuario;
        $token = Password::createToken($user);
        $payload = ['email' => $user->correo_usuario, 'token' => $token, 'password' => 'NuevaClaveSegura#2026', 'password_confirmation' => 'OtraClaveSegura#2026'];

        $this->postJson('/api/auth/reset-password', $payload)->assertUnprocessable()->assertJsonValidationErrors('password_confirmation');
        $this->postJson('/api/auth/reset-password', array_replace($payload, ['password' => 'corta', 'password_confirmation' => 'corta']))->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->assertSame($original, $user->fresh()->contrasena_usuario);
        $this->assertTrue(Password::tokenExists($user, $token));
    }

    public function test_blocked_accounts_cannot_receive_or_use_reset_links(): void
    {
        Notification::fake();
        $user = Usuario::factory()->create();
        $token = Password::createToken($user);
        $user->estado_usuario = 'bloqueado';
        $user->save();
        $original = $user->contrasena_usuario;

        $this->postJson('/api/auth/forgot-password', ['email' => $user->correo_usuario])->assertOk();
        $this->postJson('/api/auth/reset-password', ['email' => $user->correo_usuario, 'token' => $token, 'password' => 'NuevaClaveSegura#2026', 'password_confirmation' => 'NuevaClaveSegura#2026'])->assertUnprocessable();

        Notification::assertNothingSent();
        $this->assertSame($original, $user->fresh()->contrasena_usuario);
    }

    public function test_mail_transport_failure_returns_a_clear_error_and_allows_a_new_token_on_retry(): void
    {
        $user = Usuario::factory()->create();
        Notification::shouldReceive('send')->once()->andThrow(new TransportException('SMTP unavailable'));

        $this->postJson('/api/auth/forgot-password', ['email' => $user->correo_usuario])->assertStatus(503)->assertJsonPath('message', 'No se pudo enviar el correo en este momento. Inténtalo de nuevo en un minuto.');

        $this->assertDatabaseCount('password_reset_tokens', 0);
    }

    public function test_invalid_email_payloads_do_not_create_reset_tokens(): void
    {
        $this->postJson('/api/auth/forgot-password', ['email' => ['not-a-string']])->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->postJson('/api/auth/reset-password', ['email' => 'invalid'])->assertUnprocessable()->assertJsonValidationErrors(['email', 'password', 'token']);
        $this->assertDatabaseCount('password_reset_tokens', 0);
    }
}
