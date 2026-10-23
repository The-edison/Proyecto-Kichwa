<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\Modulo;
use App\Models\Nivel;
use App\Models\Tema;
use App\Models\Unidad;
use App\Models\Usuario;
use Database\Seeders\IntermedioAnalisisVerbalSeeder;
use Database\Seeders\IntermedioDialogosSeeder;
use Database\Seeders\IntermedioMorfemasSeeder;
use Database\Seeders\IntermedioTiemposSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class IntermedioDialogosTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_fourth_unit_receives_its_dialogues_without_overwriting_previous_lessons_or_existing_notes(): void
    {
        $this->seed([IntermedioMorfemasSeeder::class, IntermedioTiemposSeeder::class, IntermedioAnalisisVerbalSeeder::class]);
        $previousTopics = Tema::orderBy('id_tema')->get()->keyBy('id_tema')->map->contenido_tema;
        $module = Unidad::where('configuracion->guided_lesson', 'verbal-analysis')->firstOrFail()->id_modulo;
        $unit = Unidad::create(['id_modulo' => $module, 'titulo_unidad' => 'Diálogos escritos', 'objetivo_unidad' => 'Conversar.', 'orden_unidad' => 4, 'publicado' => true, 'configuracion' => ['sequence_mode' => true]]);
        $notes = Tema::create(['id_unidad' => $unit->id_unidad, 'titulo_tema' => 'Lectura adicional', 'tipo_tema' => 'gramatica', 'contenido_tema' => 'Contenido conservado.', 'orden_tema' => 1, 'publicado' => true]);
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/units/'.$unit->id_unidad.'/contents')->assertOk()->assertJsonPath('total', 1);

        $this->seed(IntermedioDialogosSeeder::class);

        $this->getJson('/api/units/'.$unit->id_unidad)->assertOk()->assertJsonPath('sort_order', 4)->assertJsonPath('level_name', 'Intermedio')
            ->assertJsonPath('config.learning_mode', 'guided')->assertJsonPath('config.guided_lesson', 'short-dialogues')->assertJsonPath('config.sequence_mode', true);
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/units/'.$unit->id_unidad.'/contents')->assertOk()->assertJsonPath('total', 2);
        $topic = Tema::where('clave_leccion', IntermedioDialogosSeeder::LESSON_KEY)->firstOrFail();
        $this->getJson('/api/units/'.$unit->id_unidad.'/topics/'.$topic->id_tema)->assertOk()->assertJsonPath('kind', 'grammar')
            ->assertSee('Alex: Imanalla, mashi Evelin?')->assertSee('Evelin: Allillami kani, mashi Alex.')->assertSee('Kitopi llankani.')->assertSee('Pay mikukun.')->assertSee('Urkuka hatunmi kan.')->assertSee('Yachanawasipi yachasha.')->assertSee('Kitopi llankasha.');

        $this->seed(IntermedioDialogosSeeder::class);

        $this->assertSame(1, Tema::where('clave_leccion', IntermedioDialogosSeeder::LESSON_KEY)->count());
        $this->assertSame($previousTopics->all(), Tema::whereIn('id_tema', $previousTopics->keys())->orderBy('id_tema')->get()->keyBy('id_tema')->map->contenido_tema->all());
        $this->assertSame('Contenido conservado.', $notes->fresh()->contenido_tema);
        $this->assertTrue($notes->fresh()->publicado);
        $this->assertSame(0, Actividad::where('id_unidad', $unit->id_unidad)->count());
        $this->assertSame(0, EvaluacionKichwa::where('id_unidad', $unit->id_unidad)->count());

        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $record = $unit->fresh();
        $this->patchJson('/api/admin/units/'.$unit->id_unidad, ['module_id' => $record->id_modulo, 'title' => $record->titulo_unidad, 'description' => $record->objetivo_unidad, 'published' => true, 'config' => ['learning_mode' => 'guided', 'guided_lesson' => 'short-dialogues']])->assertOk()->assertJsonPath('config.guided_lesson', 'short-dialogues');
    }

    public function test_fresh_seed_targets_intermediate_module_two_unit_four_and_preserves_the_basic_catalog(): void
    {
        $basic = Nivel::where('orden_nivel', 1)->firstOrFail();
        $module = Modulo::create(['id_nivel' => $basic->id_nivel, 'nombre_modulo' => 'Vocabulario', 'descripcion_modulo' => 'Contenido básico.', 'orden_modulo' => 2, 'publicado' => true]);
        $other = Unidad::create(['id_modulo' => $module->id_modulo, 'titulo_unidad' => 'Naturaleza', 'objetivo_unidad' => 'Conocer el entorno.', 'orden_unidad' => 4, 'publicado' => true]);

        $this->seed(IntermedioDialogosSeeder::class);

        $topic = Tema::where('clave_leccion', IntermedioDialogosSeeder::LESSON_KEY)->firstOrFail();
        $unit = Unidad::findOrFail($topic->id_unidad);
        $target = Modulo::findOrFail($unit->id_modulo);
        $this->assertSame(4, $unit->orden_unidad);
        $this->assertSame(2, $target->orden_modulo);
        $this->assertSame(Nivel::where('orden_nivel', 2)->firstOrFail()->id_nivel, $target->id_nivel);
        $this->assertSame('Naturaleza', $other->fresh()->titulo_unidad);
        $this->assertSame([], $other->fresh()->configuracion ?? []);
        $this->assertSame(0, Tema::where('clave_leccion', IntermedioMorfemasSeeder::LESSON_KEY)->count());
    }
}
