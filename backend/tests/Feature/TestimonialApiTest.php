<?php

namespace Tests\Feature;

use App\Models\Usuario;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL as RefreshDatabase;

class TestimonialApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_opinions_are_preserved_and_intermediate_submission_is_unavailable(): void
    {
        $this->getJson('/api/testimonials')->assertOk()->assertExactJson([]);
        $this->postJson('/api/testimonials', ['body' => 'Experiencia de prueba'])->assertUnauthorized();
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/testimonials/eligibility')->assertOk()->assertJsonPath('can_comment', false);
        $this->postJson('/api/testimonials', ['body' => 'Experiencia de prueba'])->assertForbidden();
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->postJson('/api/testimonials', ['body' => 'Experiencia de prueba'])->assertForbidden();
        $this->assertDatabaseCount('testimonials', 0);
    }
}
