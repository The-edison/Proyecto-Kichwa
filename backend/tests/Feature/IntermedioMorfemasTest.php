<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\Modulo;
use App\Models\Nivel;
use App\Models\Tema;
use App\Models\Unidad;
use App\Models\Usuario;
use Database\Seeders\IntermedioMorfemasSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class IntermedioMorfemasTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_existing_intermediate_unit_receives_the_lesson_without_replacing_other_content(): void
    {
        $level = Nivel::where('orden_nivel', 2)->firstOrFail();
        $module = Modulo::create(['id_nivel' => $level->id_nivel, 'nombre_modulo' => 'Morfemas avanzados y construcción escrita', 'descripcion_modulo' => 'Material de estudio.', 'orden_modulo' => 2, 'publicado' => true]);
        $unit = Unidad::create(['id_modulo' => $module->id_modulo, 'titulo_unidad' => 'Unidad 1 Morfemas avanzados', 'objetivo_unidad' => 'Estudiar palabras.', 'orden_unidad' => 1, 'publicado' => true]);
        $previous = Tema::create(['id_unidad' => $unit->id_unidad, 'titulo_tema' => 'Notas del docente', 'tipo_tema' => 'gramatica', 'contenido_tema' => 'Contenido conservado.', 'orden_tema' => 1, 'publicado' => true]);
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/units/'.$unit->id_unidad.'/contents')->assertOk()->assertJsonPath('total', 1);

        $this->seed(IntermedioMorfemasSeeder::class);

        $this->getJson('/api/units/'.$unit->id_unidad)->assertOk()->assertJsonPath('level_name', 'Intermedio')
            ->assertJsonPath('module_id', $module->id_modulo)->assertJsonPath('config.guided_lesson', 'advanced-morphemes')->assertJsonPath('config.learning_mode', 'guided');
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 0)->assertJsonCount(0, 'exercises');
        $this->getJson('/api/units/'.$unit->id_unidad.'/contents')->assertOk()->assertJsonPath('total', 2);
        $topic = Tema::where('clave_leccion', IntermedioMorfemasSeeder::LESSON_KEY)->firstOrFail();
        $this->getJson('/api/units/'.$unit->id_unidad.'/topics/'.$topic->id_tema)->assertOk()->assertJsonPath('kind', 'grammar')->assertSee('wasikamak')->assertSee('iskunniki')->assertSee('laushushi')->assertSee('no lo llamamos sufijo', false);

        $this->seed(IntermedioMorfemasSeeder::class);

        $this->assertSame(1, Unidad::where('id_modulo', $module->id_modulo)->count());
        $this->assertSame(1, Tema::where('clave_leccion', IntermedioMorfemasSeeder::LESSON_KEY)->count());
        $this->assertTrue($previous->fresh()->publicado);
        $this->assertSame('Contenido conservado.', $previous->fresh()->contenido_tema);
        $this->assertSame(0, Actividad::where('id_unidad', $unit->id_unidad)->count());
        $this->assertSame(0, EvaluacionKichwa::where('id_unidad', $unit->id_unidad)->count());

        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $record = $unit->fresh();
        $this->patchJson('/api/admin/units/'.$unit->id_unidad, ['module_id' => $module->id_modulo, 'title' => $record->titulo_unidad, 'description' => $record->objetivo_unidad, 'published' => true, 'config' => $record->configuracion])->assertOk()->assertJsonPath('config.guided_lesson', 'advanced-morphemes');
    }

    public function test_fresh_install_creates_only_the_target_intermediate_module_without_touching_other_units(): void
    {
        $basic = Nivel::where('orden_nivel', 1)->firstOrFail();
        $intermediate = Nivel::where('orden_nivel', 2)->firstOrFail();
        $basicModule = Modulo::create(['id_nivel' => $basic->id_nivel, 'nombre_modulo' => 'Vocabulario básico', 'descripcion_modulo' => 'Material de estudio.', 'orden_modulo' => 2, 'publicado' => false]);
        $firstModule = Modulo::create(['id_nivel' => $intermediate->id_nivel, 'nombre_modulo' => 'Conjugación', 'descripcion_modulo' => 'Material de estudio.', 'orden_modulo' => 1, 'publicado' => true]);
        $other = Unidad::create(['id_modulo' => $firstModule->id_modulo, 'titulo_unidad' => 'Conjugación en presente, pasado y futuro', 'objetivo_unidad' => 'Estudiar palabras.', 'orden_unidad' => 1, 'publicado' => false]);

        $this->seed(IntermedioMorfemasSeeder::class);

        $target = Modulo::where('id_nivel', $intermediate->id_nivel)->where('orden_modulo', 2)->firstOrFail();
        $this->assertTrue($target->publicado);
        $this->assertSame(1, Unidad::where('id_modulo', $target->id_modulo)->where('configuracion->guided_lesson', 'advanced-morphemes')->count());
        $this->assertFalse($basicModule->fresh()->publicado);
        $this->assertSame(0, Unidad::where('id_modulo', $basicModule->id_modulo)->count());
        $this->assertSame('Conjugación en presente, pasado y futuro', $other->fresh()->titulo_unidad);
        $this->assertFalse($other->fresh()->publicado);
        $this->assertSame([], $other->fresh()->configuracion ?? []);
    }
}
