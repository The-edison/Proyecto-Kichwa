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
            $exercises = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', [5, 7, 7][$index])->json('exercises');
            foreach ($exercises as $exercise) {
                $this->assertArrayNotHasKey('solution', $exercise);
                $this->assertArrayNotHasKey('correct_feedback', $exercise['config']);
                $activity = Actividad::findOrFail($exercise['id']);
                $ids[] = $activity->id_actividad;
                $responseIds[$unit->id_unidad][] = $this->postJson('/api/exercises/'.$activity->id_actividad.'/answer', [
                    'answer' => $activity->solucion_actividad, 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid(),
                ])->assertOk()->assertJsonPath('is_correct', true)->json('response_id');
            }
            $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => $responseIds[$unit->id_unidad], 'practice_attempt_id' => $session])
                ->assertOk()->assertJsonPath('score', [5, 7, 7][$index])->assertJsonPath('passed', true)
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
