<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\Modulo;
use App\Models\Nivel;
use App\Models\Tema;
use App\Models\Unidad;
use App\Models\Usuario;
use App\Services\ProgresoAprendizaje;
use Database\Seeders\IntermedioAnalisisVerbalEjerciciosSeeder;
use Database\Seeders\IntermedioAnalisisVerbalSeeder;
use Database\Seeders\IntermedioDialogosSeeder;
use Database\Seeders\IntermedioMorfemasEjerciciosSeeder;
use Database\Seeders\IntermedioMorfemasSeeder;
use Database\Seeders\IntermedioPracticaSeeder;
use Database\Seeders\IntermedioTiemposEjerciciosSeeder;
use Database\Seeders\IntermedioTiemposSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class IntermedioPracticaTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_four_advanced_units_gain_varied_application_exercises_without_duplicates(): void
    {
        $this->seed([IntermedioMorfemasSeeder::class, IntermedioMorfemasEjerciciosSeeder::class,
            IntermedioTiemposSeeder::class, IntermedioTiemposEjerciciosSeeder::class,
            IntermedioAnalisisVerbalSeeder::class, IntermedioAnalisisVerbalEjerciciosSeeder::class,
            IntermedioDialogosSeeder::class]);
        $this->seed(IntermedioPracticaSeeder::class);

        $level = Nivel::where('orden_nivel', 2)->firstOrFail();
        $module = Modulo::where('id_nivel', $level->id_nivel)->where('orden_modulo', 2)->firstOrFail();
        $units = Unidad::where('id_modulo', $module->id_modulo)->orderBy('orden_unidad')->get();
        $this->assertSame('Análisis morfológico y textual del kichwa', $module->nombre_modulo);
        $this->assertSame([5, 5, 5, 5], $units->map(fn (Unidad $unit): int => Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->count())->all());
        foreach ($units as $unit) {
            $this->assertSame('classic', $unit->configuracion['learning_mode']);
            $this->assertArrayNotHasKey('guided_lesson', $unit->configuracion);
            $this->assertSame(2, Tema::where('id_unidad', $unit->id_unidad)->where('publicado', true)->count());
            $this->assertSame(0, Tema::where('id_unidad', $unit->id_unidad)->where('publicado', true)
                ->where('clave_leccion', 'like', 'intermedio-modulo2-%')->count());
        }
        $dialogue = $units->last();
        $this->assertSame(['relacionar', 'ordenar', 'completar', 'seleccion_multiple', 'relacionar'],
            Actividad::where('id_unidad', $dialogue->id_unidad)->orderBy('orden_actividad')->pluck('tipo_actividad')->all());

        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $this->getJson('/api/units/'.$dialogue->id_unidad.'/guided')->assertNotFound();
        foreach ($units as $unit) {
            $this->getJson('/api/units/'.$unit->id_unidad.'/contents')->assertOk()->assertJsonPath('total', 2);
            $this->getJson('/api/units/'.$unit->id_unidad.'/exercises')->assertOk()->assertJsonPath('total', 0);
        }
        $topic = Tema::where('id_unidad', $dialogue->id_unidad)->where('publicado', true)->orderBy('orden_tema')->firstOrFail();
        $url = '/api/units/'.$dialogue->id_unidad.'/exercises?topic_id='.$topic->id_tema;
        $firstView = $this->getJson($url)->assertOk()->assertJsonPath('total', 1)->assertJsonMissingPath('data.0.solution');
        $this->assertSame($firstView->json('data'), $this->getJson($url)->json('data'));
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson($url)->assertOk()->assertJsonPath('total', 1);
        Sanctum::actingAs($student);
        foreach (Actividad::whereIn('id_unidad', $units->modelKeys())->where('publicado', true)->get() as $activity) {
            if ($activity->tipo_actividad === 'completar') {
                foreach ($activity->elementos_actividad as $element) {
                    $this->assertContains($activity->solucion_actividad['textos'][$element['id']][0], $element['opciones']);
                }
            }
            $answer = $activity->solucion_actividad;
            if ($activity->tipo_actividad === 'completar') {
                $answer['textos'] = array_map(fn (array $variants): string => $variants[0], $answer['textos']);
            }
            $this->postJson('/api/exercises/'.$activity->id_actividad.'/answer', ['answer' => $answer])
                ->assertOk()->assertJsonPath('is_correct', true);
        }

        $activityIds = Actividad::whereIn('id_unidad', $units->modelKeys())->where('publicado', true)->orderBy('id_actividad')->pluck('id_actividad')->all();
        $this->seed(IntermedioPracticaSeeder::class);

        $this->assertSame(20, Actividad::whereIn('id_unidad', $units->modelKeys())->where('publicado', true)->count());
        $this->assertSame($activityIds, Actividad::whereIn('id_unidad', $units->modelKeys())->where('publicado', true)->orderBy('id_actividad')->pluck('id_actividad')->all());
        $this->assertSame(8, Tema::whereIn('id_unidad', $units->modelKeys())->where('publicado', true)->count());
    }

    public function test_clearer_activity_keeps_previous_correct_progress(): void
    {
        $this->seed([IntermedioMorfemasSeeder::class, IntermedioMorfemasEjerciciosSeeder::class,
            IntermedioTiemposSeeder::class, IntermedioTiemposEjerciciosSeeder::class,
            IntermedioAnalisisVerbalSeeder::class, IntermedioAnalisisVerbalEjerciciosSeeder::class,
            IntermedioDialogosSeeder::class, IntermedioPracticaSeeder::class]);
        $level = Nivel::where('orden_nivel', 2)->firstOrFail();
        $module = Modulo::where('id_nivel', $level->id_nivel)->where('orden_modulo', 2)->firstOrFail();
        $unit = Unidad::where('id_modulo', $module->id_modulo)->where('orden_unidad', 1)->firstOrFail();
        $old = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->firstOrFail();
        $config = $old->configuracion;
        $config['content_revision'] = 2;
        $old->update(['configuracion' => $config]);
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $answer = $old->solucion_actividad;
        if ($old->tipo_actividad === 'completar') {
            $answer['textos'] = array_map(fn (array $variants): string => $variants[0], $answer['textos']);
        }
        $this->postJson('/api/exercises/'.$old->id_actividad.'/answer', ['answer' => $answer])
            ->assertOk()->assertJsonPath('is_correct', true);

        $this->seed(IntermedioPracticaSeeder::class);

        $current = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $old->origen_reactivo)
            ->where('publicado', true)->firstOrFail();
        $this->assertNotSame($old->id_actividad, $current->id_actividad);
        $this->assertFalse($old->fresh()->publicado);
        $this->assertSame(1, ProgresoAprendizaje::unitActivities($student->id_usuario)[$unit->id_unidad]['correct']);
    }
}
