<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\Modulo;
use App\Models\Nivel;
use App\Models\Tema;
use App\Models\Unidad;
use App\Models\Usuario;
use Database\Seeders\IntermedioFundamentosSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class IntermedioFundamentosTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_it_publishes_five_intermediate_units_with_topics_and_working_exercises(): void
    {
        $this->seed(IntermedioFundamentosSeeder::class);

        $level = Nivel::where('orden_nivel', 2)->firstOrFail();
        $module = Modulo::where('id_nivel', $level->id_nivel)->where('orden_modulo', 1)->firstOrFail();
        $units = Unidad::where('id_modulo', $module->id_modulo)->orderBy('orden_unidad')->get();
        $this->assertSame(5, $units->count());
        $this->assertSame('Conjugación en presente, pasado y futuro', $units->first()->titulo_unidad);
        $this->assertSame('Afirmación, negación, pregunta y duda', $units->last()->titulo_unidad);
        $this->assertSame(13, Tema::whereIn('id_unidad', $units->modelKeys())->count());
        $this->assertSame(13, Actividad::whereIn('id_unidad', $units->modelKeys())->count());

        Sanctum::actingAs(Usuario::factory()->create());
        $first = $units->first();
        $this->getJson('/api/units/'.$first->id_unidad)->assertOk()->assertJsonPath('config.learning_mode', 'classic');
        $this->getJson('/api/units/'.$first->id_unidad.'/contents')->assertOk()->assertJsonPath('total', 3);
        $topic = Tema::where('id_unidad', $first->id_unidad)->orderBy('orden_tema')->firstOrFail();
        $this->getJson('/api/units/'.$first->id_unidad.'/exercises?topic_id='.$topic->id_tema)->assertOk()->assertJsonPath('total', 1)
            ->assertJsonMissingPath('data.0.solution');
        $activity = Actividad::where('id_tema', $topic->id_tema)->firstOrFail();
        $this->postJson('/api/exercises/'.$activity->id_actividad.'/answer', ['answer' => ['textos' => [
            'hoy' => 'Kunan', 'agua' => 'yakuta', 'trabajo' => 'llankani',
        ]]])->assertOk()->assertJsonPath('is_correct', true);
    }

    public function test_seeding_again_keeps_existing_material_and_does_not_duplicate_exercises(): void
    {
        $this->seed(IntermedioFundamentosSeeder::class);
        $level = Nivel::where('orden_nivel', 2)->firstOrFail();
        $module = Modulo::where('id_nivel', $level->id_nivel)->where('orden_modulo', 1)->firstOrFail();
        $unit = Unidad::where('id_modulo', $module->id_modulo)->where('orden_unidad', 1)->firstOrFail();
        $note = Tema::create(['id_unidad' => $unit->id_unidad, 'clave_leccion' => 'teacher-note', 'tipo_tema' => 'gramatica',
            'titulo_tema' => 'Nota del docente', 'contenido_tema' => 'Conservar este contenido.', 'orden_tema' => 10, 'publicado' => true]);

        $this->seed(IntermedioFundamentosSeeder::class);

        $this->assertSame(5, Unidad::where('id_modulo', $module->id_modulo)->count());
        $this->assertSame(13, Actividad::whereIn('id_unidad', Unidad::where('id_modulo', $module->id_modulo)->select('id_unidad'))->count());
        $this->assertSame('Conservar este contenido.', $note->fresh()->contenido_tema);
    }
}
