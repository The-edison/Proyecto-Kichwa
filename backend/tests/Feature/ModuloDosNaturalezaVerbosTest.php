<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\Unidad;
use App\Models\Usuario;
use Database\Seeders\ModuloDosNaturalezaVerbosSeeder;
use Database\Seeders\UnidadesTematicasGuiadasSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class ModuloDosNaturalezaVerbosTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_units_have_five_varied_exercises_without_answer_images(): void
    {
        $this->seed(UnidadesTematicasGuiadasSeeder::class);
        $units = Unidad::whereIn('configuracion->guided_lesson', ['nature', 'verbs'])->orderBy('orden_unidad')->get();
        $this->assertCount(2, $units);
        $originals = $units->mapWithKeys(fn (Unidad $unit): array => [$unit->id_unidad => Actividad::where('id_unidad', $unit->id_unidad)
            ->where('publicado', true)->orderBy('orden_actividad')->pluck('id_actividad')->all()]);

        $this->seed(ModuloDosNaturalezaVerbosSeeder::class);
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        foreach ($units as $unit) {
            $lesson = $unit->configuracion['guided_lesson'];
            $activities = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get();
            $this->assertCount(5, $activities);
            $this->assertSame($originals[$unit->id_unidad][0], $activities->first()->id_actividad);
            $this->assertSame(
                $lesson === 'nature'
                    ? ['relacionar', 'seleccion_multiple', 'completar', 'ordenar', 'seleccion_multiple']
                    : ['relacionar', 'completar', 'ordenar', 'seleccion_multiple', 'seleccion_multiple'],
                $activities->pluck('tipo_actividad')->all()
            );
            $this->assertTrue($activities->skip(1)->every(fn (Actividad $activity): bool => $activity->configuracion['topic_practice'] === true));
            $this->assertSame(0, Actividad::whereIn('id_actividad', array_slice($originals[$unit->id_unidad], 1))->where('publicado', true)->count());
            $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()
                ->assertJsonPath('total', 5)->assertDontSee('solution')->assertDontSee('imagen');
            foreach ($activities->skip(1) as $activity) {
                $answer = $activity->solucion_actividad;
                if ($activity->tipo_actividad === 'completar') {
                    $answer['textos'] = array_map(fn (array $variants): string => $variants[0], $answer['textos']);
                }
                $this->postJson('/api/exercises/'.$activity->id_actividad.'/answer', ['answer' => $answer])
                    ->assertOk()->assertJsonPath('is_correct', true);
            }
        }

        $this->seed(ModuloDosNaturalezaVerbosSeeder::class);
        foreach ($units as $unit) {
            $this->assertSame(5, Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->count());
        }
    }
}
