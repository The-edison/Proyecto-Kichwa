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
use Database\Seeders\IntermedioTiemposSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class IntermedioTiemposTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_second_unit_receives_the_time_lesson_and_preserves_the_first_lesson_and_existing_notes(): void
    {
        $this->seed(IntermedioMorfemasSeeder::class);
        $firstTopic = Tema::where('clave_leccion', IntermedioMorfemasSeeder::LESSON_KEY)->firstOrFail();
        $firstUnit = Unidad::findOrFail($firstTopic->id_unidad);
        $previousContent = $firstTopic->contenido_tema;
        $unit = Unidad::create(['id_modulo' => $firstUnit->id_modulo, 'titulo_unidad' => 'Morfemas de tiempo', 'objetivo_unidad' => 'Aprender tiempos.', 'orden_unidad' => 2, 'publicado' => true]);
        $notes = Tema::create(['id_unidad' => $unit->id_unidad, 'titulo_tema' => 'Lectura adicional', 'tipo_tema' => 'gramatica', 'contenido_tema' => 'Se conserva.', 'orden_tema' => 1, 'publicado' => true]);
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/units/'.$unit->id_unidad.'/contents')->assertOk()->assertJsonPath('total', 1);

        $this->seed(IntermedioTiemposSeeder::class);

        $this->getJson('/api/units/'.$unit->id_unidad)->assertOk()->assertJsonPath('sort_order', 2)->assertJsonPath('level_name', 'Intermedio')
            ->assertJsonPath('config.learning_mode', 'guided')->assertJsonPath('config.guided_lesson', 'time-morphemes');
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/units/'.$unit->id_unidad.'/contents')->assertOk()->assertJsonPath('total', 2);
        $topic = Tema::where('clave_leccion', IntermedioTiemposSeeder::LESSON_KEY)->firstOrFail();
        $this->getJson('/api/units/'.$unit->id_unidad.'/topics/'.$topic->id_tema)->assertOk()->assertJsonPath('kind', 'grammar')
            ->assertSee('samarirka')->assertSee('chinkarirka')->assertSee('yachachisha')->assertSee('sirasha')->assertSee('purirkani')->assertSee('purinka');

        $this->seed(IntermedioTiemposSeeder::class);

        $this->assertSame(1, Tema::where('clave_leccion', IntermedioTiemposSeeder::LESSON_KEY)->count());
        $this->assertSame($previousContent, $firstTopic->fresh()->contenido_tema);
        $this->assertSame('advanced-morphemes', $firstUnit->fresh()->configuracion['guided_lesson']);
        $this->assertSame('Se conserva.', $notes->fresh()->contenido_tema);
        $this->assertTrue($notes->fresh()->publicado);
        $this->assertSame(0, Actividad::where('id_unidad', $unit->id_unidad)->count());
        $this->assertSame(0, EvaluacionKichwa::where('id_unidad', $unit->id_unidad)->count());

        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $record = $unit->fresh();
        $this->patchJson('/api/admin/units/'.$unit->id_unidad, ['module_id' => $record->id_modulo, 'title' => $record->titulo_unidad, 'description' => $record->objetivo_unidad, 'published' => true, 'config' => $record->configuracion])->assertOk()->assertJsonPath('config.guided_lesson', 'time-morphemes');
    }

    public function test_time_seeder_creates_only_unit_two_in_the_correct_level_and_module(): void
    {
        $basic = Nivel::where('orden_nivel', 1)->firstOrFail();
        $module = Modulo::create(['id_nivel' => $basic->id_nivel, 'nombre_modulo' => 'Vocabulario', 'descripcion_modulo' => 'Contenido básico.', 'orden_modulo' => 2, 'publicado' => true]);
        $otherUnit = Unidad::create(['id_modulo' => $module->id_modulo, 'titulo_unidad' => 'Partes del cuerpo', 'objetivo_unidad' => 'Conocer el cuerpo.', 'orden_unidad' => 2, 'publicado' => true]);

        $this->seed(IntermedioTiemposSeeder::class);

        $topic = Tema::where('clave_leccion', IntermedioTiemposSeeder::LESSON_KEY)->firstOrFail();
        $unit = Unidad::findOrFail($topic->id_unidad);
        $target = Modulo::findOrFail($unit->id_modulo);
        $this->assertSame(2, $unit->orden_unidad);
        $this->assertSame(2, $target->orden_modulo);
        $this->assertSame(Nivel::where('orden_nivel', 2)->firstOrFail()->id_nivel, $target->id_nivel);
        $this->assertSame(0, Tema::where('clave_leccion', IntermedioMorfemasSeeder::LESSON_KEY)->count());
        $this->assertSame('Partes del cuerpo', $otherUnit->fresh()->titulo_unidad);
        $this->assertSame([], $otherUnit->fresh()->configuracion ?? []);
    }
}
