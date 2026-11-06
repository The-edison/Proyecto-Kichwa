<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\IntentoEvaluacion;
use App\Models\Modulo;
use App\Models\Nivel;
use App\Models\Pregunta;
use App\Models\RespuestaActividad;
use App\Models\Unidad;
use App\Models\Usuario;
use App\Services\DominioLecciones;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class ReanudarEvaluacionesTest extends TestCase
{
    use UsesPostgreSQL;

    public static function evaluationTypes(): array
    {
        return ['module final' => ['modulo'], 'unit test' => ['unidad']];
    }

    #[DataProvider('evaluationTypes')]
    public function test_open_attempt_resumes_across_versions_and_keeps_answers_questions_and_results(string $type): void
    {
        $level = Nivel::where('orden_nivel', 1)->firstOrFail();
        $module = Modulo::create(['id_nivel' => $level->id_nivel, 'nombre_modulo' => 'Prueba de continuidad', 'descripcion_modulo' => 'Continuar una prueba.', 'orden_modulo' => 1, 'publicado' => true]);
        $unit = Unidad::create(['id_modulo' => $module->id_modulo, 'titulo_unidad' => 'Unidad de prueba', 'objetivo_unidad' => 'Aprender.', 'orden_unidad' => 1, 'publicado' => true, 'configuracion' => ['learning_mode' => 'guided']]);
        $elements = [['id' => 'yes', 'texto' => 'Correcta'], ['id' => 'no', 'texto' => 'Incorrecta']];
        $activity = Actividad::create(['id_unidad' => $unit->id_unidad, 'tipo_actividad' => 'seleccion_multiple', 'enunciado_actividad' => 'Elige la respuesta.', 'elementos_actividad' => $elements, 'zonas_actividad' => [], 'solucion_actividad' => ['seleccion' => ['yes']], 'orden_actividad' => 1, 'publicado' => true, 'configuracion' => ['managed' => true, 'reviewed' => true, 'max_selections' => 1]]);
        $student = Usuario::factory()->create();
        RespuestaActividad::create(['id_usuario' => $student->id_usuario, 'id_actividad' => $activity->id_actividad, 'respuesta_actividad' => ['seleccion' => ['yes']], 'acierto_actividad' => true, 'retroalimentacion_actividad' => 'Correcto.']);
        $original = EvaluacionKichwa::create(['id_modulo' => $type === 'modulo' ? $module->id_modulo : null, 'id_unidad' => $type === 'unidad' ? $unit->id_unidad : null, 'id_tema' => null, 'tipo_evaluacion' => $type, 'titulo_evaluacion' => 'Primera versión', 'publicado' => true, 'configuracion' => ['managed' => true, 'final' => $type === 'modulo', 'question_count' => 1, 'pass_percentage' => 80, 'prerequisite_units' => [$unit->id_unidad]]]);
        $question = Pregunta::create(['id_evaluacion' => $original->id_evaluacion, 'tipo_pregunta' => 'seleccion_multiple', 'enunciado_pregunta' => 'Pregunta original.', 'elementos_pregunta' => $elements, 'zonas_pregunta' => [], 'solucion_pregunta' => ['seleccion' => ['yes']], 'orden_pregunta' => 1, 'puntaje_pregunta' => 1, 'publicado' => true, 'configuracion' => ['managed' => true, 'reviewed' => true, 'max_selections' => 1]]);
        Sanctum::actingAs($student);
        $start = $this->postJson('/api/evaluations/'.$original->id_evaluacion.'/attempts')->assertOk()->json();
        $draft = [$question->id_pregunta => ['seleccion' => ['yes']]];
        $this->patchJson('/api/attempts/'.$start['attempt_id'], ['answers' => $draft])->assertOk();

        $original->update(['publicado' => false]);
        $replacement = $original->replicate();
        $replacement->titulo_evaluacion = 'Nueva redacción';
        $replacement->publicado = true;
        $replacement->save();
        $newQuestion = $question->replicate();
        $newQuestion->id_evaluacion = $replacement->id_evaluacion;
        $newQuestion->enunciado_pregunta = 'Pregunta revisada.';
        $newQuestion->save();

        $this->getJson('/api/evaluations/'.$replacement->id_evaluacion)->assertOk()->assertJsonPath('history.0.id', $start['attempt_id']);
        $this->getJson('/api/evaluations/'.$replacement->id_evaluacion)->assertOk()->assertJsonPath('module_id', $module->id_modulo);
        $this->postJson('/api/evaluations/'.$replacement->id_evaluacion.'/attempts')->assertOk()
            ->assertJsonPath('attempt_id', $start['attempt_id'])->assertJsonPath('evaluation_id', $original->id_evaluacion)
            ->assertJsonPath('questions.0.id', $question->id_pregunta)->assertJsonPath('answers.'.$question->id_pregunta.'.seleccion', ['yes']);
        $this->getJson('/api/attempts/'.$start['attempt_id'])->assertOk()->assertJsonPath('questions.0.prompt', 'Pregunta original.');
        $this->assertDatabaseCount('intentos_evaluacion', 1);
        $updated = $this->postJson('/api/evaluations/'.$replacement->id_evaluacion.'/attempts', ['new_version' => true])->assertOk()
            ->assertJsonPath('evaluation_id', $replacement->id_evaluacion)->assertJsonPath('questions.0.id', $newQuestion->id_pregunta)->json();
        $this->assertNotSame($start['attempt_id'], $updated['attempt_id']);
        $this->postJson('/api/evaluations/'.$replacement->id_evaluacion.'/attempts', ['new_version' => true])->assertOk()->assertJsonPath('attempt_id', $updated['attempt_id']);
        $this->getJson('/api/attempts/'.$start['attempt_id'])->assertOk()->assertJsonPath('answers.'.$question->id_pregunta.'.seleccion', ['yes']);
        $replacement->update(['publicado' => false]);
        $this->postJson('/api/evaluations/'.$original->id_evaluacion.'/attempts', ['new_version' => true])->assertNotFound();
        $this->getJson('/api/attempts/'.$start['attempt_id'])->assertNotFound();
        $this->patchJson('/api/attempts/'.$start['attempt_id'], ['answers' => $draft])->assertNotFound();
        $replacement->update(['publicado' => true]);
        $this->patchJson('/api/attempts/'.$start['attempt_id'], ['answers' => [$question->id_pregunta => ['seleccion' => ['no']]]])->assertOk();
        $this->getJson('/api/attempts/'.$start['attempt_id'])->assertOk()->assertJsonPath('answers.'.$question->id_pregunta.'.seleccion', ['no']);

        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/attempts/'.$start['attempt_id'])->assertNotFound();
        $this->patchJson('/api/attempts/'.$start['attempt_id'], ['answers' => $draft])->assertNotFound();
        $this->postJson('/api/evaluations/'.$replacement->id_evaluacion.'/attempts')->assertStatus($type === 'modulo' ? 403 : 200);
        Sanctum::actingAs($student);
        $module->update(['publicado' => false]);
        $this->getJson('/api/attempts/'.$start['attempt_id'])->assertNotFound();
        $this->patchJson('/api/attempts/'.$start['attempt_id'], ['answers' => $draft])->assertNotFound();
        $module->update(['publicado' => true]);
        $this->postJson('/api/evaluations/'.$original->id_evaluacion.'/submit', ['attempt_id' => $start['attempt_id'], 'answers' => [['question_id' => $question->id_pregunta, 'answer' => ['seleccion' => ['yes']]]]])
            ->assertOk()->assertJsonPath('passed', true)->assertJsonPath('score', 100)
            ->assertJsonPath('results.0.correct_answer.seleccion', ['yes']);
        $attempt = IntentoEvaluacion::findOrFail($start['attempt_id']);
        $legacyResult = $attempt->resultado;
        unset($legacyResult['results'][0]['correct_answer']);
        $attempt->resultado = $legacyResult;
        $this->assertSame(['seleccion' => ['yes']], DominioLecciones::result($attempt)['results'][0]['correct_answer']);
        $this->assertDatabaseHas('respuestas_evaluacion', ['id_intento' => $start['attempt_id'], 'id_evaluacion' => $original->id_evaluacion, 'id_pregunta' => $question->id_pregunta, 'puntaje_respuesta_evaluacion' => 1]);
        if ($type === 'modulo') {
            $this->getJson('/api/modules/'.$module->id_modulo)->assertOk()->assertJsonPath('final_evaluation.passed', true);
            $report = $this->getJson('/api/mastery')->assertOk()->json('learning_report');
            $reported = collect($report['levels'])->flatMap(fn ($level) => $level['modules'])->firstWhere('id', $module->id_modulo);
            $this->assertTrue($reported['completed']);
            $this->assertSame(1, $reported['final_evaluation']['attempt_count']);
        }
        $this->postJson('/api/evaluations/'.$replacement->id_evaluacion.'/submit', ['attempt_id' => $updated['attempt_id'], 'answers' => [['question_id' => $newQuestion->id_pregunta, 'answer' => ['seleccion' => ['yes']]]]])->assertOk();
        $lastAttempt = $updated['attempt_id'];
        for ($retry = 0; $retry < 2; $retry++) {
            $fresh = $this->postJson('/api/evaluations/'.$original->id_evaluacion.'/attempts', ['new_version' => true])->assertOk()
                ->assertJsonPath('evaluation_id', $replacement->id_evaluacion)->assertJsonPath('state', 'en_curso')
                ->assertJsonPath('questions.0.id', $newQuestion->id_pregunta)->json();
            $this->assertNotSame($lastAttempt, $fresh['attempt_id']);
            $this->assertEmpty($fresh['answers']);
            $this->assertNull($fresh['result']);
            $lastAttempt = $fresh['attempt_id'];
            $this->postJson('/api/evaluations/'.$replacement->id_evaluacion.'/submit', ['attempt_id' => $fresh['attempt_id'], 'answers' => [['question_id' => $newQuestion->id_pregunta, 'answer' => ['seleccion' => ['yes']]]]])->assertOk();
        }
        $this->getJson('/api/attempts/'.$start['attempt_id'])->assertOk()->assertJsonPath('result.score', 100);
        $this->getJson('/api/evaluations/'.$replacement->id_evaluacion)->assertOk()
            ->assertJsonCount(1, 'history')->assertJsonPath('history.0.id', $lastAttempt);
    }
}
