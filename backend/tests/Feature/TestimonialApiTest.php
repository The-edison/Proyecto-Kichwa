<?php

namespace Tests\Feature;

use App\Models\Testimonial;
use App\Models\User;
use App\Models\Usuario;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class TestimonialApiTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_student_without_completed_levels_publishes_a_public_opinion_with_abbreviated_name(): void
    {
        $this->freezeTime();
        $student = Usuario::factory()->create(['nombre_usuario' => 'Ana Pérez López']);
        $other = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $this->getJson('/api/testimonials/eligibility')->assertOk()->assertJsonPath('can_comment', true)->assertJsonPath('testimonial', null);

        $response = $this->postJson('/api/testimonials', ['body' => '  Me gusta aprender Kichwa con las actividades de Yachay.  ', 'usuario_id' => $other->id_usuario, 'user_id' => 999]);

        $response->assertCreated()->assertExactJson(['id' => $response->json('id'), 'name' => 'Ana P.', 'body' => 'Me gusta aprender Kichwa con las actividades de Yachay.', 'created_at' => now()->toDateString()]);
        $this->assertDatabaseHas('testimonials', ['usuario_id' => $student->id_usuario, 'user_id' => null, 'body' => 'Me gusta aprender Kichwa con las actividades de Yachay.']);
        $this->assertDatabaseMissing('testimonials', ['usuario_id' => $other->id_usuario]);
        $this->getJson('/api/testimonials')->assertOk()->assertExactJson([$response->json()]);
        $this->getJson('/api/testimonials/eligibility')->assertOk()->assertJsonPath('has_commented', true)->assertJsonPath('testimonial.body', $response->json('body'));
    }

    public function test_updating_an_opinion_keeps_its_id_and_other_students_opinions_unchanged(): void
    {
        $first = Usuario::factory()->create();
        $second = Usuario::factory()->create();
        Sanctum::actingAs($first);
        $id = $this->postJson('/api/testimonials', ['body' => 'Primera opinión sobre la plataforma.'])->assertCreated()->json('id');
        Sanctum::actingAs($second);
        $this->getJson('/api/testimonials/eligibility')->assertJsonPath('testimonial', null);
        $this->postJson('/api/testimonials', ['body' => 'Otra experiencia de aprendizaje.'])->assertCreated();
        Sanctum::actingAs($first);

        $this->postJson('/api/testimonials', ['body' => 'Mi experiencia actualizada con Yachay.'])->assertOk()->assertJsonPath('id', $id);

        $this->assertDatabaseCount('testimonials', 2);
        $this->assertDatabaseHas('testimonials', ['id' => $id, 'usuario_id' => $first->id_usuario, 'body' => 'Mi experiencia actualizada con Yachay.']);
        $this->assertDatabaseHas('testimonials', ['usuario_id' => $second->id_usuario, 'body' => 'Otra experiencia de aprendizaje.']);
    }

    public function test_guests_cannot_publish_and_administrators_cannot_use_student_opinions(): void
    {
        $this->getJson('/api/testimonials')->assertOk()->assertExactJson([]);
        $this->getJson('/api/testimonials/eligibility')->assertUnauthorized();
        $this->postJson('/api/testimonials', ['body' => 'Una experiencia de aprendizaje.'])->assertUnauthorized();
        Sanctum::actingAs(Usuario::factory()->administrador()->create());

        $this->getJson('/api/testimonials/eligibility')->assertForbidden();
        $this->postJson('/api/testimonials', ['body' => 'Una experiencia de aprendizaje.'])->assertForbidden();

        $this->assertDatabaseCount('testimonials', 0);
    }

    #[DataProvider('invalidOpinions')]
    public function test_invalid_opinions_return_422_without_being_saved(mixed $body, string $message): void
    {
        Sanctum::actingAs(Usuario::factory()->create());

        $this->postJson('/api/testimonials', ['body' => $body])->assertUnprocessable()->assertJsonValidationErrors('body')->assertJsonPath('errors.body.0', $message);

        $this->assertDatabaseCount('testimonials', 0);
    }

    public static function invalidOpinions(): array
    {
        return [
            'required' => ['   ', 'Escribe tu opinión antes de publicarla.'],
            'minimum length' => ['Muy corto', 'La opinión debe tener al menos 20 caracteres.'],
            'maximum length' => [str_repeat('a', 501), 'La opinión no puede superar los 500 caracteres.'],
            'text required' => [['texto'], 'La opinión debe ser un texto.'],
        ];
    }

    public function test_public_list_keeps_legacy_opinions_and_returns_the_six_most_recent_updates(): void
    {
        $this->freezeTime();
        $legacy = User::factory()->create(['name' => 'María López']);
        Testimonial::create(['user_id' => $legacy->id, 'body' => 'Mi experiencia anterior se conserva.']);
        $this->getJson('/api/testimonials')->assertOk()->assertJsonPath('0.name', 'María L.');
        foreach (range(1, 7) as $number) {
            $this->travel(1)->minutes();
            Sanctum::actingAs(Usuario::factory()->create());
            $this->postJson('/api/testimonials', ['body' => 'Experiencia de aprendizaje número '.$number.'.'])->assertCreated();
        }

        $this->getJson('/api/testimonials')->assertOk()->assertJsonCount(6)->assertJsonPath('0.body', 'Experiencia de aprendizaje número 7.')->assertJsonPath('5.body', 'Experiencia de aprendizaje número 2.');
    }

    public function test_blocked_students_cannot_publish_and_their_opinion_is_not_public(): void
    {
        $student = Usuario::factory()->create();
        Testimonial::create(['usuario_id' => $student->id_usuario, 'body' => 'Una opinión que dejará de ser pública.']);
        $student->estado_usuario = 'bloqueado';
        $student->save();
        Sanctum::actingAs($student);

        $this->postJson('/api/testimonials', ['body' => 'No debe reemplazar la opinión anterior.'])->assertUnauthorized();
        $this->getJson('/api/testimonials')->assertOk()->assertExactJson([]);

        $this->assertDatabaseHas('testimonials', ['usuario_id' => $student->id_usuario, 'body' => 'Una opinión que dejará de ser pública.']);
    }
}
