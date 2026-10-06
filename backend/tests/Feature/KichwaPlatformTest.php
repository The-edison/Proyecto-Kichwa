<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\Nivel;
use App\Models\Pregunta;
use App\Models\Unidad;
use App\Models\Usuario;
use Database\Seeders\AdministradorSeeder;
use Database\Seeders\DemostracionSeeder;
use Database\Seeders\NivelSeeder;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL as RefreshDatabase;

class KichwaPlatformTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(NivelSeeder::class);
    }

    public function test_registration_normalizes_email_validates_cedula_and_cannot_assign_role(): void
    {
        Notification::fake();
        $input = ['name' => 'Ana Yánez', 'email' => ' ANA@EXAMPLE.TEST ', 'cedula' => '1710034065',
            'password' => 'NuevaClave#2026', 'password_confirmation' => 'NuevaClave#2026'];
        $this->postJson('/api/auth/register', $input + ['role_id' => 1])->assertUnprocessable()->assertJsonValidationErrors('role_id');
        $this->postJson('/api/auth/register', array_replace($input, ['cedula' => '0201234567']))->assertUnprocessable()->assertJsonValidationErrors('cedula');
        $response = $this->postJson('/api/auth/register', $input)->assertCreated()->assertJsonPath('user.email', 'ana@example.test')->assertJsonPath('user.role.code', 'student');
        $this->assertDatabaseHas('usuarios', ['correo_usuario' => 'ana@example.test', 'rol_usuario' => 'estudiante']);
        $this->assertDatabaseCount('usuarios_niveles', 1);
        $user = Usuario::firstOrFail();
        Notification::assertSentTo($user, VerifyEmail::class);
        $user->fill(['rol_usuario' => 'administrador', 'estado_usuario' => 'bloqueado']);
        $this->assertSame('estudiante', $user->rol_usuario);
        $this->assertSame('activo', $user->estado_usuario);
        $this->postJson('/api/auth/login', ['identifier' => ' ANA@EXAMPLE.TEST ', 'password' => 'NuevaClave#2026'])->assertOk();
        $this->postJson('/api/auth/register', $input)->assertUnprocessable()->assertJsonValidationErrors(['email', 'cedula']);
    }

    public function test_registration_rejects_invalid_name_password_and_disposable_email(): void
    {
        $this->postJson('/api/auth/register', ['name' => '<script>', 'email' => 'ana@mailinator.com', 'password' => 'corta', 'password_confirmation' => 'otra'])
            ->assertUnprocessable()->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_admin_password_change_is_mandatory_and_seed_is_idempotent(): void
    {
        $this->seed(AdministradorSeeder::class);
        $admin = Usuario::where('rol_usuario', 'administrador')->firstOrFail();
        $original = $admin->contrasena_usuario;
        $this->seed(AdministradorSeeder::class);
        $this->assertSame($original, $admin->fresh()->contrasena_usuario);
        Sanctum::actingAs($admin);
        $this->getJson('/api/admin/levels')->assertForbidden();
        $this->postJson('/api/auth/change-password', ['current_password' => AdministradorSeeder::LOCAL_PASSWORD,
            'password' => 'CambioSeguro#2026', 'password_confirmation' => 'CambioSeguro#2026'])->assertOk()->assertJsonPath('user.debe_cambiar_contrasena', false);
        $this->getJson('/api/admin/levels')->assertOk()->assertJsonCount(2);
    }

    public function test_passwords_cannot_exceed_bcrypt_byte_limit(): void
    {
        $password = 'Aa1#'.str_repeat('é', 35);
        $this->postJson('/api/auth/register', ['name' => 'Ana Prueba', 'email' => 'ana@example.test',
            'password' => $password, 'password_confirmation' => $password])
            ->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->assertDatabaseCount('usuarios', 0);
    }

    public function test_production_seeder_refuses_local_password_before_writing(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        config(['kichwa.admin_email' => 'admin@example.com', 'kichwa.admin_password' => AdministradorSeeder::LOCAL_PASSWORD]);
        try {
            (new AdministradorSeeder)->run();
            $this->fail('No debe aceptar la contraseña local en producción.');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('KICHWA_ADMIN_EMAIL', $exception->getMessage());
            $this->assertDatabaseCount('usuarios', 0);
        }
    }

    public function test_roles_blocked_tokens_and_intermediate_direct_urls(): void
    {
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $this->getJson('/api/admin/modules')->assertForbidden();
        $this->getJson('/api/levels')->assertOk()->assertJsonCount(2)->assertJsonPath('0.code', 'basic')->assertJsonPath('1.available', false);
        $id = Nivel::where('orden_nivel', 2)->firstOrFail()->id_nivel;
        $this->getJson('/api/levels/'.$id.'/modules')->assertNotFound();
        $token = $student->createToken('test')->plainTextToken;
        $student->estado_usuario = 'bloqueado';
        $student->save();
        $this->getJson('/api/progress')->assertUnauthorized();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_administrator_crud_order_constraints_and_restrict_delete(): void
    {
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $level = Nivel::where('orden_nivel', 1)->firstOrFail()->id_nivel;
        $module = $this->postJson('/api/admin/modules', ['level_id' => $level, 'title' => '[DEMO] Módulo', 'description' => 'Demostración', 'sort_order' => 1])->assertCreated()->json('id');
        $this->postJson('/api/admin/modules', ['level_id' => $level, 'title' => '[DEMO] Duplicado', 'description' => 'Demostración', 'sort_order' => 1])->assertUnprocessable();
        $unit = $this->postJson('/api/admin/units', ['module_id' => $module, 'title' => '[DEMO] Unidad', 'description' => 'Objetivo técnico', 'sort_order' => 1])->assertCreated()->json('id');
        $topic = $this->postJson('/api/admin/contents', ['unit_id' => $unit, 'title' => '[DEMO] Tema', 'kind' => 'culture', 'body' => '<script>alert(1)</script>Texto', 'sort_order' => 1])->assertCreated()->json('id');
        $this->assertDatabaseHas('temas', ['id_tema' => $topic, 'contenido_tema' => 'alert(1)Texto']);
        $this->patchJson('/api/admin/modules/'.$module, ['title' => '[DEMO] Editado'])->assertOk()->assertJsonPath('title', '[DEMO] Editado');
        $this->getJson('/api/admin/modules/'.$module)->assertOk();
        $this->deleteJson('/api/admin/modules/'.$module)->assertStatus(409);
        $this->deleteJson('/api/admin/contents/'.$topic)->assertNoContent();
        $this->deleteJson('/api/admin/units/'.$unit)->assertNoContent();
        $this->deleteJson('/api/admin/modules/'.$module)->assertNoContent();
        $word = $this->postJson('/api/admin/glossary', ['kichwa' => '[DEMO] prueba', 'spanish' => '[DEMO] equivalencia'])->assertCreated()->json('id');
        $this->getJson('/api/glossary?q=equivalencia')->assertOk()->assertJsonPath('total', 1);
        $this->deleteJson('/api/admin/glossary/'.$word)->assertNoContent();
    }

    public function test_safe_uploads_accept_raster_and_wav_but_reject_scripts_and_wrong_extension(): void
    {
        Storage::fake('public');
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $image = $this->postJson('/api/admin/uploads', ['kind' => 'imagen', 'file' => UploadedFile::fake()->image('foto.png')])->assertCreated();
        Storage::disk('public')->assertExists($image->json('path'));
        $this->assertStringStartsWith('kichwa/imagenes/', $image->json('path'));
        $this->get('/api/media/'.$image->json('path'))->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->postJson('/api/admin/uploads', ['kind' => 'imagen', 'file' => UploadedFile::fake()->createWithContent('ataque.php', '<?php echo 1;')])->assertUnprocessable();
        $this->postJson('/api/admin/uploads', ['kind' => 'imagen', 'file' => UploadedFile::fake()->image('imagen.php')])->assertUnprocessable();
        $this->get('/api/media/../../.env')->assertNotFound();
        $wav = 'RIFF'.pack('V', 36 + 800).'WAVEfmt '.pack('VvvVVvv', 16, 1, 1, 8000, 8000, 1, 8).'data'.pack('V', 800).str_repeat(chr(128), 800);
        $this->postJson('/api/admin/uploads', ['kind' => 'audio', 'file' => UploadedFile::fake()->createWithContent('audio.wav', $wav)])->assertCreated();
        Sanctum::actingAs(Usuario::factory()->create());
        $this->postJson('/api/admin/uploads', ['kind' => 'imagen', 'file' => UploadedFile::fake()->image('foto.png')])->assertForbidden();
    }

    public function test_all_exercises_grade_on_server_do_not_leak_solutions_and_preserve_history(): void
    {
        $this->seed(DemostracionSeeder::class);
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $unit = Unidad::firstOrFail()->id_unidad;
        $this->getJson('/api/units/'.$unit.'/exercises')->assertOk()->assertDontSee('solution')->assertDontSee('solucion');
        $activities = Actividad::orderBy('orden_actividad')->get();
        $answers = [
            ['seleccion' => ['a']],
            ['textos' => ['h1' => ' ISHKAY ']],
            ['pares' => [['origen' => 'k2', 'destino' => 'e2'], ['origen' => 'k1', 'destino' => 'e1']]],
            ['pares' => [['origen' => 'k1', 'destino' => 'z1']]],
        ];
        $this->postJson('/api/exercises/'.$activities[0]->id_actividad.'/answer', ['answer' => ['seleccion' => ['b']], 'is_correct' => true, 'score' => 100])->assertOk()->assertJsonPath('is_correct', false);
        foreach ($activities as $i => $activity) {
            $this->postJson('/api/exercises/'.$activity->id_actividad.'/answer', ['answer' => $answers[$i]])->assertOk()->assertJsonPath('is_correct', true);
        }
        $this->getJson('/api/progress')->assertOk()->assertJsonPath('0.percentage', 100)->assertJsonPath('0.completed_activities', 4);
        $this->assertDatabaseCount('respuestas_actividad', 5);
        $this->postJson('/api/exercises/'.$activities[0]->id_actividad.'/answer', ['answer' => ['seleccion' => ['no_existe']]])->assertUnprocessable();
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->patchJson('/api/admin/exercises/'.$activities[0]->id_actividad, ['prompt' => 'Cambiar historia'])->assertStatus(409);
        $this->deleteJson('/api/admin/exercises/'.$activities[0]->id_actividad)->assertStatus(409);
    }

    public function test_attempt_ownership_numbering_calculated_grade_and_frozen_questions(): void
    {
        $this->seed(DemostracionSeeder::class);
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $evaluation = EvaluacionKichwa::where('tipo_evaluacion', 'unidad')->firstOrFail()->id_evaluacion;
        $question = Pregunta::where('id_evaluacion', $evaluation)->firstOrFail()->id_pregunta;
        $this->getJson('/api/evaluations/'.$evaluation)->assertOk()->assertDontSee('solution')->assertDontSee('seleccion":["a"]');
        $start = $this->postJson('/api/evaluations/'.$evaluation.'/attempts')->assertOk()->assertJsonPath('numero_intento', 1)->json('attempt_id');
        $this->postJson('/api/evaluations/'.$evaluation.'/attempts')->assertOk()->assertJsonPath('attempt_id', $start);
        $payload = ['attempt_id' => $start, 'answers' => [['question_id' => $question, 'answer' => ['seleccion' => ['a']]]], 'score' => 0];
        $this->postJson('/api/evaluations/'.$evaluation.'/submit', $payload)->assertOk()->assertJsonPath('score', 100)->assertJsonPath('puntaje_obtenido', 10);
        $this->assertDatabaseHas('respuestas_evaluacion', ['id_intento' => $start, 'id_evaluacion' => $evaluation, 'id_pregunta' => $question, 'puntaje_respuesta_evaluacion' => 10]);
        $this->postJson('/api/evaluations/'.$evaluation.'/submit', $payload)->assertStatus(409);
        $second = $this->postJson('/api/evaluations/'.$evaluation.'/attempts')->assertJsonPath('numero_intento', 2)->json('attempt_id');
        Sanctum::actingAs(Usuario::factory()->create());
        $this->postJson('/api/evaluations/'.$evaluation.'/submit', array_replace($payload, ['attempt_id' => $second]))->assertNotFound();
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->patchJson('/api/admin/questions/'.$question, ['prompt' => 'Cambiar'])->assertStatus(409);
    }

    public function test_password_recovery_updates_hash_and_revokes_tokens(): void
    {
        Notification::fake();
        $user = Usuario::factory()->create(['correo_usuario' => 'ana@example.test']);
        $user->createToken('old');
        $this->postJson('/api/auth/forgot-password', ['email' => ' ANA@EXAMPLE.TEST '])->assertOk();
        Notification::assertSentTo($user, ResetPassword::class);
        $token = Password::createToken($user);
        $this->postJson('/api/auth/reset-password', ['email' => $user->correo_usuario, 'token' => $token,
            'password' => 'Restablecida#2026', 'password_confirmation' => 'Restablecida#2026'])->assertOk();
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->postJson('/api/auth/login', ['identifier' => $user->correo_usuario, 'password' => 'Restablecida#2026'])->assertOk();
    }
}
