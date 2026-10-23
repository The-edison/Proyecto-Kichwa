<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\Unidad;
use App\Models\Usuario;
use App\Services\KichwaResource;
use Database\Seeders\ModuloDosCuerpoSeeder;
use Database\Seeders\UnidadesTematicasGuiadasSeeder;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class ModuloDosCuerpoTest extends TestCase
{
    use UsesPostgreSQL;

    private function unit(): Unidad
    {
        $this->seed(UnidadesTematicasGuiadasSeeder::class);

        return Unidad::where('configuracion->guided_lesson', 'body')->firstOrFail();
    }

    public function test_six_body_activities_have_four_panels_all_images_and_no_sentence_completion_activity(): void
    {
        $unit = $this->unit();
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertUnauthorized();
        Sanctum::actingAs(Usuario::factory()->create());

        $data = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 6)
            ->assertDontSee('solution')->assertDontSee('correct_feedback')->json('exercises');

        $this->assertSame(['locate', 'details', 'recognize', 'listen', 'understand', 'order'], array_column(array_column($data, 'config'), 'body_activity'));
        $this->assertSame([1, 2, 2, 3, 3, 4], array_column(array_column($data, 'config'), 'body_panel'));
        $this->assertSame([10, 6, 3, 3, 4, 4], array_map(fn (array $exercise): int => count($exercise['elements']), $data));
        $this->assertSame('Ñukatami umata nanan', $data[4]['elements'][0]['texto']);
        $paths = collect($data)->flatMap(fn (array $exercise): array => array_column($exercise['elements'], 'imagen'))->unique();
        $this->assertCount(2, $paths);
        foreach ($paths as $path) {
            $this->get('/api/media/'.$path)->assertOk()->assertHeader('Content-Type', 'image/webp');
        }
    }

    public function test_independent_row_feedback_corrections_and_all_six_exercises_update_student_and_admin_progress(): void
    {
        $unit = $this->unit();
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $activities = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get();
        $session = (string) Str::uuid();
        $first = $activities[0];
        $answer = ['textos' => array_map(fn ($variants) => $variants[0], $first->solucion_actividad['textos'])];
        $answer['textos']['b-uma'] = 'Maki';
        $payload = ['answer' => $answer, 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()];
        $wrong = $this->postJson('/api/exercises/'.$first->id_actividad.'/answer', $payload)->assertOk()->assertJsonPath('is_correct', false)
            ->assertJsonPath('item_results.b-uma', false)->assertJsonPath('item_results.b-maki', true)->assertJsonPath('xp_earned', 0)->json();
        $this->postJson('/api/exercises/'.$first->id_actividad.'/answer', $payload)->assertOk()->assertExactJson($wrong);
        unset($answer['textos']['b-sillu']);
        $this->postJson('/api/exercises/'.$first->id_actividad.'/answer', ['answer' => $answer])->assertUnprocessable();
        $this->assertDatabaseCount('respuestas_actividad', 1);
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => []])->assertUnprocessable();
        $responses = [];
        foreach ($activities as $activity) {
            $responses[] = $this->postJson('/api/exercises/'.$activity->id_actividad.'/answer', ['answer' => ['textos' => array_map(fn ($variants) => $variants[0], $activity->solucion_actividad['textos'])],
                'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])->assertOk()->assertJsonPath('is_correct', true)->assertJsonPath('xp_earned', 10)->json('response_id');
        }

        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => $responses, 'practice_attempt_id' => $session])
            ->assertOk()->assertJsonPath('score', 6)->assertJsonPath('max_score', 6)->assertJsonPath('passed', true)->assertJsonPath('xp_earned', 60);

        $mastery = $this->getJson('/api/mastery')->assertOk()->json();
        $this->assertContains($unit->id_unidad, $mastery['completed_units']);
        $ids = $activities->modelKeys();
        $this->seed(UnidadesTematicasGuiadasSeeder::class);
        $this->assertSame($ids, Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->pluck('id_actividad')->all());
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('completed_count', 6);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/admin/learning-results/'.$student->id_usuario)->assertOk()->assertExactJson($mastery);
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('completed_count', 0);
    }

    public function test_admin_updates_preserve_required_map_zones_panel_shapes_and_all_order_words(): void
    {
        $unit = $this->unit();
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $map = Actividad::where('id_unidad', $unit->id_unidad)->where('configuracion->body_activity', 'locate')->firstOrFail();
        $data = KichwaResource::present('exercises', $map, true);
        $this->patchJson('/api/admin/exercises/'.$map->id_actividad, $data)->assertOk()->assertJsonPath('config.body_activity', 'locate');
        array_pop($data['elements']);
        $this->patchJson('/api/admin/exercises/'.$map->id_actividad, $data)->assertUnprocessable()->assertJsonValidationErrors('config');
        $data = KichwaResource::present('exercises', $map->fresh(), true);
        $data['config']['body_panel'] = 2;
        $this->patchJson('/api/admin/exercises/'.$map->id_actividad, $data)->assertUnprocessable()->assertJsonValidationErrors('config');
        $order = Actividad::where('id_unidad', $unit->id_unidad)->where('configuracion->body_activity', 'order')->firstOrFail();
        $data = KichwaResource::present('exercises', $order, true);
        $data['solution']['textos']['b-sentence-head'] = ['Ñukatami nanan'];
        $this->patchJson('/api/admin/exercises/'.$order->id_actividad, $data)->assertUnprocessable();
        $this->assertSame(['Ñukatami umata nanan'], $order->fresh()->solucion_actividad['textos']['b-sentence-head']);
        $this->assertDatabaseCount('respuestas_actividad', 0);
    }

    public function test_replacing_the_old_body_practice_preserves_its_history_and_is_idempotent(): void
    {
        $unit = $this->unit();
        Actividad::where('id_unidad', $unit->id_unidad)->whereNotNull('configuracion->body_activity')->delete();
        $legacy = Actividad::where('id_unidad', $unit->id_unidad)->firstOrFail();
        $legacy->update(['publicado' => true]);
        Sanctum::actingAs(Usuario::factory()->create());
        $response = $this->postJson('/api/exercises/'.$legacy->id_actividad.'/answer', ['answer' => $legacy->solucion_actividad])
            ->assertOk()->assertJsonPath('is_correct', true)->json('response_id');

        $this->seed(ModuloDosCuerpoSeeder::class);

        $this->assertFalse($legacy->fresh()->publicado);
        $this->assertDatabaseHas('respuestas_actividad', ['id_respuesta_actividad' => $response, 'id_actividad' => $legacy->id_actividad]);
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 6)->assertJsonPath('completed_count', 0);
        $ids = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->pluck('id_actividad')->all();
        $this->seed(ModuloDosCuerpoSeeder::class);
        $this->assertSame($ids, Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->pluck('id_actividad')->all());
    }
}
