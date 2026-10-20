<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\Modulo;
use App\Models\Nivel;
use App\Models\Unidad;
use App\Models\Usuario;
use Database\Seeders\UnidadDosGuiadaSeeder;
use Database\Seeders\UnidadesTematicasGuiadasSeeder;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class ModuloDosGuiadoTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_existing_module_and_units_receive_their_lessons_and_reseeding_preserves_answers(): void
    {
        $this->seed(UnidadDosGuiadaSeeder::class);
        $level = Nivel::where('orden_nivel', 1)->firstOrFail();
        $module = Modulo::create(['id_nivel' => $level->id_nivel, 'nombre_modulo' => 'Módulo 2  Vocabulario y gramática básica',
            'descripcion_modulo' => 'Vocabulario y gramática básica.', 'orden_modulo' => 2, 'publicado' => true]);
        $titles = ['Animales y colores', 'Partes del cuerpo', 'Naturaleza y entorno cercano', 'Verbos frecuentes y raíz verbal'];
        $units = collect($titles)->map(fn (string $title, int $index): Unidad => Unidad::create([
            'id_modulo' => $module->id_modulo, 'titulo_unidad' => 'Unidad '.($index + 1).'  '.$title,
            'objetivo_unidad' => $title, 'orden_unidad' => $index + 1, 'publicado' => true]));
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);

        $this->seed(UnidadesTematicasGuiadasSeeder::class);

        $this->getJson('/api/modules/'.$module->id_modulo.'/units')->assertOk()->assertJsonPath('total', 4);
        $activityIds = [];
        foreach ($units as $index => $unit) {
            $mode = ['animals-colors', 'body', 'nature', 'verbs'][$index];
            $count = [8, 5, 3, 4][$index];
            $this->getJson('/api/units/'.$unit->id_unidad)->assertOk()->assertJsonPath('title', $titles[$index])
                ->assertJsonPath('module_id', $module->id_modulo)->assertJsonPath('sort_order', $index + 1)
                ->assertJsonPath('config.learning_mode', 'guided')->assertJsonPath('config.guided_lesson', $mode);
            $this->getJson('/api/units/'.$unit->id_unidad.'/contents')->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.title', $titles[$index]);
            $exercises = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', $count)->json('exercises');
            $session = (string) Str::uuid();
            $responses = [];
            foreach ($exercises as $exercise) {
                $this->assertArrayNotHasKey('solution', $exercise);
                $this->assertArrayNotHasKey('correct_feedback', $exercise['config']);
                $record = Actividad::findOrFail($exercise['id']);
                $activityIds[] = $record->id_actividad;
                $responses[] = $this->postJson('/api/exercises/'.$record->id_actividad.'/answer', ['answer' => $record->solucion_actividad,
                    'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])->assertOk()->assertJsonPath('is_correct', true)->json('response_id');
            }
            $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => $responses, 'practice_attempt_id' => $session])
                ->assertOk()->assertJsonPath('score', $count)->assertJsonPath('passed', true)->assertJsonPath('next_unit_id', $units->get($index + 1)?->id_unidad);
        }

        $this->seed(UnidadesTematicasGuiadasSeeder::class);

        $this->assertSame($activityIds, Actividad::whereIn('id_unidad', $units->pluck('id_unidad'))->where('publicado', true)->orderBy('id_unidad')->orderBy('orden_actividad')->pluck('id_actividad')->all());
        foreach ($units as $index => $unit) {
            $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('completed_count', [8, 5, 3, 4][$index]);
        }
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        foreach ($units as $unit) {
            $record = $unit->fresh();
            $this->patchJson('/api/admin/units/'.$unit->id_unidad, ['module_id' => $module->id_modulo, 'title' => $record->titulo_unidad,
                'description' => $record->objetivo_unidad, 'config' => $record->configuracion, 'published' => true])
                ->assertOk()->assertJsonPath('config.guided_lesson', $record->configuracion['guided_lesson']);
            $this->assertSame($record->configuracion, $record->fresh()->configuracion);
        }
    }

    public function test_fresh_install_creates_the_basic_second_module_without_changing_the_intermediate_second_module(): void
    {
        $intermediate = Nivel::where('orden_nivel', 2)->firstOrFail();
        $otherModule = Modulo::create(['id_nivel' => $intermediate->id_nivel, 'nombre_modulo' => 'Morfemas avanzados',
            'descripcion_modulo' => 'Contenido intermedio.', 'orden_modulo' => 2, 'publicado' => false]);
        $otherUnit = Unidad::create(['id_modulo' => $otherModule->id_modulo, 'titulo_unidad' => 'Morfemas',
            'objetivo_unidad' => 'Estudiar morfemas.', 'orden_unidad' => 1, 'publicado' => false]);

        $this->seed(UnidadesTematicasGuiadasSeeder::class);

        $basic = Nivel::where('orden_nivel', 1)->firstOrFail();
        $module = Modulo::where('id_nivel', $basic->id_nivel)->where('orden_modulo', 2)->firstOrFail();
        $this->assertTrue($module->publicado);
        $this->assertSame(4, Unidad::where('id_modulo', $module->id_modulo)->where('configuracion->learning_mode', 'guided')->count());
        $this->assertSame('Morfemas', $otherUnit->fresh()->titulo_unidad);
        $this->assertFalse($otherModule->fresh()->publicado);
        $this->assertFalse($otherUnit->fresh()->publicado);
        $this->assertSame(0, Actividad::where('id_unidad', $otherUnit->id_unidad)->count());

    }
}
