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

class ModuloDosColoresTest extends TestCase
{
    use UsesPostgreSQL;

    private function unit(): Unidad
    {
        $this->seed(UnidadesTematicasGuiadasSeeder::class);

        return Unidad::where('configuracion->guided_lesson', 'animals-colors')->firstOrFail();
    }

    public function test_seven_color_exercises_follow_the_eight_animal_exercises_and_skip_the_context_activity(): void
    {
        $unit = $this->unit();
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertUnauthorized();
        Sanctum::actingAs(Usuario::factory()->create());

        $data = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 15)
            ->assertDontSee('solution')->assertDontSee('correct_feedback')->json('exercises');

        $this->assertCount(8, array_filter($data, fn (array $exercise): bool => isset($exercise['config']['animal_activity'])));
        $colors = array_slice($data, 8);
        $this->assertSame(['apply', 'listen', 'understand', 'interpret', 'meaning', 'complete', 'order'], array_column(array_column($colors, 'config'), 'color_activity'));
        $this->assertSame([1, 1, 2, 3, 4, 4, 5], array_column(array_column($colors, 'config'), 'color_panel'));
        $this->assertSame([3, 3, 3, 6, 3, 3, 3], array_map(fn (array $exercise): int => count($exercise['elements']), $colors));
        $this->assertSame('puka', $colors[0]['elements'][0]['opciones'][2]);
        $this->assertSame('Ñuka muchikuka _____ kan', $colors[5]['elements'][0]['texto']);
        $ids = array_column($data, 'id');
        $this->seed(UnidadesTematicasGuiadasSeeder::class);
        $this->assertSame($ids, Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->pluck('id_actividad')->all());
    }

    public function test_colors_are_graded_per_row_and_all_fifteen_exercises_complete_the_unit_for_student_and_admin(): void
    {
        $unit = $this->unit();
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $activities = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get();
        $painting = $activities[8];
        $this->postJson('/api/exercises/'.$painting->id_actividad.'/answer', ['answer' => ['textos' => ['c-cup' => 'waylla', 'c-notebook' => 'killu', 'c-bag' => 'ankas']]])
            ->assertOk()->assertJsonPath('is_correct', false)->assertJsonPath('item_results.c-cup', false)
            ->assertJsonPath('item_results.c-notebook', true)->assertJsonPath('item_results.c-bag', true)->assertJsonPath('xp_earned', 0);
        $this->postJson('/api/exercises/'.$painting->id_actividad.'/answer', ['answer' => ['textos' => ['c-cup' => 'inventado', 'c-notebook' => 'killu', 'c-bag' => 'ankas']]])->assertUnprocessable();
        $writing = $activities[13];
        $this->postJson('/api/exercises/'.$writing->id_actividad.'/answer', ['answer' => ['textos' => ['c-hat' => 'yurakmi', 'c-pants' => 'yanami', 'c-shawl' => 'puka']]])
            ->assertOk()->assertJsonPath('is_correct', false)->assertJsonPath('item_results.c-shawl', false);
        $this->assertDatabaseCount('respuestas_actividad', 2);
        $session = (string) Str::uuid();
        $responses = [];
        foreach ($activities as $activity) {
            $responses[] = $this->postJson('/api/exercises/'.$activity->id_actividad.'/answer', ['answer' => ['textos' => array_map(fn ($variants) => $variants[0], $activity->solucion_actividad['textos'])],
                'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])->assertOk()->assertJsonPath('is_correct', true)->assertJsonPath('xp_earned', 10)->json('response_id');
        }

        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => $responses, 'practice_attempt_id' => $session])
            ->assertOk()->assertJsonPath('score', 15)->assertJsonPath('max_score', 15)->assertJsonPath('xp_earned', 150)->assertJsonPath('passed', true);

        $mastery = $this->getJson('/api/mastery')->assertOk()->json();
        $this->assertContains($unit->id_unidad, $mastery['completed_units']);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/admin/learning-results/'.$student->id_usuario)->assertOk()->assertExactJson($mastery);
    }

    public function test_admin_edits_keep_color_rows_palettes_panels_and_ordered_words_valid(): void
    {
        $unit = $this->unit();
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $painting = Actividad::where('id_unidad', $unit->id_unidad)->where('configuracion->color_activity', 'apply')->firstOrFail();
        $data = KichwaResource::present('exercises', $painting, true);
        $this->patchJson('/api/admin/exercises/'.$painting->id_actividad, $data)->assertOk()->assertJsonPath('config.color_activity', 'apply');
        $data['elements'][0]['opciones'][] = 'inventado';
        $this->patchJson('/api/admin/exercises/'.$painting->id_actividad, $data)->assertUnprocessable()->assertJsonValidationErrors('elements');
        $data = KichwaResource::present('exercises', $painting->fresh(), true);
        $data['config']['color_panel'] = 2;
        $this->patchJson('/api/admin/exercises/'.$painting->id_actividad, $data)->assertUnprocessable()->assertJsonValidationErrors('config');
        $order = Actividad::where('id_unidad', $unit->id_unidad)->where('configuracion->color_activity', 'order')->firstOrFail();
        $data = KichwaResource::present('exercises', $order, true);
        $data['solution']['textos']['c-cat'] = ['Ñuka misika kan'];
        $this->patchJson('/api/admin/exercises/'.$order->id_actividad, $data)->assertUnprocessable();
        $this->assertSame(['Ñuka misika yanami kan'], $order->fresh()->solucion_actividad['textos']['c-cat']);
        $this->assertDatabaseCount('respuestas_actividad', 0);
    }
}
