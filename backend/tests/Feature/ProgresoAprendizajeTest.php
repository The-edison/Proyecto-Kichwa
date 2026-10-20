<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\Modulo;
use App\Models\RespuestaActividad;
use App\Models\Unidad;
use App\Models\Usuario;
use App\Services\PublicacionContenido;
use Database\Seeders\UnidadUnoGuiadaSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class ProgresoAprendizajeTest extends TestCase
{
    use UsesPostgreSQL;

    private function record(Usuario $student, Actividad $exercise, bool $correct = true): void
    {
        RespuestaActividad::create(['id_usuario' => $student->id_usuario, 'id_actividad' => $exercise->id_actividad,
            'respuesta_actividad' => ['seleccion' => ['wasi']], 'acierto_actividad' => $correct, 'retroalimentacion_actividad' => 'Registrado.']);
    }

    public function test_correct_activities_survive_versions_without_duplicates_and_student_and_admin_share_the_report(): void
    {
        $this->seed(UnidadUnoGuiadaSeeder::class);
        $student = Usuario::factory()->create();
        $other = Usuario::factory()->create();
        $unit = Unidad::where('configuracion->learning_mode', 'guided')->firstOrFail();
        $exercises = PublicacionContenido::exercises($unit->id_unidad)->get();
        $this->record($student, $exercises[0]);
        $this->record($student, $exercises[0]);
        $this->record($student, $exercises[1], false);
        foreach ($exercises as $exercise) {
            $this->record($other, $exercise);
        }
        $version = $exercises[0]->replicate();
        $version->orden_actividad = 1 + Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
        $version->save();
        PublicacionContenido::invalidate();
        Sanctum::actingAs($student);
        $report = $this->getJson('/api/mastery')->assertOk()->assertJsonPath('learning_report.summary.completed_activities', 1)
            ->assertJsonPath('learning_report.summary.completed_units', 0)->assertJsonPath('learning_report.next_step.id', $unit->id_unidad)->json('learning_report');
        $detail = collect($report['levels'])->flatMap(fn ($level) => $level['modules'])->flatMap(fn ($module) => $module['units'])->firstWhere('id', $unit->id_unidad);
        $this->assertSame($exercises->count(), $detail['total_activities']);
        $this->assertSame(1, $detail['completed_activities']);
        $this->getJson('/api/progress')->assertOk()->assertJsonPath('0.completed_activities', 1);
        $this->getJson('/api/admin/learning-results/'.$other->id_usuario)->assertForbidden();
        foreach ($exercises->slice(1) as $exercise) {
            $this->record($student, $exercise);
        }
        $mastery = $this->getJson('/api/mastery')->assertOk()->assertJsonPath('learning_report.summary.completed_units', 1)->json();
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/admin/learning-results/'.$student->id_usuario)->assertOk()->assertExactJson($mastery);
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('learning_report.summary.completed_activities', 0);
    }

    public function test_empty_or_unpublished_units_and_modules_do_not_create_false_completed_results(): void
    {
        $this->seed(UnidadUnoGuiadaSeeder::class);
        $student = Usuario::factory()->create();
        $unit = Unidad::where('configuracion->learning_mode', 'guided')->firstOrFail();
        foreach (PublicacionContenido::exercises($unit->id_unidad)->get() as $exercise) {
            $this->record($student, $exercise);
        }
        $empty = Unidad::create(['id_modulo' => $unit->id_modulo, 'titulo_unidad' => 'En preparación', 'objetivo_unidad' => 'Contenido pendiente',
            'orden_unidad' => 1 + Unidad::where('id_modulo', $unit->id_modulo)->max('orden_unidad'), 'publicado' => true,
            'configuracion' => ['learning_mode' => 'guided']]);
        Sanctum::actingAs($student);
        $report = $this->getJson('/api/mastery')->assertOk()->assertJsonPath('learning_report.summary.completed_units', 1)->json('learning_report');
        $detail = collect($report['levels'])->flatMap(fn ($level) => $level['modules'])->flatMap(fn ($module) => $module['units'])->firstWhere('id', $empty->id_unidad);
        $this->assertSame(0, $detail['total_activities']);
        $this->assertFalse($detail['completed']);
        $unit->update(['configuracion' => ['learning_mode' => 'classic']]);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('learning_report.summary.completed_units', 1)->assertJsonCount(1, 'completed_units');
        Modulo::whereKey($unit->id_modulo)->update(['publicado' => false]);
        PublicacionContenido::invalidate();
        $report = $this->getJson('/api/mastery')->assertOk()->assertJsonPath('completed_units', [])->assertJsonPath('learning_report.summary.completed_units', 0)->json('learning_report');
        $this->assertNotContains($unit->id_modulo, collect($report['levels'])->flatMap(fn ($level) => $level['modules'])->pluck('id')->all());
    }
}
