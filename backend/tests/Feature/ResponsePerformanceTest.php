<?php

namespace Tests\Feature;

use App\Models\Diccionario;
use App\Models\Nivel;
use App\Models\Usuario;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class ResponsePerformanceTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_json_compression_respects_negotiation_and_preserves_dictionary_response(): void
    {
        Diccionario::create(['kichwa' => '[DEMO] compresión', 'español' => '[DEMO] técnica']);
        $response = $this->getJson('/api/diccionario/buscar?q=compresion&direccion=kichwa-es', ['Accept-Encoding' => 'gzip;q=0.5'])->assertOk()->assertHeader('Content-Encoding', 'gzip')->assertHeader('Vary', 'Accept-Encoding');
        $data = json_decode(gzdecode($response->getContent()), true);
        $this->assertSame(1, $data['total']);
        $this->getJson('/api/diccionario/buscar?q=compresion&direccion=kichwa-es', ['Accept-Encoding' => 'gzip;q=0'])->assertOk()->assertHeaderMissing('Content-Encoding')->assertJsonPath('total', 1);
    }

    public function test_uploaded_images_are_optimized_and_support_immutable_cache_and_not_modified(): void
    {
        Storage::fake('public');
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $response = $this->postJson('/api/admin/uploads', ['kind' => 'imagen', 'file' => UploadedFile::fake()->image('grande.png', 2000, 1000)])->assertCreated();
        $path = $response->json('path');
        $this->assertSame('webp', pathinfo($path, PATHINFO_EXTENSION));
        $dimensions = getimagesize(Storage::disk('public')->path($path));
        $this->assertSame(1600, $dimensions[0]);
        $this->assertSame(800, $dimensions[1]);
        $media = $this->get('/api/media/'.$path)->assertOk()->assertHeader('Content-Type', 'image/webp');
        $this->assertStringContainsString('immutable', $media->headers->get('Cache-Control'));
        $this->get('/api/media/'.$path, ['If-None-Match' => $media->headers->get('ETag')])->assertStatus(304);
    }

    public function test_cached_level_counts_are_invalidated_after_creating_module(): void
    {
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $level = Nivel::where('orden_nivel', 1)->firstOrFail()->id_nivel;
        $this->getJson('/api/admin/levels')->assertOk()->assertJsonPath('0.children_count', 0);
        $this->postJson('/api/admin/modules', ['level_id' => $level, 'title' => '[DEMO] Caché', 'description' => 'Prueba'])->assertCreated();
        $this->getJson('/api/admin/levels')->assertOk()->assertJsonPath('0.children_count', 1);
    }
}
