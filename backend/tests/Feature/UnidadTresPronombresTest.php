<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\Unidad;
use App\Models\Usuario;
use Database\Seeders\UnidadesTematicasGuiadasSeeder;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class UnidadTresPronombresTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_six_pronouns_and_four_private_images_are_published_in_the_required_order(): void
    {
        $this->seed(UnidadesTematicasGuiadasSeeder::class);
        $unit = Unidad::where('configuracion->guided_lesson', 'pronouns')->firstOrFail();
        Sanctum::actingAs(Usuario::factory()->create());

        $exercises = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 5)->json('exercises');

        $this->assertSame('relacionar', $exercises[0]['type']);
        $this->assertSame('Una persona o un grupo', $exercises[0]['config']['title']);
        $this->assertCount(12, $exercises[0]['elements']);
        $matching = Actividad::findOrFail($exercises[0]['id']);
        $this->assertCount(6, $matching->solucion_actividad['pares']);
        $this->assertSame(['Yo', 'Tú', 'Él / ella', 'Nosotros', 'Ustedes', 'Ellos / ellas'], array_column(array_slice($exercises[0]['elements'], 0, 6), 'texto'));
        $paths = [];
        foreach ($exercises as $index => $exercise) {
            $this->assertArrayNotHasKey('solution', $exercise);
            $this->assertArrayNotHasKey('correct_feedback', $exercise['config']);
            if ($index === 0) {
                continue;
            }
            $this->assertSame('seleccion_multiple', $exercise['type']);
            $this->assertCount(4, $exercise['elements']);
            $record = Actividad::findOrFail($exercise['id']);
            $this->assertSame(['seleccion' => [['nuka', 'kan', 'nukanchik', 'paykuna'][$index - 1]]], $record->solucion_actividad);
            $this->assertNotEmpty($exercise['config']['context_text']);
            $paths[] = $exercise['config']['prompt_image'];
            $image = $this->get('/api/media/'.$exercise['config']['prompt_image'])->assertOk()->assertHeader('Content-Type', 'image/webp');
            $this->assertLessThan(160000, strlen($image->getContent()));
        }
        $this->assertCount(4, array_unique($paths));
        $this->assertSame(3, Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', false)->count());
    }

    public function test_wrong_pairs_can_be_corrected_and_the_five_exercises_score_and_survive_reseeding(): void
    {
        $this->seed(UnidadesTematicasGuiadasSeeder::class);
        $unit = Unidad::where('configuracion->guided_lesson', 'pronouns')->firstOrFail();
        Sanctum::actingAs(Usuario::factory()->create());
        $exercises = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get();
        $wrong = $exercises[0]->solucion_actividad;
        [$wrong['pares'][0]['destino'], $wrong['pares'][1]['destino']] = [$wrong['pares'][1]['destino'], $wrong['pares'][0]['destino']];
        $session = (string) Str::uuid();
        $this->postJson('/api/exercises/'.$exercises[0]->id_actividad.'/answer', ['answer' => $wrong,
            'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])->assertOk()->assertJsonPath('is_correct', false);
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => []])->assertUnprocessable();
        $responses = [];
        foreach ($exercises as $exercise) {
            $responses[] = $this->postJson('/api/exercises/'.$exercise->id_actividad.'/answer', ['answer' => $exercise->solucion_actividad,
                'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])->assertOk()->assertJsonPath('is_correct', true)->json('response_id');
        }
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => $responses, 'practice_attempt_id' => $session])
            ->assertOk()->assertJsonPath('score', 5)->assertJsonPath('max_score', 5)->assertJsonPath('xp_earned', 50)->assertJsonPath('passed', true);

        $this->seed(UnidadesTematicasGuiadasSeeder::class);

        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 5)->assertJsonPath('completed_count', 5);
        $this->assertSame($exercises->modelKeys(), Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->pluck('id_actividad')->all());

    }
}
