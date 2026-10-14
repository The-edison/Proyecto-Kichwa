<?php

namespace Tests\Feature;

use App\Models\Usuario;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class RegistrationValidationTest extends TestCase
{
    use UsesPostgreSQL;

    private function validInput(): array
    {
        return ['first_name' => 'María José', 'last_name' => 'Yánez Ñacato', 'email' => 'maria@example.test',
            'cedula' => '1710034065', 'password' => 'MiClaveSegura#2026', 'password_confirmation' => 'MiClaveSegura#2026'];
    }

    public function test_registration_combines_separate_names_normalizes_spaces_and_preserves_password_and_identity(): void
    {
        Notification::fake();
        $input = array_replace($this->validInput(), ['first_name' => '  María   José ', 'last_name' => ' Yánez   Ñacato ', 'email' => ' MARIA@EXAMPLE.TEST ']);

        $this->postJson('/api/auth/register', $input)->assertCreated()->assertJsonPath('user.name', 'María José Yánez Ñacato')->assertJsonPath('user.email', 'maria@example.test')->assertJsonPath('user.cedula', '1710034065');

        $user = Usuario::where('correo_usuario', 'maria@example.test')->firstOrFail();
        $this->assertDatabaseHas('usuarios', ['id_usuario' => $user->id_usuario, 'nombre_usuario' => 'María José Yánez Ñacato', 'rol_usuario' => 'estudiante']);
        $this->assertTrue(Hash::check('MiClaveSegura#2026', $user->contrasena_usuario));
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    #[DataProvider('invalidFields')]
    public function test_invalid_registration_fields_return_422_and_create_no_account(string $field, mixed $value): void
    {
        Notification::fake();

        $this->postJson('/api/auth/register', array_replace($this->validInput(), [$field => $value]))->assertUnprocessable()->assertJsonValidationErrors($field);

        $this->assertDatabaseCount('usuarios', 0);
        $this->assertDatabaseCount('usuarios_niveles', 0);
        Notification::assertNothingSent();
    }

    public static function invalidFields(): array
    {
        return [
            'missing names' => ['first_name', ''],
            'missing surnames' => ['last_name', ''],
            'numbers in names' => ['first_name', 'María123'],
            'punctuation in surnames' => ['last_name', 'Yánez-Ñacato'],
            'html in names' => ['first_name', '<script>alert</script>'],
            'names too long' => ['first_name', str_repeat('a', 75)],
            'names too short' => ['last_name', 'A'],
            'non string names' => ['first_name', ['María']],
            'cedula too short' => ['cedula', '171003406'],
            'cedula too long' => ['cedula', '17100340650'],
            'cedula letters' => ['cedula', '171003406A'],
            'cedula numeric value' => ['cedula', 1710034065],
            'invalid province zero' => ['cedula', '0010000008'],
            'invalid province 25' => ['cedula', '2500000001'],
            'invalid province 31' => ['cedula', '3100000003'],
            'invalid third digit' => ['cedula', '1760000009'],
            'invalid checksum' => ['cedula', '1710034064'],
            'invalid email' => ['email', 'correo-invalido'],
            'non string email' => ['email', ['correo@example.test']],
            'disposable email' => ['email', 'maria@mailinator.com'],
            'short password' => ['password', 'Aa1#'],
            'missing confirmation' => ['password_confirmation', ''],
            'confirmation mismatch' => ['password_confirmation', 'OtraClave#2026'],
        ];
    }

    #[DataProvider('validCedulas')]
    public function test_registration_accepts_valid_province_consular_and_zero_verifier_numbers(string $cedula): void
    {
        Notification::fake();

        $this->postJson('/api/auth/register', array_replace($this->validInput(), ['cedula' => $cedula]))->assertCreated()->assertJsonPath('user.cedula', $cedula);

        $this->assertDatabaseHas('usuarios', ['cedula_usuario' => $cedula]);
    }

    public static function validCedulas(): array
    {
        return ['leading zero' => ['0100000017'], 'province 24' => ['2400000002'], 'consular' => ['3050178882'], 'zero verifier' => ['0100000090']];
    }

    public function test_optional_cedula_can_be_empty_and_old_combined_name_cannot_bypass_required_fields(): void
    {
        Notification::fake();
        $this->postJson('/api/auth/register', ['name' => 'María Yánez', 'email' => 'old@example.test', 'password' => 'MiClaveSegura#2026', 'password_confirmation' => 'MiClaveSegura#2026'])->assertUnprocessable()->assertJsonValidationErrors(['first_name', 'last_name']);

        $this->postJson('/api/auth/register', array_replace($this->validInput(), ['cedula' => '']))->assertCreated()->assertJsonPath('user.cedula', null);

        $this->assertDatabaseCount('usuarios', 1);
    }
}
