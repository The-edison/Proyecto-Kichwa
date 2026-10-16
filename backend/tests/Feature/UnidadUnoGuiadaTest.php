<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\Tema;
use App\Models\Unidad;
use App\Models\Usuario;
use Database\Seeders\UnidadUnoAudioSeeder;
use Database\Seeders\UnidadUnoDefinitivaSeeder;
use Database\Seeders\UnidadUnoGuiadaSeeder;
use Database\Seeders\UnidadUnoImagenesSeeder;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class UnidadUnoGuiadaTest extends TestCase
{
    use UsesPostgreSQL;

    private function answer(Actividad $exercise): array
    {
        $answer = $exercise->solucion_actividad;
        if ($exercise->tipo_actividad === 'completar') {
            $answer['textos'] = array_map(fn (array $variants): string => $variants[0], $answer['textos']);
        }

        return $answer;
    }

    private function guidedUnit(): Unidad
    {
        $this->seed(UnidadUnoGuiadaSeeder::class);

        return Unidad::findOrFail(Tema::where('clave_leccion', UnidadUnoGuiadaSeeder::LESSON_KEY)->firstOrFail()->id_unidad);
    }

    public function test_unit_exposes_six_activities_in_order_and_keeps_solutions_private(): void
    {
        $unit = $this->guidedUnit();
        Sanctum::actingAs(Usuario::factory()->create());

        $response = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 6)->assertJsonPath('completed_count', 0)
            ->assertJsonPath('exercises.0.config.title', '¿Qué palabra corresponde?')->assertJsonPath('exercises.4.config.title', 'Palabras en dos idiomas');
        foreach ([0, 1, 2, 3, 4, 5] as $index) {
            $response->assertJsonMissingPath('exercises.'.$index.'.solution')->assertJsonMissingPath('exercises.'.$index.'.config.correct_feedback');
        }
        foreach ([0 => 'wasi', 1 => 'sisa', 2 => 'purina', 3 => 'yura'] as $index => $word) {
            $response->assertJsonPath('exercises.'.$index.'.type', 'seleccion_multiple')->assertJsonPath('exercises.'.$index.'.config.max_selections', 1);
            $exercise = Actividad::findOrFail($response->json('exercises.'.$index.'.id'));
            $this->assertSame(['seleccion' => [$word]], $exercise->solucion_actividad);
            $this->get('/api/media/'.$response->json('exercises.'.$index.'.config.prompt_image'))->assertOk()->assertHeader('Content-Type', 'image/webp');
        }

        $this->getJson('/api/units/'.$unit->id_unidad)->assertOk()->assertJsonPath('config.learning_mode', 'guided');
        $this->getJson('/api/units/'.$unit->id_unidad.'/exercises')->assertOk()->assertJsonPath('total', 6);
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
        $matching = $exercises[4];
        $this->postJson('/api/exercises/'.$image->id_actividad.'/answer', ['answer' => ['seleccion' => ['shunku']]])->assertOk()->assertJsonPath('is_correct', false)->assertJsonPath('xp_earned', 0);
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertJsonPath('completed_count', 0);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('completed_units', []);

        $this->postJson('/api/exercises/'.$image->id_actividad.'/answer', ['answer' => ['seleccion' => ['wasi']]])->assertOk()->assertJsonPath('is_correct', true)->assertJsonPath('xp_earned', 10);
        $this->postJson('/api/exercises/'.$image->id_actividad.'/answer', ['answer' => ['seleccion' => ['wasi']]])->assertOk()->assertJsonPath('xp_earned', 0);
        $wrong = ['pares' => [['origen' => 'flor', 'destino' => 'llama'], ['origen' => 'oveja', 'destino' => 'sisa'], ['origen' => 'corazon', 'destino' => 'shunku'], ['origen' => 'caminar', 'destino' => 'purina']]];
        $this->postJson('/api/exercises/'.$matching->id_actividad.'/answer', ['answer' => $wrong])->assertOk()->assertJsonPath('is_correct', false);
        $this->postJson('/api/exercises/'.$matching->id_actividad.'/answer', ['answer' => $matching->solucion_actividad])->assertOk()->assertJsonPath('is_correct', true)->assertJsonPath('xp_total', 20);

        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('completed_count', 2)->assertJsonPath('exercises.0.completed', true)->assertJsonPath('exercises.4.completed', true);
        $this->getJson('/api/units/'.$unit->id_unidad)->assertOk()->assertJsonPath('percentage', 33.33);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('completed_units', []);
        foreach ([1 => 'sisa', 2 => 'purina', 3 => 'yura'] as $index => $word) {
            $this->postJson('/api/exercises/'.$exercises[$index]->id_actividad.'/answer', ['answer' => ['seleccion' => ['wasi']]])->assertOk()->assertJsonPath('is_correct', false)->assertJsonPath('xp_earned', 0);
            $this->postJson('/api/exercises/'.$exercises[$index]->id_actividad.'/answer', ['answer' => ['seleccion' => [$word]]])->assertOk()->assertJsonPath('is_correct', true)->assertJsonPath('xp_earned', 10);
            $this->postJson('/api/exercises/'.$exercises[$index]->id_actividad.'/answer', ['answer' => ['seleccion' => [$word]]])->assertOk()->assertJsonPath('xp_earned', 0);
        }
        $this->postJson('/api/exercises/'.$exercises[5]->id_actividad.'/answer', ['answer' => $this->answer($exercises[5])])->assertOk()->assertJsonPath('xp_earned', 10);
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('completed_count', 6);
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
        Actividad::where('id_unidad', $unit->id_unidad)->whereIn('origen_reactivo', ['u1-guided-image-sisa-v1', 'u1-guided-image-purina-v1', 'u1-guided-image-yura-v1'])->delete();
        $originals = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get();
        Sanctum::actingAs(Usuario::factory()->create());
        foreach ($originals as $exercise) {
            $this->postJson('/api/exercises/'.$exercise->id_actividad.'/answer', ['answer' => $this->answer($exercise)])->assertOk()->assertJsonPath('xp_earned', 10);
        }

        $this->seed(UnidadUnoImagenesSeeder::class);
        $first = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 6)->assertJsonPath('completed_count', 3)
            ->assertJsonPath('exercises.0.id', $originals[0]->id_actividad)->assertJsonPath('exercises.4.id', $originals[1]->id_actividad);
        $this->seed(UnidadUnoImagenesSeeder::class);

        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertExactJson($first->json());
        $this->assertDatabaseCount('respuestas_actividad', 3);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 30);
        foreach ($originals as $exercise) {
            $this->postJson('/api/exercises/'.$exercise->id_actividad.'/answer', ['answer' => $this->answer($exercise)])->assertOk()->assertJsonPath('xp_earned', 0);
        }
    }

    public function test_result_rejects_incorrect_exercises_and_counts_each_completed_exercise_once(): void
    {
        $unit = $this->guidedUnit();
        $next = Unidad::create(['id_modulo' => $unit->id_modulo, 'titulo_unidad' => 'Saludos', 'objetivo_unidad' => 'Saludar en kichwa.', 'orden_unidad' => $unit->orden_unidad + 1, 'publicado' => true]);
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $exercises = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get();
        $imageId = $this->postJson('/api/exercises/'.$exercises[0]->id_actividad.'/answer', ['answer' => ['seleccion' => ['wasi']]])->assertOk()->json('response_id');
        $flowerId = $this->postJson('/api/exercises/'.$exercises[1]->id_actividad.'/answer', ['answer' => ['seleccion' => ['sisa']]])->assertOk()->json('response_id');
        $walkingId = $this->postJson('/api/exercises/'.$exercises[2]->id_actividad.'/answer', ['answer' => ['seleccion' => ['purina']]])->assertOk()->json('response_id');
        $treeId = $this->postJson('/api/exercises/'.$exercises[3]->id_actividad.'/answer', ['answer' => ['seleccion' => ['yura']]])->assertOk()->json('response_id');
        $audioId = $this->postJson('/api/exercises/'.$exercises[5]->id_actividad.'/answer', ['answer' => $this->answer($exercises[5])])->assertOk()->json('response_id');
        $wrong = ['pares' => [['origen' => 'flor', 'destino' => 'llama'], ['origen' => 'oveja', 'destino' => 'sisa'], ['origen' => 'corazon', 'destino' => 'shunku'], ['origen' => 'caminar', 'destino' => 'purina']]];
        $matchingId = $this->postJson('/api/exercises/'.$exercises[4]->id_actividad.'/answer', ['answer' => $wrong])->assertOk()->json('response_id');
        $payload = ['response_ids' => [$imageId, $flowerId, $walkingId, $treeId, $matchingId, $audioId], 'score' => 20];
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', $payload)->assertUnprocessable()
            ->assertJsonPath('errors.response_ids.0', 'Corrige todos los ejercicios de esta unidad antes de ver tu resultado.');
        $this->assertDatabaseHas('respuestas_actividad', ['id_respuesta_actividad' => $matchingId, 'id_usuario' => $student->id_usuario, 'acierto_actividad' => false]);
        $this->assertDatabaseCount('respuestas_actividad', 6);
        $this->getJson('/api/mastery')->assertJsonPath('xp', 50);

        $correctId = $this->postJson('/api/exercises/'.$exercises[4]->id_actividad.'/answer', ['answer' => $exercises[4]->solucion_actividad])->assertOk()->json('response_id');
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => [$imageId, $flowerId, $walkingId, $treeId, $correctId, $audioId]])
            ->assertOk()->assertJsonPath('score', 6)->assertJsonPath('max_score', 6)->assertJsonPath('correct_count', 6)->assertJsonPath('total_items', 6)
            ->assertJsonPath('passed', true)->assertJsonPath('details.4.correct', 1)->assertJsonPath('details.4.total', 1)->assertJsonPath('next_unit_id', $next->id_unidad);
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', $payload)->assertUnprocessable()->assertJsonValidationErrors('response_ids');
    }

    public function test_result_requires_all_six_activities_and_rejects_another_students_answers(): void
    {
        $unit = $this->guidedUnit();
        Sanctum::actingAs(Usuario::factory()->create());
        $exercises = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get();
        $ids = [];
        foreach ($exercises as $exercise) {
            $ids[] = $this->postJson('/api/exercises/'.$exercise->id_actividad.'/answer', ['answer' => $this->answer($exercise)])->assertOk()->json('response_id');
        }
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', [])->assertUnprocessable()->assertJsonValidationErrors('response_ids');
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => [$ids[0], $ids[3]]])->assertUnprocessable()->assertJsonValidationErrors('response_ids');
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => [$ids[0], $ids[0], $ids[2], $ids[3], $ids[4], $ids[5]]])->assertUnprocessable()->assertJsonValidationErrors('response_ids.0');
        Sanctum::actingAs(Usuario::factory()->create());
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => $ids])->assertUnprocessable()
            ->assertJsonPath('errors.response_ids.0', 'Responde todas las actividades de esta unidad antes de ver tu resultado.');
    }

    public function test_adding_yura_keeps_the_existing_four_exercises_answers_and_rewards(): void
    {
        $unit = $this->guidedUnit();
        Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u1-guided-image-yura-v1')->delete();
        $originals = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get();
        Sanctum::actingAs(Usuario::factory()->create());
        foreach ($originals as $exercise) {
            $this->postJson('/api/exercises/'.$exercise->id_actividad.'/answer', ['answer' => $this->answer($exercise)])->assertOk()->assertJsonPath('xp_earned', 10);
        }

        $this->seed(UnidadUnoImagenesSeeder::class);

        $data = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 6)->assertJsonPath('completed_count', 5)
            ->assertJsonPath('exercises.0.id', $originals[0]->id_actividad)->assertJsonPath('exercises.1.id', $originals[1]->id_actividad)
            ->assertJsonPath('exercises.2.id', $originals[2]->id_actividad)->assertJsonPath('exercises.4.id', $originals[3]->id_actividad)->json();
        $tree = $data['exercises'][3];
        $this->postJson('/api/exercises/'.$tree['id'].'/answer', ['answer' => ['seleccion' => ['wasi']]])->assertOk()->assertJsonPath('is_correct', false)->assertJsonPath('xp_earned', 0);
        $this->postJson('/api/exercises/'.$tree['id'].'/answer', ['answer' => ['seleccion' => ['yura']]])->assertOk()->assertJsonPath('is_correct', true)
            ->assertJsonPath('feedback', 'Alli rurashka. Yura significa árbol.')->assertJsonPath('xp_earned', 10)->assertJsonPath('xp_total', 60);
        $this->seed(UnidadUnoImagenesSeeder::class);
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 6)->assertJsonPath('completed_count', 6)->assertJsonPath('exercises.3.id', $tree['id']);
        $this->getJson('/api/units/'.$unit->id_unidad)->assertOk()->assertJsonPath('percentage', 100);
        $this->assertDatabaseCount('respuestas_actividad', 7);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 60);
    }

    public function test_listening_exercise_is_last_grades_all_three_vowels_and_grants_ten_xp_once(): void
    {
        $unit = $this->guidedUnit();
        Sanctum::actingAs(Usuario::factory()->create());
        $data = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 6)
            ->assertJsonPath('exercises.5.type', 'completar')->assertJsonPath('exercises.5.config.listening_vowels', true)
            ->assertJsonPath('exercises.5.config.title', 'La vocal que falta')->assertJsonMissingPath('exercises.5.solution')->json();
        $id = $data['exercises'][5]['id'];
        $session = (string) Str::uuid();
        $payload = ['practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid(),
            'answer' => ['textos' => ['audio1' => 'u', 'audio2' => 'u', 'audio3' => 'i']]];
        $this->postJson('/api/exercises/'.$id.'/answer', $payload)->assertOk()->assertJsonPath('is_correct', false)->assertJsonPath('xp_earned', 0);
        $payload['submission_id'] = (string) Str::uuid();
        $payload['answer']['textos']['audio3'] = 'A';
        $response = $this->postJson('/api/exercises/'.$id.'/answer', $payload)->assertOk()->assertJsonPath('is_correct', true)
            ->assertJsonPath('xp_earned', 10)->assertJsonPath('xp_attempt', 10)->json();
        $this->postJson('/api/exercises/'.$id.'/answer', $payload)->assertOk()->assertExactJson($response);
        $this->seed(UnidadUnoAudioSeeder::class);
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 6)->assertJsonPath('exercises.5.id', $id);
        $this->assertDatabaseCount('respuestas_actividad', 2);
        $this->assertDatabaseCount('recompensas', 1);
    }
}
