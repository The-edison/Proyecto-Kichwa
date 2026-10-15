<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\Tema;
use App\Models\Unidad;
use App\Models\Usuario;
use Database\Seeders\UnidadUnoDefinitivaSeeder;
use Database\Seeders\UnidadUnoGuiadaSeeder;
use Database\Seeders\UnidadUnoImagenesSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class UnidadUnoGuiadaTest extends TestCase
{
    use UsesPostgreSQL;

    private function guidedUnit(): Unidad
    {
        $this->seed(UnidadUnoGuiadaSeeder::class);

        return Unidad::findOrFail(Tema::where('clave_leccion', UnidadUnoGuiadaSeeder::LESSON_KEY)->firstOrFail()->id_unidad);
    }

    public function test_unit_exposes_four_activities_in_order_and_keeps_solutions_private(): void
    {
        $unit = $this->guidedUnit();
        Sanctum::actingAs(Usuario::factory()->create());

        $response = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 4)->assertJsonPath('completed_count', 0)
            ->assertJsonPath('exercises.0.config.title', '¿Qué palabra corresponde?')->assertJsonPath('exercises.3.config.title', 'Palabras en dos idiomas');
        foreach ([0, 1, 2, 3] as $index) {
            $response->assertJsonMissingPath('exercises.'.$index.'.solution')->assertJsonMissingPath('exercises.'.$index.'.config.correct_feedback');
        }
        foreach ([0 => 'wasi', 1 => 'sisa', 2 => 'purina'] as $index => $word) {
            $response->assertJsonPath('exercises.'.$index.'.type', 'seleccion_multiple')->assertJsonPath('exercises.'.$index.'.config.max_selections', 1);
            $exercise = Actividad::findOrFail($response->json('exercises.'.$index.'.id'));
            $this->assertSame(['seleccion' => [$word]], $exercise->solucion_actividad);
            $this->get('/api/media/'.$response->json('exercises.'.$index.'.config.prompt_image'))->assertOk();
        }

        $this->getJson('/api/units/'.$unit->id_unidad)->assertOk()->assertJsonPath('config.learning_mode', 'guided');
        $this->getJson('/api/units/'.$unit->id_unidad.'/exercises')->assertOk()->assertJsonPath('total', 4);
        $this->assertSame(1, Tema::where('id_unidad', $unit->id_unidad)->where('publicado', true)->count());
        $this->assertDatabaseMissing('evaluaciones', ['id_unidad' => $unit->id_unidad, 'publicado' => true]);
    }

    public function test_answers_are_graded_saved_and_restored_without_duplicate_xp(): void
    {
        $unit = $this->guidedUnit();
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $exercises = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get();
        $image = $exercises[0];
        $matching = $exercises[3];
        $this->postJson('/api/exercises/'.$image->id_actividad.'/answer', ['answer' => ['seleccion' => ['shunku']]])->assertOk()->assertJsonPath('is_correct', false)->assertJsonPath('xp_earned', 0);
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertJsonPath('completed_count', 0);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('completed_units', []);

        $this->postJson('/api/exercises/'.$image->id_actividad.'/answer', ['answer' => ['seleccion' => ['wasi']]])->assertOk()->assertJsonPath('is_correct', true)->assertJsonPath('xp_earned', 10);
        $this->postJson('/api/exercises/'.$image->id_actividad.'/answer', ['answer' => ['seleccion' => ['wasi']]])->assertOk()->assertJsonPath('xp_earned', 0);
        $wrong = ['pares' => [['origen' => 'flor', 'destino' => 'llama'], ['origen' => 'oveja', 'destino' => 'sisa'], ['origen' => 'corazon', 'destino' => 'shunku'], ['origen' => 'caminar', 'destino' => 'purina']]];
        $this->postJson('/api/exercises/'.$matching->id_actividad.'/answer', ['answer' => $wrong])->assertOk()->assertJsonPath('is_correct', false);
        $this->postJson('/api/exercises/'.$matching->id_actividad.'/answer', ['answer' => $matching->solucion_actividad])->assertOk()->assertJsonPath('is_correct', true)->assertJsonPath('xp_total', 20);

        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('completed_count', 2)->assertJsonPath('exercises.0.completed', true)->assertJsonPath('exercises.3.completed', true);
        $this->getJson('/api/units/'.$unit->id_unidad)->assertOk()->assertJsonPath('percentage', 50);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('completed_units', []);
        foreach ([1 => 'sisa', 2 => 'purina'] as $index => $word) {
            $this->postJson('/api/exercises/'.$exercises[$index]->id_actividad.'/answer', ['answer' => ['seleccion' => ['wasi']]])->assertOk()->assertJsonPath('is_correct', false)->assertJsonPath('xp_earned', 0);
            $this->postJson('/api/exercises/'.$exercises[$index]->id_actividad.'/answer', ['answer' => ['seleccion' => [$word]]])->assertOk()->assertJsonPath('is_correct', true)->assertJsonPath('xp_earned', 10);
            $this->postJson('/api/exercises/'.$exercises[$index]->id_actividad.'/answer', ['answer' => ['seleccion' => [$word]]])->assertOk()->assertJsonPath('xp_earned', 0);
        }
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('completed_count', 4);
        $this->getJson('/api/units/'.$unit->id_unidad)->assertOk()->assertJsonPath('percentage', 100);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('completed_units.0', $unit->id_unidad);
        $this->assertDatabaseHas('respuestas_actividad', ['id_usuario' => $student->id_usuario, 'id_actividad' => $matching->id_actividad, 'acierto_actividad' => true]);
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('completed_count', 0)->assertJsonPath('exercises.0.completed', false);
    }

    public function test_replacement_preserves_history_retires_old_exercises_and_is_idempotent(): void
    {
        $this->seed(UnidadUnoDefinitivaSeeder::class);
        $old = Actividad::where('publicado', true)->where('origen_reactivo', 'u1-definitiva-a1')->firstOrFail();
        Sanctum::actingAs(Usuario::factory()->create());
        $this->postJson('/api/exercises/'.$old->id_actividad.'/answer', ['answer' => $old->solucion_actividad])->assertOk();

        $unit = $this->guidedUnit();
        $ids = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->pluck('id_actividad')->all();
        $this->seed(UnidadUnoGuiadaSeeder::class);

        $this->assertSame($ids, Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->pluck('id_actividad')->all());
        $this->assertDatabaseHas('respuestas_actividad', ['id_actividad' => $old->id_actividad]);
        $this->assertDatabaseHas('actividades', ['id_actividad' => $old->id_actividad, 'publicado' => false]);
        $this->postJson('/api/exercises/'.$old->id_actividad.'/answer', ['answer' => $old->solucion_actividad])->assertNotFound();
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('completed_count', 0);
    }

    public function test_guided_route_enforces_authentication_roles_and_unit_mode(): void
    {
        $unit = $this->guidedUnit();
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertUnauthorized();
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', [])->assertUnauthorized();
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertForbidden();
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', [])->assertForbidden();
        Sanctum::actingAs(Usuario::factory()->create());
        $unit->configuracion = ['learning_mode' => 'classic'];
        $unit->save();
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertNotFound();
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', [])->assertNotFound();
    }

    public function test_new_image_activities_preserve_existing_guided_answers_and_are_not_duplicated(): void
    {
        $unit = $this->guidedUnit();
        Actividad::where('id_unidad', $unit->id_unidad)->whereIn('origen_reactivo', ['u1-guided-image-sisa-v1', 'u1-guided-image-purina-v1'])->delete();
        $originals = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get();
        Sanctum::actingAs(Usuario::factory()->create());
        foreach ($originals as $exercise) {
            $this->postJson('/api/exercises/'.$exercise->id_actividad.'/answer', ['answer' => $exercise->solucion_actividad])->assertOk()->assertJsonPath('xp_earned', 10);
        }

        $this->seed(UnidadUnoImagenesSeeder::class);
        $first = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 4)->assertJsonPath('completed_count', 2)
            ->assertJsonPath('exercises.0.id', $originals[0]->id_actividad)->assertJsonPath('exercises.3.id', $originals[1]->id_actividad);
        $this->seed(UnidadUnoImagenesSeeder::class);

        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertExactJson($first->json());
        $this->assertDatabaseCount('respuestas_actividad', 2);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 20);
        foreach ($originals as $exercise) {
            $this->postJson('/api/exercises/'.$exercise->id_actividad.'/answer', ['answer' => $exercise->solucion_actividad])->assertOk()->assertJsonPath('xp_earned', 0);
        }
    }

    public function test_result_scores_saved_answers_with_partial_credit_and_points_cannot_be_forged(): void
    {
        $unit = $this->guidedUnit();
        $next = Unidad::create(['id_modulo' => $unit->id_modulo, 'titulo_unidad' => 'Saludos', 'objetivo_unidad' => 'Saludar en kichwa.', 'orden_unidad' => $unit->orden_unidad + 1, 'publicado' => true]);
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $exercises = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get();
        $imageId = $this->postJson('/api/exercises/'.$exercises[0]->id_actividad.'/answer', ['answer' => ['seleccion' => ['wasi']]])->assertOk()->json('response_id');
        $flowerId = $this->postJson('/api/exercises/'.$exercises[1]->id_actividad.'/answer', ['answer' => ['seleccion' => ['sisa']]])->assertOk()->json('response_id');
        $walkingId = $this->postJson('/api/exercises/'.$exercises[2]->id_actividad.'/answer', ['answer' => ['seleccion' => ['purina']]])->assertOk()->json('response_id');
        $wrong = ['pares' => [['origen' => 'flor', 'destino' => 'llama'], ['origen' => 'oveja', 'destino' => 'sisa'], ['origen' => 'corazon', 'destino' => 'shunku'], ['origen' => 'caminar', 'destino' => 'purina']]];
        $matchingId = $this->postJson('/api/exercises/'.$exercises[3]->id_actividad.'/answer', ['answer' => $wrong])->assertOk()->json('response_id');
        $payload = ['response_ids' => [$imageId, $flowerId, $walkingId, $matchingId], 'score' => 20];
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', $payload)->assertOk()
            ->assertJsonPath('score', 14)->assertJsonPath('max_score', 20)->assertJsonPath('correct_count', 5)->assertJsonPath('total_items', 7)
            ->assertJsonPath('passed', false)->assertJsonPath('details.3.correct', 2)->assertJsonPath('next_unit_id', $next->id_unidad);
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', $payload)->assertOk()->assertJsonPath('score', 14);
        $this->assertDatabaseHas('respuestas_actividad', ['id_respuesta_actividad' => $matchingId, 'id_usuario' => $student->id_usuario, 'acierto_actividad' => false]);
        $this->assertDatabaseCount('respuestas_actividad', 4);
        $this->getJson('/api/mastery')->assertJsonPath('xp', 30);

        $correctId = $this->postJson('/api/exercises/'.$exercises[3]->id_actividad.'/answer', ['answer' => $exercises[3]->solucion_actividad])->assertOk()->json('response_id');
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => [$imageId, $flowerId, $walkingId, $correctId]])
            ->assertOk()->assertJsonPath('score', 20)->assertJsonPath('passed', true);
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', $payload)->assertOk()->assertJsonPath('score', 14);
    }

    public function test_result_requires_all_four_activities_and_rejects_another_students_answers(): void
    {
        $unit = $this->guidedUnit();
        Sanctum::actingAs(Usuario::factory()->create());
        $exercises = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get();
        $ids = [];
        foreach ($exercises as $exercise) {
            $ids[] = $this->postJson('/api/exercises/'.$exercise->id_actividad.'/answer', ['answer' => $exercise->solucion_actividad])->assertOk()->json('response_id');
        }
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', [])->assertUnprocessable()->assertJsonValidationErrors('response_ids');
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => [$ids[0], $ids[3]]])->assertUnprocessable()->assertJsonValidationErrors('response_ids');
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => [$ids[0], $ids[0], $ids[2], $ids[3]]])->assertUnprocessable()->assertJsonValidationErrors('response_ids.0');
        Sanctum::actingAs(Usuario::factory()->create());
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => $ids])->assertUnprocessable()
            ->assertJsonPath('errors.response_ids.0', 'Responde todas las actividades de esta unidad antes de ver tu resultado.');
    }
}
