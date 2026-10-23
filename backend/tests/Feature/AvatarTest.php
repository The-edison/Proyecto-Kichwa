<?php

namespace Tests\Feature;

use App\Models\Usuario;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class AvatarTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_preset_is_saved_on_the_authenticated_account_and_restored_in_the_profile(): void
    {
        $this->postJson('/api/auth/avatar', ['preset' => 'condor'])->assertUnauthorized();
        $student = Usuario::factory()->create();
        $other = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $this->postJson('/api/auth/avatar', ['preset' => 'condor', 'id_usuario' => $other->id_usuario, 'rol_usuario' => 'administrador'])
            ->assertOk()->assertJsonPath('avatar', 'condor')->assertJsonPath('role.code', 'student');
        Sanctum::actingAs($student->fresh());
        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('avatar', 'condor');
        $this->assertSame('condor', $student->fresh()->avatar_usuario);
        $this->assertNull($other->fresh()->avatar_usuario);
        $this->postJson('/api/auth/avatar', ['preset' => 'initial'])->assertOk()->assertJsonPath('avatar', null);
    }

    public function test_all_twelve_available_avatars_can_be_saved_and_restored(): void
    {
        $presets = json_decode(file_get_contents(resource_path('avatar-presets.json')), true, 512, JSON_THROW_ON_ERROR);
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $this->assertCount(12, $presets);
        foreach ($presets as $preset) {
            $this->postJson('/api/auth/avatar', ['preset' => $preset['id']])->assertOk()->assertJsonPath('avatar', $preset['id']);
            Sanctum::actingAs($student->fresh());
            $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('avatar', $preset['id']);
            $this->assertSame($preset['id'], $student->fresh()->avatar_usuario);
        }
    }

    public function test_choosing_an_animal_replaces_a_previous_photo_and_removes_its_file(): void
    {
        Storage::fake('public');
        $previous = 'avatars/'.str_repeat('a', 40).'.webp';
        Storage::disk('public')->put($previous, 'previous photo');
        $student = Usuario::factory()->create();
        $student->avatar_usuario = $previous;
        $student->save();
        Sanctum::actingAs($student);

        $this->postJson('/api/auth/avatar', ['preset' => 'colibri'])->assertOk()->assertJsonPath('avatar', 'colibri');

        $this->assertSame('colibri', $student->fresh()->avatar_usuario);
        Storage::disk('public')->assertMissing($previous);
    }

    public function test_uploads_removed_presets_and_untrusted_paths_are_rejected_without_changing_the_avatar(): void
    {
        Storage::fake('public');
        $student = Usuario::factory()->create();
        $student->avatar_usuario = 'llama';
        $student->save();
        Sanctum::actingAs($student);
        $this->postJson('/api/auth/avatar', [])->assertUnprocessable()->assertJsonValidationErrors('preset');
        foreach (['cometa', 'cometa-guia', 'cometa-animo', 'sol', 'luna', 'flor', 'unknown', 'https://example.test/avatar.svg'] as $preset) {
            $this->postJson('/api/auth/avatar', ['preset' => $preset])->assertUnprocessable()->assertJsonValidationErrors('preset');
        }
        $this->postJson('/api/auth/avatar', ['image' => UploadedFile::fake()->image('foto.png')])->assertUnprocessable()->assertJsonValidationErrors(['image', 'preset']);
        $this->postJson('/api/auth/avatar', ['preset' => 'jaguar', 'image' => UploadedFile::fake()->image('foto.jpg')])->assertUnprocessable()->assertJsonValidationErrors('image');
        $this->assertSame('llama', $student->fresh()->avatar_usuario);
        $this->assertSame([], Storage::disk('public')->allFiles('avatars'));
        $this->get('/api/avatars/missing.webp')->assertNotFound();
        $this->get('/api/avatars/'.str_repeat('a', 40).'.webp')->assertNotFound();
    }

    public function test_blocked_accounts_cannot_change_their_avatar(): void
    {
        $user = Usuario::factory()->create();
        $user->estado_usuario = 'bloqueado';
        $user->save();
        Sanctum::actingAs($user);
        $this->postJson('/api/auth/avatar', ['preset' => 'llama'])->assertUnauthorized();
        $this->assertNull($user->fresh()->avatar_usuario);
    }

    public function test_administrators_cannot_select_an_avatar_or_upload_a_photo(): void
    {
        Storage::fake('public');
        $admin = Usuario::factory()->administrador()->create();
        Sanctum::actingAs($admin);

        $this->postJson('/api/auth/avatar', ['preset' => 'mariposa'])->assertForbidden();
        $this->postJson('/api/auth/avatar', ['image' => UploadedFile::fake()->image('foto.png', 256, 256)])->assertForbidden();

        $this->assertNull($admin->fresh()->avatar_usuario);
        $this->assertSame([], Storage::disk('public')->allFiles('avatars'));
    }
}
