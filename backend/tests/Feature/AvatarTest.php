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
        $this->postJson('/api/auth/avatar', ['preset' => 'cometa'])->assertUnauthorized();
        $student = Usuario::factory()->create();
        $other = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $this->postJson('/api/auth/avatar', ['preset' => 'cometa', 'id_usuario' => $other->id_usuario, 'rol_usuario' => 'administrador'])
            ->assertOk()->assertJsonPath('avatar', 'cometa')->assertJsonPath('role.code', 'student');
        Sanctum::actingAs($student->fresh());
        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('avatar', 'cometa');
        $this->assertSame('cometa', $student->fresh()->avatar_usuario);
        $this->assertNull($other->fresh()->avatar_usuario);
        $this->postJson('/api/auth/avatar', ['preset' => 'initial'])->assertOk()->assertJsonPath('avatar', null);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->postJson('/api/auth/avatar', ['preset' => 'flor'])->assertOk()->assertJsonPath('avatar', 'flor');
    }

    public function test_uploaded_photo_is_converted_to_a_small_square_webp_and_replacement_cleans_up_old_files(): void
    {
        Storage::fake('public');
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $first = $this->postJson('/api/auth/avatar', ['image' => UploadedFile::fake()->image('foto.png', 600, 400)])
            ->assertOk()->json('avatar');
        $this->assertMatchesRegularExpression('#^avatars/[a-f0-9]{40}\.webp$#', $first);
        Storage::disk('public')->assertExists($first);
        $dimensions = getimagesize(Storage::disk('public')->path($first));
        $this->assertSame([256, 256], [$dimensions[0], $dimensions[1]]);
        $this->assertSame('image/webp', $dimensions['mime']);
        $this->get('/api/'.$first)->assertOk()->assertHeader('Content-Type', 'image/webp')->assertHeader('X-Content-Type-Options', 'nosniff');
        Sanctum::actingAs($student->fresh());
        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('avatar', $first);
        $second = $this->postJson('/api/auth/avatar', ['image' => UploadedFile::fake()->image('otra.jpg', 200, 300)])
            ->assertOk()->json('avatar');
        $this->assertNotSame($first, $second);
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($second);
        $this->postJson('/api/auth/avatar', ['preset' => 'cometa-guia'])->assertOk();
        Storage::disk('public')->assertMissing($second);
    }

    public function test_avatar_validation_rejects_untrusted_paths_invalid_files_and_oversized_images(): void
    {
        Storage::fake('public');
        Sanctum::actingAs(Usuario::factory()->create());
        $this->postJson('/api/auth/avatar', [])->assertUnprocessable();
        $this->postJson('/api/auth/avatar', ['preset' => 'https://example.test/avatar.svg'])->assertUnprocessable()->assertJsonValidationErrors('preset');
        $this->postJson('/api/auth/avatar', ['image' => UploadedFile::fake()->createWithContent('avatar.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')])
            ->assertUnprocessable()->assertJsonValidationErrors('image');
        $this->postJson('/api/auth/avatar', ['image' => UploadedFile::fake()->image('grande.png')->size(2049)])
            ->assertUnprocessable()->assertJsonValidationErrors('image');
        $this->postJson('/api/auth/avatar', ['image' => UploadedFile::fake()->image('pequena.png', 32, 32)])
            ->assertUnprocessable()->assertJsonValidationErrors('image');
        $this->postJson('/api/auth/avatar', ['preset' => 'cometa', 'image' => UploadedFile::fake()->image('foto.png')])
            ->assertUnprocessable();
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
        $this->postJson('/api/auth/avatar', ['preset' => 'sol'])->assertUnauthorized();
        $this->assertNull($user->fresh()->avatar_usuario);
    }
}
