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

class UnidadesTematicasGuiadasTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_three_lessons_are_published_and_reseeding_preserves_activities_and_answers(): void
    {
        $this->seed(UnidadesTematicasGuiadasSeeder::class);
        Sanctum::actingAs(Usuario::factory()->create());
        $units = Unidad::whereIn('configuracion->guided_lesson', ['pronouns', 'numbers', 'calendar'])->orderBy('orden_unidad')->get();
        $this->assertCount(3, $units);
        $ids = [];
        $responseIds = [];
        $session = (string) Str::uuid();
        foreach ($units as $index => $unit) {
            $this->getJson('/api/units/'.$unit->id_unidad)->assertOk()->assertJsonPath('sort_order', $index + 3)
                ->assertJsonPath('config.guided_lesson', ['pronouns', 'numbers', 'calendar'][$index]);
            $this->getJson('/api/units/'.$unit->id_unidad.'/contents')->assertOk()->assertJsonPath('data.0.title', ['Pronombres personales', 'Números y cantidades', 'Días, meses y calendario'][$index]);
            $exercises = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', [6, 7, 6][$index])->json('exercises');
            if ($index === 1) {
                $this->assertSame(['relacionar', 'completar', 'relacionar', 'completar', 'ordenar', 'completar', 'completar'], array_column($exercises, 'type'));
                $this->assertSame(['small', 'count', 'large', 'sentences'], array_map(fn (array $exercise): string => $exercise['config']['numbers_activity'], array_slice($exercises, 0, 4)));
                $this->assertSame(['tiles', 'choice', 'writing'], array_map(fn (array $exercise): string => $exercise['config']['interactive_activity'], array_slice($exercises, 4)));
                $this->assertCount(10, array_filter($exercises[0]['elements'], fn (array $element): bool => ($element['grupo'] ?? '') === 'origen'));
                $this->assertCount(6, $exercises[1]['elements']);
                $this->assertSame(['leaves', 'women', 'bulls', 'children', 'plants', 'cows'], array_column($exercises[1]['elements'], 'id'));
                $this->assertCount(4, $exercises[3]['elements']);
                $this->assertSame('Ñuka _____ mishkita mikuni · Yo como un dulce', $exercises[3]['elements'][0]['texto']);
                $this->assertSame('_____ wawakuna pukllankuna · Cinco niños juegan', $exercises[5]['elements'][0]['texto']);
            }
            if ($index === 2) {
                $this->assertSame(['ordenar', 'ordenar', 'completar', 'completar', 'completar', 'completar'], array_column($exercises, 'type'));
                $this->assertSame(['tiles', 'tiles', 'choice', 'choice', 'writing', 'writing'], array_map(fn (array $exercise): string => $exercise['config']['interactive_activity'], $exercises));
                $this->assertSame('En enero me iré a casa', $exercises[0]['config']['context_meaning']);
                $this->assertSame('_____ punchami sawarikrin · El domingo se va a casar', $exercises[2]['elements'][0]['texto']);
                $this->assertSame('_____ Raymi pachapika ñuka turiwan tushunaman risha · En la época de la siembra me iré a bailar con mi hermano', $exercises[5]['elements'][0]['texto']);
            }
            foreach ($exercises as $exercise) {
                $this->assertArrayNotHasKey('solution', $exercise);
                $this->assertArrayNotHasKey('correct_feedback', $exercise['config']);
                $activity = Actividad::findOrFail($exercise['id']);
                $ids[] = $activity->id_actividad;
                $answer = $activity->solucion_actividad;
                if ($activity->tipo_actividad === 'completar') {
                    $answer['textos'] = array_map(fn (array $variants): string => $variants[0], $answer['textos']);
                }
                $responseIds[$unit->id_unidad][] = $this->postJson('/api/exercises/'.$activity->id_actividad.'/answer', [
                    'answer' => $answer, 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid(),
                ])->assertOk()->assertJsonPath('is_correct', true)->json('response_id');
            }
            $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => $responseIds[$unit->id_unidad], 'practice_attempt_id' => $session])
                ->assertOk()->assertJsonPath('score', [6, 7, 6][$index])->assertJsonPath('passed', true)
                ->assertJsonPath('next_unit_id', $units->get($index + 1)?->id_unidad);
        }

        $this->seed(UnidadesTematicasGuiadasSeeder::class);

        $this->assertSame($ids, Actividad::whereIn('id_unidad', $units->pluck('id_unidad'))->where('publicado', true)->orderBy('id_unidad')->orderBy('orden_actividad')->pluck('id_actividad')->all());
        foreach ($units as $unit) {
            $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('completed_count', count($responseIds[$unit->id_unidad]));
        }
    }

    public function test_administrators_can_save_all_three_new_lesson_modes(): void
    {
        $this->seed(UnidadesTematicasGuiadasSeeder::class);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $units = Unidad::whereIn('configuracion->guided_lesson', ['pronouns', 'numbers', 'calendar'])->get();

        foreach ($units as $unit) {
            $this->patchJson('/api/admin/units/'.$unit->id_unidad, ['module_id' => $unit->id_modulo, 'title' => $unit->titulo_unidad,
                'description' => $unit->objetivo_unidad, 'config' => $unit->configuracion, 'published' => true])
                ->assertOk()->assertJsonPath('config.guided_lesson', $unit->configuracion['guided_lesson']);
            $this->assertSame($unit->configuracion, $unit->fresh()->configuracion);
        }
    }
}
