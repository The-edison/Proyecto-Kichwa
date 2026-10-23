<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\RespuestaActividad;
use App\Models\Unidad;
use App\Models\Usuario;
use App\Services\KichwaResource;
use Database\Seeders\ModuloDosAnimalesSeeder;
use Database\Seeders\UnidadesTematicasGuiadasSeeder;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class ModuloDosAnimalesTest extends TestCase
{
    use UsesPostgreSQL;

    private function unit(): Unidad
    {
        $this->seed(UnidadesTematicasGuiadasSeeder::class);

        return Unidad::where('configuracion->guided_lesson', 'animals-colors')->firstOrFail();
    }

    public function test_eight_illustrated_panels_include_a_combined_sentence_panel_and_no_writing_panel(): void
    {
        $unit = $this->unit();
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertUnauthorized();
        Sanctum::actingAs(Usuario::factory()->create());
        $data = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 15)->assertDontSee('solution')->assertDontSee('correct_feedback')->json('exercises');
        $data = array_values(array_filter($data, fn (array $exercise): bool => isset($exercise['config']['animal_activity'])));
        $this->assertSame(['identify', 'listen', 'understand-complete', 'order', 'identify', 'listen', 'labels', 'order'], array_column(array_column($data, 'config'), 'animal_activity'));
        $this->assertSame(['domestic', 'domestic', 'domestic', 'domestic', 'wild', 'wild', 'wild', 'wild'], array_column(array_column($data, 'config'), 'animal_group'));
        $this->assertSame([6, 4, 6, 3, 6, 3, 3, 3], array_map(fn (array $exercise): int => count($exercise['elements']), $data));
        $paths = collect($data)->flatMap(fn ($exercise) => array_column($exercise['elements'], 'imagen'))->unique();
        $this->assertCount(2, $paths);
        foreach ($paths as $path) {
            $this->get('/api/media/'.$path)->assertOk()->assertHeader('Content-Type', 'image/webp');
        }
    }

    public function test_meanings_and_missing_words_are_graded_independently_and_progress_includes_the_color_panels(): void
    {
        $unit = $this->unit();
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $exercises = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get();
        $session = (string) Str::uuid();
        $first = $exercises[0];
        $answer = ['textos' => array_map(fn ($variants) => $variants[0], $first->solucion_actividad['textos'])];
        $answer['textos']['d-dog'] = 'Misi';
        $payload = ['answer' => $answer, 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()];
        $wrong = $this->postJson('/api/exercises/'.$first->id_actividad.'/answer', $payload)->assertOk()->assertJsonPath('is_correct', false)
            ->assertJsonPath('xp_earned', 0)->assertJsonPath('item_results.d-dog', false)->assertJsonPath('item_results.d-cat', true)->json();
        $this->postJson('/api/exercises/'.$first->id_actividad.'/answer', $payload)->assertOk()->assertExactJson($wrong);
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => []])->assertUnprocessable();
        $merged = $exercises[2];
        $answer = ['textos' => array_map(fn ($variants) => $variants[0], $merged->solucion_actividad['textos'])];
        $answer['textos']['d-mama'] = 'misita';
        $this->postJson('/api/exercises/'.$merged->id_actividad.'/answer', ['answer' => $answer, 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])
            ->assertOk()->assertJsonPath('is_correct', false)->assertJsonPath('xp_earned', 0)
            ->assertJsonPath('item_results.d-sentence-1', true)->assertJsonPath('item_results.d-mama', false);
        unset($answer['textos']['d-jose']);
        $this->postJson('/api/exercises/'.$merged->id_actividad.'/answer', ['answer' => $answer])->assertUnprocessable();
        $this->assertDatabaseCount('respuestas_actividad', 2);
        $responses = [];
        foreach ($exercises as $exercise) {
            $answer = ['textos' => array_map(fn ($variants) => $variants[0], $exercise->solucion_actividad['textos'])];
            $responses[] = $this->postJson('/api/exercises/'.$exercise->id_actividad.'/answer', ['answer' => $answer,
                'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])->assertOk()->assertJsonPath('is_correct', true)->assertJsonPath('xp_earned', 10)->json('response_id');
        }
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => $responses, 'practice_attempt_id' => $session])
            ->assertOk()->assertJsonPath('score', 15)->assertJsonPath('max_score', 15)->assertJsonPath('passed', true)->assertJsonPath('xp_earned', 150);
        $mastery = $this->getJson('/api/mastery')->assertOk()->json();
        $this->assertContains($unit->id_unidad, $mastery['completed_units']);
        $ids = $exercises->modelKeys();
        $this->seed(UnidadesTematicasGuiadasSeeder::class);
        $this->assertSame($ids, Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->pluck('id_actividad')->all());
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('completed_count', 15);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/admin/learning-results/'.$student->id_usuario)->assertOk()->assertExactJson($mastery);
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('completed_count', 0);
    }

    public function test_admin_can_edit_panels_but_cannot_remove_order_words_or_mix_the_wrong_panel_shape(): void
    {
        $unit = $this->unit();
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $exercise = Actividad::where('id_unidad', $unit->id_unidad)->where('configuracion->animal_activity', 'order')->firstOrFail();
        $data = KichwaResource::present('exercises', $exercise, true);
        $this->patchJson('/api/admin/exercises/'.$exercise->id_actividad, $data)->assertOk()->assertJsonPath('config.animal_activity', 'order');
        $data['solution']['textos']['d-mama'] = ['Ñuka mamaka charin'];
        $this->patchJson('/api/admin/exercises/'.$exercise->id_actividad, $data)->assertUnprocessable();
        $data = KichwaResource::present('exercises', $exercise->fresh(), true);
        $data['config']['animal_activity'] = 'identify';
        $this->patchJson('/api/admin/exercises/'.$exercise->id_actividad, $data)->assertUnprocessable();
        $merged = Actividad::where('id_unidad', $unit->id_unidad)->where('configuracion->animal_activity', 'understand-complete')->firstOrFail();
        $combinedData = KichwaResource::present('exercises', $merged, true);
        $this->patchJson('/api/admin/exercises/'.$merged->id_actividad, $combinedData)->assertOk()->assertJsonPath('config.animal_activity', 'understand-complete');
        $combinedData['elements'][1]['texto'] = 'Sin palabra que falta';
        $this->patchJson('/api/admin/exercises/'.$merged->id_actividad, $combinedData)->assertUnprocessable()->assertJsonValidationErrors('elements');
        $combinedData = KichwaResource::present('exercises', $merged->fresh(), true);
        [$combinedData['elements'][1], $combinedData['elements'][3]] = [$combinedData['elements'][3], $combinedData['elements'][1]];
        $this->patchJson('/api/admin/exercises/'.$merged->id_actividad, $combinedData)->assertUnprocessable()->assertJsonValidationErrors('elements');
        Sanctum::actingAs(Usuario::factory()->create());
        $this->postJson('/api/exercises/'.$exercise->id_actividad.'/answer', ['answer' => ['textos' => ['d-mama' => 'Ñuka']]])->assertUnprocessable();
        $this->assertDatabaseCount('respuestas_actividad', 0);
        $this->assertSame(['Ñuka mamaka shuk allkutami charin'], $exercise->fresh()->solucion_actividad['textos']['d-mama']);
    }

    public function test_upgrading_the_two_old_sentence_panels_preserves_responses_and_all_other_panels(): void
    {
        $unit = $this->unit();
        $merged = Actividad::where('id_unidad', $unit->id_unidad)->where('configuracion->animal_activity', 'understand-complete')->firstOrFail();
        $data = KichwaResource::present('exercises', $merged, true);
        $merged->delete();
        $retainedIds = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->pluck('id_actividad')->all();
        $records = [Actividad::findOrFail($retainedIds[0])];
        $order = (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
        foreach (['understand', 'complete'] as $index => $activity) {
            $legacy = $data;
            $legacy['config']['animal_activity'] = $activity;
            $legacy['elements'] = array_values(array_filter($legacy['elements'], fn (int $position): bool => $position % 2 === $index, ARRAY_FILTER_USE_KEY));
            $legacy['solution']['textos'] = array_intersect_key($legacy['solution']['textos'], array_flip(array_column($legacy['elements'], 'id')));
            $record = new Actividad(KichwaResource::attributes('exercises', $legacy));
            $record->id_unidad = $unit->id_unidad;
            $record->origen_reactivo = 'm2-u1-domestic-'.$activity.'-v1';
            $record->orden_actividad = ++$order;
            $record->publicado = true;
            $record->save();
            $records[] = $record;
        }
        Sanctum::actingAs(Usuario::factory()->create());
        foreach ($records as $record) {
            $this->postJson('/api/exercises/'.$record->id_actividad.'/answer', ['answer' => ['textos' => array_map(fn ($variants) => $variants[0], $record->solucion_actividad['textos'])]])
                ->assertOk()->assertJsonPath('is_correct', true);
        }
        $responseIds = RespuestaActividad::orderBy('id_respuesta_actividad')->pluck('id_respuesta_actividad')->all();

        $this->seed(ModuloDosAnimalesSeeder::class);

        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 15)->assertJsonPath('completed_count', 1)
            ->assertJsonPath('exercises.2.config.animal_activity', 'understand-complete');
        $this->assertSame($retainedIds, Actividad::whereIn('id_actividad', $retainedIds)->where('publicado', true)->orderBy('orden_actividad')->pluck('id_actividad')->all());
        $this->assertFalse($records[1]->fresh()->publicado);
        $this->assertFalse($records[2]->fresh()->publicado);
        $this->assertSame($responseIds, RespuestaActividad::orderBy('id_respuesta_actividad')->pluck('id_respuesta_actividad')->all());
        $ids = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->pluck('id_actividad')->all();
        $this->seed(ModuloDosAnimalesSeeder::class);
        $this->assertSame($ids, Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->pluck('id_actividad')->all());
    }

    public function test_retiring_an_existing_writing_panel_preserves_history_and_the_remaining_progress(): void
    {
        $unit = $this->unit();
        $retained = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get();
        $data = KichwaResource::present('exercises', $retained[5], true);
        $data['config']['animal_activity'] = 'write';
        $data['elements'] = array_map(fn (string $id): array => ['id' => $id, 'texto' => 'Animal', 'opciones' => [], 'imagen' => $data['elements'][0]['imagen']], ['w-frog', 'w-butterfly', 'w-hummingbird']);
        $data['solution'] = ['textos' => ['w-frog' => ['hampatu'], 'w-butterfly' => ['pilpintu'], 'w-hummingbird' => ['kinti']]];
        $writing = new Actividad(KichwaResource::attributes('exercises', $data));
        $writing->id_unidad = $unit->id_unidad;
        $writing->origen_reactivo = 'm2-u1-wild-write-v1';
        $writing->orden_actividad = (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad') + 1;
        $writing->publicado = true;
        $writing->save();
        Sanctum::actingAs(Usuario::factory()->create());
        foreach ([$retained[0], $writing] as $exercise) {
            $this->postJson('/api/exercises/'.$exercise->id_actividad.'/answer', ['answer' => ['textos' => array_map(fn ($variants) => $variants[0], $exercise->solucion_actividad['textos'])]])
                ->assertOk()->assertJsonPath('is_correct', true);
        }
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 16)->assertJsonPath('completed_count', 2);

        $this->seed(ModuloDosAnimalesSeeder::class);

        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 15)->assertJsonPath('completed_count', 1);
        $this->assertFalse($writing->fresh()->publicado);
        $this->assertDatabaseCount('respuestas_actividad', 2);
        $this->assertSame($retained->modelKeys(), Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->pluck('id_actividad')->all());
        $this->seed(ModuloDosAnimalesSeeder::class);
        $this->assertFalse($writing->fresh()->publicado);
    }
}
