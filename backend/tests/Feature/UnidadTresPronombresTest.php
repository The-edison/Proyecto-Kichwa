<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\Unidad;
use App\Models\Usuario;
use App\Services\KichwaResource;
use Database\Seeders\UnidadesTematicasGuiadasSeeder;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class UnidadTresPronombresTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_six_exercises_with_three_rows_are_published_in_the_required_order(): void
    {
        $this->seed(UnidadesTematicasGuiadasSeeder::class);
        $unit = Unidad::where('configuracion->guided_lesson', 'pronouns')->firstOrFail();
        Sanctum::actingAs(Usuario::factory()->create());

        $exercises = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 6)->json('exercises');
        $this->assertSame(['persons', 'groups', 'listening', 'complete', 'order', 'listening-pronouns'], array_column(array_column($exercises, 'config'), 'pronouns_activity'));
        $this->assertSame(['Yo', 'Tú', 'Él'], array_column($exercises[0]['elements'], 'texto'));
        $this->assertSame(['Nosotros', 'Ustedes', 'Ellos'], array_column($exercises[1]['elements'], 'texto'));
        $paths = [];
        foreach ($exercises as $index => $exercise) {
            $this->assertArrayNotHasKey('solution', $exercise);
            $this->assertArrayNotHasKey('correct_feedback', $exercise['config']);
            $this->assertSame('completar', $exercise['type']);
            $this->assertCount(3, $exercise['elements']);
            foreach ($exercise['elements'] as $element) {
                if (isset($element['imagen'])) {
                    $paths[] = $element['imagen'];
                }
            }
        }
        $this->assertCount(1, array_unique($paths));
        $this->get('/api/media/'.$paths[0])->assertOk()->assertHeader('Content-Type', 'image/webp');
        $this->assertSame(3, Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', false)->count());
    }

    public function test_wrong_answers_can_be_corrected_and_six_exercises_score_and_survive_reseeding(): void
    {
        $this->seed(UnidadesTematicasGuiadasSeeder::class);
        $unit = Unidad::where('configuracion->guided_lesson', 'pronouns')->firstOrFail();
        Sanctum::actingAs(Usuario::factory()->create());
        $exercises = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get();
        $wrong = ['textos' => ['yo' => 'Kan', 'tu' => 'Ñuka', 'el' => 'Pay']];
        $session = (string) Str::uuid();
        $this->postJson('/api/exercises/'.$exercises[0]->id_actividad.'/answer', ['answer' => $wrong,
            'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])->assertOk()->assertJsonPath('is_correct', false);
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => []])->assertUnprocessable();
        $responses = [];
        foreach ($exercises as $exercise) {
            $answer = ['textos' => array_map(fn (array $variants): string => $variants[0], $exercise->solucion_actividad['textos'])];
            $responses[] = $this->postJson('/api/exercises/'.$exercise->id_actividad.'/answer', ['answer' => $answer,
                'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])->assertOk()->assertJsonPath('is_correct', true)->json('response_id');
        }
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => $responses, 'practice_attempt_id' => $session])
            ->assertOk()->assertJsonPath('score', 6)->assertJsonPath('max_score', 6)->assertJsonPath('xp_earned', 60)->assertJsonPath('passed', true);

        $this->seed(UnidadesTematicasGuiadasSeeder::class);

        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 6)->assertJsonPath('completed_count', 6);
        $this->assertSame($exercises->modelKeys(), Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->pluck('id_actividad')->all());

    }

    public function test_admin_can_save_word_order_exercise_but_cannot_publish_a_solution_that_omits_a_tile(): void
    {
        $this->seed(UnidadesTematicasGuiadasSeeder::class);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $exercise = Actividad::where('configuracion->pronouns_activity', 'order')->firstOrFail();
        $data = KichwaResource::present('exercises', $exercise, true);

        $this->patchJson('/api/admin/exercises/'.$exercise->id_actividad, $data)
            ->assertOk()->assertJsonPath('config.pronouns_activity', 'order');
        $data['solution']['textos']['comer'] = ['Ñuka'];
        $this->patchJson('/api/admin/exercises/'.$exercise->id_actividad, $data)->assertUnprocessable();

        $this->assertSame(['Ñuka mikuni'], $exercise->fresh()->solucion_actividad['textos']['comer']);
    }
}
