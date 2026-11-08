<?php

namespace Tests\Feature;

use App\Models\Usuario;
use App\Services\ProductionTransfer;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;
use Tests\UsesPostgreSQL;
use ZipArchive;

class ProductionTransferTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_export_preserves_admin_password_and_content_without_students_or_their_files(): void
    {
        Storage::fake('public');
        Storage::fake('local');
        $admin = Usuario::factory()->administrador()->create(['remember_token' => 'old-session']);
        $student = Usuario::factory()->create(['avatar_usuario' => 'avatars/'.str_repeat('b', 40).'.webp']);
        Storage::disk('public')->put($student->avatar_usuario, 'student-photo');
        Storage::disk('public')->put('kichwa/imagenes/abc.webp', 'lesson-image');
        DB::table('diccionario')->insert(['kichwa' => 'yaku', 'español' => 'agua']);
        $path = Storage::disk('local')->path('production.zip');

        $this->artisan('yachay:export-production', ['destination' => $path])->assertSuccessful();

        $zip = new ZipArchive;
        $zip->open($path);
        try {
            $payload = json_decode($zip->getFromName('database.json'), true, 512, JSON_THROW_ON_ERROR);
            $this->assertCount(1, $payload['tables']['usuarios']);
            $this->assertSame($admin->id_usuario, $payload['tables']['usuarios'][0]['id_usuario']);
            $this->assertSame($admin->contrasena_usuario, $payload['tables']['usuarios'][0]['contrasena_usuario']);
            $this->assertNull($payload['tables']['usuarios'][0]['remember_token']);
            $this->assertSame('yaku', $payload['tables']['diccionario'][0]['kichwa']);
            $this->assertArrayNotHasKey('sessions', $payload['tables']);
            $this->assertArrayNotHasKey('respuestas_actividad', $payload['tables']);
            $this->assertSame('lesson-image', $zip->getFromName('media/kichwa/imagenes/abc.webp'));
            $this->assertFalse($zip->getFromName('media/'.$student->avatar_usuario));
            $this->assertDatabaseCount('usuarios', 2);
            $this->assertSame('old-session', $admin->fresh()->remember_token);
        } finally {
            $zip->close();
        }
    }

    public function test_import_restores_content_media_and_login_and_resets_sequences(): void
    {
        Storage::fake('public');
        Storage::fake('local');
        config(['app.url' => 'http://127.0.0.1:8000']);
        $admin = Usuario::factory()->administrador()->create(['id_usuario' => 900]);
        $level = DB::table('niveles')->value('id_nivel');
        DB::table('modulos')->insert([
            'id_modulo' => 700, 'id_nivel' => $level, 'nombre_modulo' => 'Contenido propio',
            'descripcion_modulo' => 'http://127.0.0.1:8000/api/media/kichwa/imagenes/abc.webp', 'orden_modulo' => 1,
        ]);
        DB::table('diccionario')->insert(['id' => 800, 'kichwa' => 'yaku', 'español' => 'agua']);
        Storage::disk('public')->put('kichwa/imagenes/abc.webp', 'lesson-image');
        $path = Storage::disk('local')->path('production.zip');
        $transfer = app(ProductionTransfer::class);
        $transfer->export($path);
        DB::table('modulos')->delete();
        DB::table('diccionario')->delete();
        DB::table('usuarios')->delete();
        Storage::disk('public')->delete('kichwa/imagenes/abc.webp');
        config(['app.url' => 'https://yachay-kichwa.devs-ueb.tech']);

        $this->artisan('yachay:import-production', ['source' => $path, '--confirm-new-database' => true])->assertSuccessful();

        $this->assertTrue(Hash::check('PruebaSegura#2026', Usuario::findOrFail($admin->id_usuario)->contrasena_usuario));
        $this->assertDatabaseHas('modulos', ['id_modulo' => 700, 'descripcion_modulo' => 'https://yachay-kichwa.devs-ueb.tech/api/media/kichwa/imagenes/abc.webp']);
        $this->assertSame('lesson-image', Storage::disk('public')->get('kichwa/imagenes/abc.webp'));
        $this->assertSame(801, DB::table('diccionario')->insertGetId(['kichwa' => 'allpa', 'español' => 'tierra']));
        $this->assertSame(901, Usuario::factory()->create()->id_usuario);
    }

    public function test_import_refuses_an_existing_installation_without_changing_it(): void
    {
        Storage::fake('public');
        Storage::fake('local');
        $admin = Usuario::factory()->administrador()->create();
        $path = Storage::disk('local')->path('production.zip');
        $transfer = app(ProductionTransfer::class);
        $transfer->export($path);
        try {
            $transfer->import($path);
            $this->fail('La importación debía rechazar la base ocupada.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('base nueva', $exception->getMessage());
        }
        $this->assertDatabaseHas('usuarios', ['id_usuario' => $admin->id_usuario]);
        $this->assertDatabaseCount('usuarios', 1);
    }

    public function test_full_curriculum_can_be_imported_with_its_hierarchy_and_exercise_configuration(): void
    {
        Storage::fake('public');
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);
        $expected = [];
        foreach (ProductionTransfer::TABLES as $table) {
            $expected[$table] = DB::table($table)->count();
        }
        $exercise = DB::table('actividades')->whereRaw("configuracion <> '{}'::jsonb")->first();
        $path = Storage::disk('local')->path('curriculum.zip');
        $transfer = app(ProductionTransfer::class);
        $transfer->export($path);
        foreach (array_reverse(ProductionTransfer::TABLES) as $table) {
            DB::table($table)->delete();
        }

        $counts = $transfer->import($path);

        foreach ($expected as $table => $count) {
            $this->assertSame($count, $counts[$table]);
            $this->assertDatabaseCount($table, $count);
        }
        $this->assertDatabaseHas('actividades', ['id_actividad' => $exercise->id_actividad, 'configuracion' => $exercise->configuracion]);
        $this->assertDatabaseCount('usuarios_niveles', 0);
        $this->assertDatabaseCount('respuestas_actividad', 0);
    }

    #[DataProvider('invalidPackages')]
    public function test_import_rejects_private_data_and_unsafe_archive_paths(string $tampering): void
    {
        Storage::fake('public');
        Storage::fake('local');
        Usuario::factory()->administrador()->create();
        $path = Storage::disk('local')->path('production.zip');
        $transfer = app(ProductionTransfer::class);
        $transfer->export($path);
        DB::table('usuarios')->delete();
        $zip = new ZipArchive;
        $zip->open($path);
        $payload = json_decode($zip->getFromName('database.json'), true, 512, JSON_THROW_ON_ERROR);
        if ($tampering === 'student') {
            $payload['tables']['usuarios'][0]['rol_usuario'] = 'estudiante';
        } elseif ($tampering === 'private_table') {
            $payload['tables']['sessions'] = [];
        } elseif ($tampering === 'schema') {
            $payload['migrations'] = [];
        } else {
            $zip->addFromString('media/kichwa/imagenes/../../evil.php', '<?php echo 1;');
        }
        $zip->addFromString('database.json', json_encode($payload, JSON_THROW_ON_ERROR));
        $zip->close();
        try {
            $transfer->import($path);
            $this->fail('El paquete no permitido debía rechazarse.');
        } catch (RuntimeException $exception) {
            $this->assertNotSame('', $exception->getMessage());
        }
        $this->assertDatabaseCount('usuarios', 0);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public static function invalidPackages(): array
    {
        return [['student'], ['private_table'], ['schema'], ['path']];
    }

    public function test_import_requires_explicit_new_database_flag(): void
    {
        $this->artisan('yachay:import-production', ['source' => 'missing.zip'])->assertFailed();
    }

    public function test_export_does_not_overwrite_an_existing_private_archive(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('production.zip', 'existing-private-package');
        try {
            app(ProductionTransfer::class)->export(Storage::disk('local')->path('production.zip'));
            $this->fail('El archivo existente debía conservarse.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('ya existe', $exception->getMessage());
        }
        $this->assertSame('existing-private-package', Storage::disk('local')->get('production.zip'));
    }

    public function test_database_error_rolls_back_admins_and_preserves_the_initial_catalog(): void
    {
        Storage::fake('public');
        Storage::fake('local');
        Usuario::factory()->administrador()->create();
        $path = Storage::disk('local')->path('production.zip');
        $transfer = app(ProductionTransfer::class);
        $transfer->export($path);
        DB::table('usuarios')->delete();
        $levelCount = DB::table('niveles')->count();
        $zip = new ZipArchive;
        $zip->open($path);
        $payload = json_decode($zip->getFromName('database.json'), true, 512, JSON_THROW_ON_ERROR);
        $payload['tables']['modulos'][] = [
            'id_modulo' => 1, 'id_nivel' => 999999, 'nombre_modulo' => 'Inválido',
            'descripcion_modulo' => 'Referencia inexistente', 'orden_modulo' => 1,
        ];
        $zip->addFromString('database.json', json_encode($payload, JSON_THROW_ON_ERROR));
        $zip->close();

        try {
            $transfer->import($path);
            $this->fail('La referencia inválida debía revertir la importación.');
        } catch (QueryException $exception) {
            $this->assertSame('23503', $exception->errorInfo[0]);
        }
        $this->assertDatabaseCount('usuarios', 0);
        $this->assertDatabaseCount('niveles', $levelCount);
        $this->assertDatabaseCount('modulos', 0);
    }
}
