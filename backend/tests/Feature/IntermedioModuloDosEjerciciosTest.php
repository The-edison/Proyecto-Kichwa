<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\Tema;
use App\Models\Unidad;
use App\Models\Usuario;
use Database\Seeders\IntermedioModuloDosEjerciciosSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class IntermedioModuloDosEjerciciosTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_all_four_units_publish_their_exercises_without_other_module_seeders(): void
    {
        $this->seed(IntermedioModuloDosEjerciciosSeeder::class);
        Sanctum::actingAs(Usuario::factory()->create());

        foreach (['advanced-morphemes' => 14, 'time-morphemes' => 12, 'verbal-analysis' => 14, 'short-dialogues' => 6] as $lesson => $total) {
            $unit = Unidad::where('configuracion->guided_lesson', $lesson)->firstOrFail();
            $this->getJson('/api/units/'.$unit->id_unidad.'/guided')
                ->assertOk()->assertJsonPath('total', $total)->assertJsonCount($total, 'exercises');
        }
    }

    public function test_reloading_the_module_preserves_edited_lessons_and_exercise_identities(): void
    {
        $this->seed(IntermedioModuloDosEjerciciosSeeder::class);
        $lessons = Tema::where('clave_leccion', 'like', 'intermedio-modulo2-%')->get();
        foreach ($lessons as $lesson) {
            $lesson->update(['contenido_tema' => 'Lección revisada por el docente: '.$lesson->id_tema]);
        }
        $before = $lessons->mapWithKeys(fn (Tema $lesson): array => [$lesson->id_tema => $lesson->getAttributes()])->all();
        $units = $lessons->pluck('id_unidad');
        $ids = Actividad::whereIn('id_unidad', $units)->orderBy('id_actividad')->pluck('id_actividad')->all();
        Actividad::whereIn('id_unidad', $units)->update(['publicado' => false]);
        Unidad::whereIn('id_unidad', $units)->update(['publicado' => false, 'configuracion' => ['learning_mode' => 'classic', 'custom_setting' => true]]);

        $this->seed(IntermedioModuloDosEjerciciosSeeder::class);

        $this->assertSame($ids, Actividad::whereIn('id_unidad', $units)->orderBy('id_actividad')->pluck('id_actividad')->all());
        foreach ($lessons as $lesson) {
            $this->assertSame($before[$lesson->id_tema], $lesson->fresh()->getAttributes());
            $unit = Unidad::findOrFail($lesson->id_unidad);
            $this->assertTrue($unit->publicado);
            $this->assertSame('guided', $unit->configuracion['learning_mode']);
            $this->assertTrue($unit->configuracion['custom_setting']);
        }
        $this->assertSame(46, Actividad::whereIn('id_unidad', $units)->where('publicado', true)->count());
    }
}
