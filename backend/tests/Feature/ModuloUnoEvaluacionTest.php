<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\IntentoEvaluacion;
use App\Models\Modulo;
use App\Models\Pregunta;
use App\Models\RespuestaActividad;
use App\Models\Unidad;
use App\Models\Usuario;
use App\Services\PublicacionContenido;
use Database\Seeders\ModuloUnoEvaluacionSeeder;
use Database\Seeders\UnidadesTematicasGuiadasSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class ModuloUnoEvaluacionTest extends TestCase
{
    use UsesPostgreSQL;

    private function exam(): EvaluacionKichwa
    {
        $this->seed(UnidadesTematicasGuiadasSeeder::class);
        $this->seed(ModuloUnoEvaluacionSeeder::class);

        return EvaluacionKichwa::where('tipo_evaluacion', 'modulo')->firstOrFail();
    }

    private function complete(Usuario $student, EvaluacionKichwa $exam, ?int $except = null): void
    {
        $ids = Unidad::where('id_modulo', $exam->id_modulo)->pluck('id_unidad');
        foreach (PublicacionContenido::exercises()->whereIn('id_unidad', $ids)->get() as $exercise) {
            if ($exercise->id_actividad === $except) {
                continue;
            }
            $answer = $exercise->solucion_actividad;
            if ($exercise->tipo_actividad === 'completar') {
                $answer['textos'] = array_map(fn (array $variants): string => $variants[0], $answer['textos']);
            }
            RespuestaActividad::create(['id_usuario' => $student->id_usuario, 'id_actividad' => $exercise->id_actividad,
                'respuesta_actividad' => $answer, 'acierto_actividad' => true, 'retroalimentacion_actividad' => 'Correcto.']);
        }
    }

    private function answers(array $questions, int $correct = 15): array
    {
        return array_map(function (array $question, int $index) use ($correct): array {
            $record = Pregunta::findOrFail($question['id']);
            $answer = $record->solucion_pregunta;
            if ($index >= $correct) {
                $right = $answer['seleccion'];
                $wrong = collect($record->elementos_pregunta)->pluck('id')->diff($right)->first();
                $answer['seleccion'][0] = $wrong;
            }

            return ['question_id' => $record->id_pregunta, 'answer' => $answer];
        }, $questions, array_keys($questions));
    }

    public function test_final_is_locked_until_every_current_activity_in_all_five_units_is_correct(): void
    {
        $exam = $this->exam();
        $student = Usuario::factory()->create();
        $this->postJson('/api/evaluations/'.$exam->id_evaluacion.'/attempts')->assertUnauthorized();
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->postJson('/api/evaluations/'.$exam->id_evaluacion.'/attempts')->assertForbidden();
        Sanctum::actingAs($student);
        $this->getJson('/api/modules/'.$exam->id_modulo)->assertOk()->assertJsonPath('final_evaluation.unlocked', false)->assertJsonPath('final_evaluation.total_units', 5);
        $this->getJson('/api/evaluations/'.$exam->id_evaluacion)->assertOk()->assertJsonPath('questions', [])->assertJsonPath('module_final.unlocked', false);
        $lastUnit = Unidad::where('id_modulo', $exam->id_modulo)->where('orden_unidad', 5)->firstOrFail();
        $missing = PublicacionContenido::exercises($lastUnit->id_unidad)->firstOrFail();
        $this->complete($student, $exam, $missing->id_actividad);
        RespuestaActividad::create(['id_usuario' => $student->id_usuario, 'id_actividad' => $missing->id_actividad,
            'respuesta_actividad' => ['pares' => []], 'acierto_actividad' => false, 'retroalimentacion_actividad' => 'Incorrecto.']);
        $this->getJson('/api/modules/'.$exam->id_modulo)->assertOk()->assertJsonPath('final_evaluation.completed_units', 4);
        $this->postJson('/api/evaluations/'.$exam->id_evaluacion.'/attempts', ['unlocked' => true, 'score' => 100])->assertForbidden();
        $this->assertDatabaseCount('intentos_evaluacion', 0);
        $this->complete($student, $exam);
        $this->getJson('/api/modules/'.$exam->id_modulo)->assertOk()->assertJsonPath('final_evaluation.unlocked', true);
        Sanctum::actingAs(Usuario::factory()->create());
        $this->postJson('/api/evaluations/'.$exam->id_evaluacion.'/attempts')->assertForbidden();
    }

    public function test_fifteen_original_questions_resume_grade_at_eighty_percent_and_preserve_history_when_reseeded(): void
    {
        $exam = $this->exam();
        $student = Usuario::factory()->create();
        $this->complete($student, $exam);
        Sanctum::actingAs($student);
        $url = '/api/evaluations/'.$exam->id_evaluacion;
        $start = $this->postJson($url.'/attempts')->assertOk()->assertJsonCount(15, 'questions')->assertDontSee('solution')->assertDontSee('correct_feedback')->assertDontSee('incorrect_feedback')->json();
        $this->postJson($url.'/attempts')->assertOk()->assertJsonPath('attempt_id', $start['attempt_id']);
        $counts = array_count_values(array_map(fn (array $question): string => explode(' · ', $question['config']['title'])[0], $start['questions']));
        ksort($counts);
        $this->assertSame(['Unidad 1' => 3, 'Unidad 2' => 3, 'Unidad 3' => 3, 'Unidad 4' => 3, 'Unidad 5' => 3], $counts);
        $answers = $this->answers($start['questions'], 12);
        $draft = array_column($answers, 'answer', 'question_id');
        $this->patchJson('/api/attempts/'.$start['attempt_id'], ['answers' => $draft])->assertOk();
        $this->getJson('/api/attempts/'.$start['attempt_id'])->assertOk()->assertJsonPath('answers.'.array_key_first($draft), $draft[array_key_first($draft)]);
        $payload = ['attempt_id' => $start['attempt_id'], 'answers' => $answers, 'score' => 1000];
        $result = $this->postJson($url.'/submit', $payload)->assertOk()->assertJsonPath('score', 80)->assertJsonPath('passed', true)->assertJsonPath('correct_count', 12)->assertJsonPath('xp_earned', 170)->json();
        $this->postJson($url.'/submit', $payload)->assertOk()->assertExactJson($result);
        $this->getJson('/api/modules/'.$exam->id_modulo)->assertOk()->assertJsonPath('final_evaluation.best_score', 80)->assertJsonPath('final_evaluation.passed', true);
        $report = $this->getJson('/api/mastery')->assertOk()->assertJsonPath('learning_report.summary.completed_units', 5)
            ->assertJsonPath('learning_report.summary.completed_modules', 1)->assertJsonPath('learning_report.summary.passed_finals', 1)->json('learning_report');
        $module = collect($report['levels'])->flatMap(fn ($level) => $level['modules'])->firstWhere('id', $exam->id_modulo);
        $this->assertTrue($module['completed']);
        $this->assertSame(1, $module['final_evaluation']['attempt_count']);
        $this->assertNotSame($exam->id_evaluacion, $report['next_step']['id'] ?? null);
        $progress = $this->getJson('/api/progress')->assertOk()->json();
        $finalResult = collect($progress)->flatMap(fn ($level) => $level['evaluation_results'])->firstWhere('evaluation_id', $exam->id_evaluacion);
        $this->assertSame('Prueba final del módulo 1', $finalResult['title']);
        $retry = $this->postJson($url.'/attempts')->assertOk()->json();
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('learning_report.summary.passed_finals', 1);
        $this->postJson($url.'/submit', ['attempt_id' => $retry['attempt_id'], 'answers' => $this->answers($retry['questions'], 11)])->assertOk()->assertJsonPath('passed', false);
        $mastery = $this->getJson('/api/mastery')->assertOk()->json();
        $module = collect($mastery['learning_report']['levels'])->flatMap(fn ($level) => $level['modules'])->firstWhere('id', $exam->id_modulo);
        $this->assertTrue($module['completed']);
        $this->assertSame(80, $module['final_evaluation']['best_score']);
        $this->assertSame(73.33, $module['final_evaluation']['latest_score']);
        $this->assertSame(2, $module['final_evaluation']['attempt_count']);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/admin/learning-results/'.$student->id_usuario)->assertOk()->assertExactJson($mastery);
        Sanctum::actingAs($student);
        $ids = Pregunta::where('id_evaluacion', $exam->id_evaluacion)->pluck('id_pregunta')->all();
        $this->seed(ModuloUnoEvaluacionSeeder::class);
        $this->assertSame($ids, Pregunta::where('id_evaluacion', $exam->id_evaluacion)->pluck('id_pregunta')->all());
        $this->getJson('/api/attempts/'.$start['attempt_id'])->assertOk()->assertJsonPath('result.score', 80);
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/attempts/'.$start['attempt_id'])->assertNotFound();
        $this->patchJson('/api/attempts/'.$start['attempt_id'], ['answers' => $draft])->assertNotFound();
    }

    public function test_incomplete_submission_is_rejected_and_eleven_correct_answers_do_not_pass(): void
    {
        $exam = $this->exam();
        $student = Usuario::factory()->create();
        $this->complete($student, $exam);
        Sanctum::actingAs($student);
        $url = '/api/evaluations/'.$exam->id_evaluacion;
        $start = $this->postJson($url.'/attempts')->assertOk()->json();
        $answers = $this->answers($start['questions'], 11);
        $this->postJson($url.'/submit', ['attempt_id' => $start['attempt_id'], 'answers' => array_slice($answers, 1)])->assertUnprocessable();
        $this->assertDatabaseCount('respuestas_evaluacion', 0);
        $this->postJson('/api/attempts/'.$start['attempt_id'].'/pair', ['question_id' => $start['questions'][0]['id'], 'origin' => 'opcion-1', 'destination' => 'opcion-2'])->assertForbidden();
        $this->postJson($url.'/submit', ['attempt_id' => $start['attempt_id'], 'answers' => $answers])->assertOk()->assertJsonPath('passed', false)->assertJsonPath('score', 73.33)->assertJsonPath('xp_earned', 110);
        $this->assertDatabaseMissing('recompensas', ['id_usuario' => $student->id_usuario, 'clave' => 'modulo:'.$exam->id_modulo]);
    }

    public function test_open_attempt_cannot_bypass_requirements_after_new_content_is_published(): void
    {
        $exam = $this->exam();
        $student = Usuario::factory()->create();
        $this->complete($student, $exam);
        Sanctum::actingAs($student);
        $url = '/api/evaluations/'.$exam->id_evaluacion;
        $start = $this->postJson($url.'/attempts')->assertOk()->json();
        $unit = Unidad::where('id_modulo', $exam->id_modulo)->firstOrFail();
        $new = PublicacionContenido::exercises($unit->id_unidad)->firstOrFail()->replicate();
        $new->origen_reactivo = 'new-module-requirement';
        $new->orden_actividad = 1 + Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
        $new->save();
        $this->postJson($url.'/attempts')->assertForbidden();
        $this->getJson('/api/attempts/'.$start['attempt_id'])->assertForbidden();
        $this->patchJson('/api/attempts/'.$start['attempt_id'], ['answers' => []])->assertForbidden();
        $this->postJson($url.'/submit', ['attempt_id' => $start['attempt_id'], 'answers' => $this->answers($start['questions'])])->assertForbidden();
        $this->assertSame('en_curso', IntentoEvaluacion::findOrFail($start['attempt_id'])->estado_intento);
        $this->complete($student, $exam);
        $this->getJson('/api/attempts/'.$start['attempt_id'])->assertOk();
        Modulo::whereKey($exam->id_modulo)->update(['publicado' => false]);
        $this->getJson('/api/attempts/'.$start['attempt_id'])->assertNotFound();
    }
}
