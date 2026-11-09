<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\IntentoEvaluacion;
use App\Models\Modulo;
use App\Models\Nivel;
use App\Models\Pregunta;
use App\Models\Unidad;
use App\Models\Usuario;
use App\Services\PublicacionContenido;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class ModuleAccessTest extends TestCase
{
    use UsesPostgreSQL;

    private function curriculum(): array
    {
        $basic = Nivel::where('orden_nivel', 1)->firstOrFail();
        $intermediate = Nivel::where('orden_nivel', 2)->firstOrFail();
        $records = [];
        foreach ([[$basic, 2], [$basic, 7], [$intermediate, 1]] as $position => [$level, $order]) {
            $module = Modulo::create(['id_nivel' => $level->id_nivel, 'nombre_modulo' => 'Módulo '.($position + 1),
                'descripcion_modulo' => 'Aprende paso a paso.', 'orden_modulo' => $order, 'publicado' => true]);
            $unit = Unidad::create(['id_modulo' => $module->id_modulo, 'titulo_unidad' => 'Unidad '.($position + 1),
                'objetivo_unidad' => 'Practica las palabras.', 'orden_unidad' => 1, 'publicado' => true, 'configuracion' => ['learning_mode' => 'guided']]);
            $elements = [['id' => 'a', 'texto' => 'yaku'], ['id' => 'b', 'texto' => 'allpa']];
            $exercise = Actividad::create(['id_unidad' => $unit->id_unidad, 'tipo_actividad' => 'seleccion_multiple',
                'enunciado_actividad' => 'Selecciona agua.', 'elementos_actividad' => $elements, 'zonas_actividad' => [],
                'solucion_actividad' => ['seleccion' => ['a']], 'orden_actividad' => 1, 'publicado' => true]);
            $evaluation = EvaluacionKichwa::create(['id_modulo' => $module->id_modulo, 'tipo_evaluacion' => 'modulo',
                'titulo_evaluacion' => 'Prueba final '.($position + 1), 'publicado' => true,
                'configuracion' => ['managed' => true, 'question_count' => 1, 'pass_percentage' => 80, 'prerequisite_units' => [$unit->id_unidad]]]);
            $question = Pregunta::create(['id_evaluacion' => $evaluation->id_evaluacion, 'tipo_pregunta' => 'seleccion_multiple',
                'enunciado_pregunta' => 'Selecciona agua.', 'elementos_pregunta' => $elements, 'zonas_pregunta' => [],
                'solucion_pregunta' => ['seleccion' => ['a']], 'puntaje_pregunta' => 1, 'orden_pregunta' => 1, 'publicado' => true]);
            $records[] = compact('module', 'unit', 'exercise', 'evaluation', 'question');
        }

        return $records;
    }

    private function finish(array $record, bool $pass = true): void
    {
        $this->postJson('/api/exercises/'.$record['exercise']->id_actividad.'/answer', ['answer' => ['seleccion' => ['a']]])->assertOk();
        $url = '/api/evaluations/'.$record['evaluation']->id_evaluacion;
        $attempt = $this->postJson($url.'/attempts')->assertOk()->json('attempt_id');
        $this->postJson($url.'/submit', ['attempt_id' => $attempt,
            'answers' => [['question_id' => $record['question']->id_pregunta, 'answer' => ['seleccion' => [$pass ? 'a' : 'b']]]]])
            ->assertOk()->assertJsonPath('passed', $pass);
    }

    public function test_modules_unlock_only_after_all_units_and_a_passed_final_in_level_and_module_order(): void
    {
        [$first, $second, $third] = $this->curriculum();
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $path = '/api/levels/'.$first['module']->id_nivel.'/modules';
        $this->getJson($path)->assertOk()->assertJsonPath('data.0.unlocked', true)->assertJsonPath('data.1.unlocked', false);
        $this->getJson('/api/learning-navigation')->assertOk()->assertJsonPath('1.modules.0.unlocked', false);

        $this->finish($first, false);
        $this->getJson($path)->assertOk()->assertJsonPath('data.1.lock.completed_units', 1)->assertJsonPath('data.1.lock.final_passed', false);
        $this->getJson('/api/modules/'.$second['module']->id_modulo)->assertForbidden()->assertJsonPath('code', 'module_locked');
        $this->finish($first);
        $this->getJson('/api/modules/'.$second['module']->id_modulo)->assertOk();
        $this->getJson('/api/modules/'.$third['module']->id_modulo)->assertForbidden()
            ->assertJsonPath('module_lock.prerequisite.id', $second['module']->id_modulo);
        $this->finish($first, false);
        $this->getJson('/api/modules/'.$second['module']->id_modulo)->assertOk();
        $this->finish($second);
        $this->getJson('/api/modules/'.$third['module']->id_modulo)->assertOk();
        $this->getJson('/api/learning-navigation')->assertOk()->assertJsonPath('1.modules.0.unlocked', true);

        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/learning-navigation')->assertOk()->assertJsonPath('0.modules.1.unlocked', false)->assertJsonPath('1.modules.0.unlocked', false);
        $this->getJson($path)->assertOk()->assertJsonPath('data.1.unlocked', false);
    }

    public function test_locked_modules_reject_direct_content_answers_evaluations_and_existing_attempts(): void
    {
        [$first, $second] = $this->curriculum();
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $module = $second['module']->id_modulo;
        $unit = $second['unit']->id_unidad;
        $evaluation = $second['evaluation']->id_evaluacion;
        $attempt = IntentoEvaluacion::create(['id_usuario' => $student->id_usuario, 'id_evaluacion' => $evaluation,
            'numero_intento' => 1, 'estado_intento' => 'en_curso', 'preguntas_seleccionadas' => [$second['question']->id_pregunta]]);
        foreach (["/modules/$module", "/modules/$module/units", "/modules/$module/contents", "/units/$unit", "/units/$unit/guided",
            "/units/$unit/sequence", "/units/$unit/contents", "/units/$unit/exercises", "/units/$unit/topics/1", "/evaluations/$evaluation",
            '/attempts/'.$attempt->id_intento, '/levels/'.$second['module']->id_nivel.'/evaluations?unit_id='.$unit] as $path) {
            $this->getJson('/api'.$path)->assertForbidden()->assertJsonPath('code', 'module_locked')
                ->assertJsonPath('module_lock.prerequisite.id', $first['module']->id_modulo)->assertJsonMissingPath('questions');
        }
        foreach (["/evaluations/$evaluation/attempts", "/evaluations/$evaluation/submit", "/units/$unit/guided/result",
            '/exercises/'.$second['exercise']->id_actividad.'/answer', '/attempts/'.$attempt->id_intento.'/pair'] as $path) {
            $this->postJson('/api'.$path, ['unlocked' => true, 'score' => 100])->assertForbidden()->assertJsonPath('code', 'module_locked');
        }
        $this->patchJson('/api/attempts/'.$attempt->id_intento, ['answers' => []])->assertForbidden();
        $this->deleteJson('/api/attempts/'.$attempt->id_intento)->assertForbidden();
        $this->assertDatabaseCount('intentos_evaluacion', 1);
        $this->assertDatabaseCount('respuestas_actividad', 0);
        $this->assertDatabaseCount('respuestas_evaluacion', 0);
    }

    public function test_completed_practice_without_a_published_final_does_not_unlock_the_next_module(): void
    {
        [$first, $second] = $this->curriculum();
        Sanctum::actingAs(Usuario::factory()->create());
        $this->postJson('/api/exercises/'.$first['exercise']->id_actividad.'/answer', ['answer' => ['seleccion' => ['a']]])->assertOk();
        $first['evaluation']->update(['publicado' => false]);
        $this->getJson('/api/modules/'.$second['module']->id_modulo)->assertForbidden()->assertJsonPath('module_lock.final_ready', false);
        $first['module']->update(['publicado' => false]);
        PublicacionContenido::invalidate();
        $this->getJson('/api/modules/'.$second['module']->id_modulo)->assertOk();
    }

    public function test_a_passed_final_does_not_replace_missing_activities_or_an_unfinished_unit(): void
    {
        [$first, $second] = $this->curriculum();
        Sanctum::actingAs(Usuario::factory()->create());
        $this->finish($first);
        $next = '/api/modules/'.$second['module']->id_modulo;
        $this->getJson($next)->assertOk();
        $exercise = Actividad::create(['id_unidad' => $first['unit']->id_unidad, 'tipo_actividad' => 'seleccion_multiple',
            'enunciado_actividad' => 'Una actividad adicional.', 'elementos_actividad' => $first['exercise']->elementos_actividad,
            'zonas_actividad' => [], 'solucion_actividad' => ['seleccion' => ['a']], 'orden_actividad' => 2, 'publicado' => true]);
        $this->getJson($next)->assertForbidden()->assertJsonPath('module_lock.final_passed', true)
            ->assertJsonPath('module_lock.completed_units', 0)->assertJsonPath('module_lock.resume.id', $first['unit']->id_unidad);
        $this->postJson('/api/exercises/'.$exercise->id_actividad.'/answer', ['answer' => ['seleccion' => ['a']]])->assertOk();
        $this->getJson($next)->assertOk();
        Unidad::create(['id_modulo' => $first['module']->id_modulo, 'titulo_unidad' => 'Unidad en preparación',
            'objetivo_unidad' => 'Pendiente', 'orden_unidad' => 2, 'publicado' => true, 'configuracion' => ['learning_mode' => 'guided']]);
        $this->getJson($next)->assertForbidden()->assertJsonPath('module_lock.final_passed', true)
            ->assertJsonPath('module_lock.completed_units', 1)->assertJsonPath('module_lock.total_units', 2);
    }
}
