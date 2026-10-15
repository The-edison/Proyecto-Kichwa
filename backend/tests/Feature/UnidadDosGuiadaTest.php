<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\Tema;
use App\Models\Unidad;
use App\Models\Usuario;
use Database\Seeders\UnidadDosGuiadaSeeder;
use Database\Seeders\UnidadUnoGuiadaSeeder;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class UnidadDosGuiadaTest extends TestCase
{
    use UsesPostgreSQL;

    private function unit(): Unidad
    {
        $this->seed(UnidadDosGuiadaSeeder::class);

        return Unidad::findOrFail(Tema::where('clave_leccion', UnidadDosGuiadaSeeder::LESSON_KEY)->value('id_unidad'));
    }

    public function test_greetings_lesson_and_three_private_image_questions_are_shared_by_both_roles(): void
    {
        $unit = $this->unit();
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/units/'.$unit->id_unidad)->assertOk()->assertJsonPath('sort_order', 2)
            ->assertJsonPath('config.learning_mode', 'guided')->assertJsonPath('config.guided_lesson', 'greetings');
        $this->getJson('/api/units/'.$unit->id_unidad.'/contents')->assertOk()->assertJsonPath('data.0.title', 'Saludos y conversación');
        $data = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 3)->json('exercises');
        foreach (['puncha', 'chishi', 'tuta'] as $index => $answer) {
            $exercise = $data[$index];
            $this->assertArrayNotHasKey('solution', $exercise);
            $this->assertArrayNotHasKey('correct_feedback', $exercise['config']);
            $this->assertSame(['08:00', '17:30', '21:00'][$index], $exercise['config']['context_text']);
            $this->assertSame(['seleccion' => [$answer]], Actividad::findOrFail($exercise['id'])->solucion_actividad);
            $this->assertEqualsCanonicalizing(['Alli puncha', 'Alli chishi', 'Alli tuta'], array_column($exercise['elements'], 'texto'));
            $this->get('/api/media/'.$exercise['config']['prompt_image'])->assertOk()->assertHeader('Content-Type', 'image/webp');
        }
        $this->assertCount(3, array_unique(array_column(array_column($data, 'config'), 'prompt_image')));
        $this->getJson('/api/units/'.$unit->id_unidad.'/exercises')->assertOk()->assertJsonPath('total', 3);
        $this->getJson('/api/progress')->assertOk()->assertJsonPath('0.total_activities', 7);
        $first = Unidad::findOrFail(Tema::where('clave_leccion', UnidadUnoGuiadaSeeder::LESSON_KEY)->value('id_unidad'));
        $this->getJson('/api/units/'.$first->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 4);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/admin/overview')->assertOk()->assertJsonPath('exercises', 7)->assertJsonPath('contents', 2);
        $adminExercise = $this->getJson('/api/admin/exercises/'.$data[0]['id'])->assertOk()->json();
        $this->patchJson('/api/admin/exercises/'.$data[0]['id'], $adminExercise)->assertOk();
        $this->patchJson('/api/admin/units/'.$unit->id_unidad, ['module_id' => $unit->id_modulo, 'title' => $unit->titulo_unidad,
            'description' => $unit->objetivo_unidad, 'config' => $unit->configuracion, 'published' => true])
            ->assertOk()->assertJsonPath('config.guided_lesson', 'greetings');
    }

    public function test_each_new_attempt_scores_and_rewards_again_and_seeding_preserves_answers(): void
    {
        $unit = $this->unit();
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $exercises = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get();
        foreach ([30, 60] as $total) {
            $session = (string) Str::uuid();
            $ids = [];
            foreach ($exercises as $index => $exercise) {
                $url = '/api/exercises/'.$exercise->id_actividad.'/answer';
                if ($index === 0) {
                    $this->postJson($url, ['answer' => ['seleccion' => ['tuta']], 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])
                        ->assertOk()->assertJsonPath('is_correct', false)->assertJsonPath('xp_earned', 0)->assertJsonPath('xp_attempt', 0);
                }
                $payload = ['answer' => $exercise->solucion_actividad, 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()];
                $result = $this->postJson($url, $payload)->assertOk()->assertJsonPath('is_correct', true)->assertJsonPath('xp_earned', 10)->json();
                $ids[] = $result['response_id'];
                $this->postJson($url, $payload)->assertOk()->assertExactJson($result);
                $this->postJson($url, ['answer' => ['seleccion' => [$index === 2 ? 'puncha' : 'tuta']], 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])->assertConflict();
            }
            $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => $ids, 'practice_attempt_id' => $session])
                ->assertOk()->assertJsonPath('score', 20)->assertJsonPath('max_score', 20)->assertJsonPath('correct_count', 3)
                ->assertJsonPath('total_items', 3)->assertJsonPath('passed', true)->assertJsonPath('xp_earned', 30)->assertJsonPath('xp_total', $total);
        }
        $this->seed(UnidadDosGuiadaSeeder::class);
        $this->assertSame($exercises->pluck('id_actividad')->all(), Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->pluck('id_actividad')->all());
        $this->assertDatabaseCount('respuestas_actividad', 8);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 60)->assertJsonPath('completed_units.0', $unit->id_unidad);
        $this->getJson('/api/progress')->assertOk()->assertJsonPath('0.total_activities', 7)->assertJsonPath('0.completed_activities', 3);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/admin/learning-results/'.$student->id_usuario)->assertOk()->assertJsonPath('xp', 60);
    }

    public function test_score_uses_saved_answers_and_rejects_incomplete_or_foreign_attempts(): void
    {
        $unit = $this->unit();
        Sanctum::actingAs(Usuario::factory()->create());
        $session = (string) Str::uuid();
        $ids = [];
        foreach (Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get() as $index => $exercise) {
            $ids[] = $this->postJson('/api/exercises/'.$exercise->id_actividad.'/answer', [
                'answer' => $index === 2 ? ['seleccion' => ['puncha']] : $exercise->solucion_actividad,
                'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid(),
            ])->assertOk()->json('response_id');
        }
        $url = '/api/units/'.$unit->id_unidad.'/guided/result';
        $payload = ['response_ids' => $ids, 'practice_attempt_id' => $session, 'score' => 20];
        $this->postJson($url, $payload)->assertOk()->assertJsonPath('score', 13)->assertJsonPath('correct_count', 2)
            ->assertJsonPath('total_items', 3)->assertJsonPath('passed', false)->assertJsonPath('xp_earned', 20);
        $this->postJson($url, ['response_ids' => array_slice($ids, 0, 2), 'practice_attempt_id' => $session])->assertUnprocessable();
        $this->postJson($url, array_replace($payload, ['practice_attempt_id' => (string) Str::uuid()]))->assertUnprocessable();
        Sanctum::actingAs(Usuario::factory()->create());
        $this->postJson($url, $payload)->assertUnprocessable();
    }

    public function test_visual_update_versions_used_questions_preserving_order_progress_and_rewards(): void
    {
        $unit = $this->unit();
        $exercise = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->firstOrFail();
        $config = $exercise->configuracion;
        unset($config['context_text']);
        $exercise->update(['configuracion' => $config]);
        Sanctum::actingAs(Usuario::factory()->create());
        $response = $this->postJson('/api/exercises/'.$exercise->id_actividad.'/answer', ['answer' => $exercise->solucion_actividad])
            ->assertOk()->assertJsonPath('xp_earned', 10)->json('response_id');

        $this->seed(UnidadDosGuiadaSeeder::class);

        $data = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 3)
            ->assertJsonPath('completed_count', 1)->assertJsonPath('exercises.0.completed', true)->assertJsonPath('exercises.0.config.context_text', '08:00')->json();
        $this->assertNotSame($exercise->id_actividad, $data['exercises'][0]['id']);
        $this->assertDatabaseHas('respuestas_actividad', ['id_respuesta_actividad' => $response, 'id_actividad' => $exercise->id_actividad]);
        $this->assertDatabaseHas('actividades', ['id_actividad' => $exercise->id_actividad, 'publicado' => false]);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 10);
        $this->seed(UnidadDosGuiadaSeeder::class);
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertExactJson($data);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/admin/overview')->assertOk()->assertJsonPath('exercises', 7);
    }
}
