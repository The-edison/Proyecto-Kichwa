<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\IntentoEvaluacion;
use App\Models\Pregunta;
use App\Models\RespuestaActividad;
use App\Models\Unidad;
use App\Models\Usuario;
use App\Services\PublicacionContenido;
use Database\Seeders\IntermedioAnalisisVerbalEjerciciosSeeder;
use Database\Seeders\IntermedioAnalisisVerbalSeeder;
use Database\Seeders\IntermedioDialogosEjerciciosSeeder;
use Database\Seeders\IntermedioDialogosSeeder;
use Database\Seeders\IntermedioModuloDosEvaluacionSeeder;
use Database\Seeders\IntermedioMorfemasEjerciciosSeeder;
use Database\Seeders\IntermedioMorfemasSeeder;
use Database\Seeders\IntermedioTiemposEjerciciosSeeder;
use Database\Seeders\IntermedioTiemposSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class IntermedioModuloDosEvaluacionTest extends TestCase
{
    use UsesPostgreSQL;

    private function exam(): EvaluacionKichwa
    {
        $this->seed([
            IntermedioMorfemasSeeder::class, IntermedioMorfemasEjerciciosSeeder::class,
            IntermedioTiemposSeeder::class, IntermedioTiemposEjerciciosSeeder::class,
            IntermedioAnalisisVerbalSeeder::class, IntermedioAnalisisVerbalEjerciciosSeeder::class,
            IntermedioDialogosSeeder::class, IntermedioDialogosEjerciciosSeeder::class,
            IntermedioModuloDosEvaluacionSeeder::class,
        ]);

        return EvaluacionKichwa::where('configuracion->bank_key', 'intermedio-modulo2-final-v6')->firstOrFail();
    }

    private function complete(Usuario $student, EvaluacionKichwa $exam, ?int $except = null): void
    {
        $units = Unidad::where('id_modulo', $exam->id_modulo)->pluck('id_unidad');
        foreach (PublicacionContenido::exercises()->whereIn('id_unidad', $units)->get() as $exercise) {
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

    private function answers(array $questions, int $correct): array
    {
        return array_map(function (array $question, int $index) use ($correct): array {
            $record = Pregunta::findOrFail($question['id']);
            $answer = $record->solucion_pregunta;
            if ($index >= $correct) {
                $wrong = collect($record->elementos_pregunta)->pluck('id')->diff($answer['seleccion'])->first();
                $answer['seleccion'][0] = $wrong;
            }

            return ['question_id' => $record->id_pregunta, 'answer' => $answer];
        }, $questions, array_keys($questions));
    }

    public function test_reworded_final_replaces_the_previous_bank_without_publishing_two_finals(): void
    {
        $this->seed([IntermedioMorfemasSeeder::class, IntermedioTiemposSeeder::class, IntermedioAnalisisVerbalSeeder::class, IntermedioDialogosSeeder::class]);
        $unit = Unidad::where('configuracion->guided_lesson', 'short-dialogues')->firstOrFail();
        $previous = EvaluacionKichwa::create(['id_modulo' => $unit->id_modulo, 'id_unidad' => null, 'id_tema' => null,
            'titulo_evaluacion' => 'Prueba anterior', 'tipo_evaluacion' => 'modulo', 'publicado' => true,
            'configuracion' => ['managed' => true, 'final' => true, 'bank_key' => 'intermedio-modulo2-final-v5']]);

        $this->seed(IntermedioModuloDosEvaluacionSeeder::class);
        $this->seed(IntermedioModuloDosEvaluacionSeeder::class);

        $this->assertFalse($previous->fresh()->publicado);
        $this->assertSame(1, EvaluacionKichwa::where('id_modulo', $unit->id_modulo)->where('publicado', true)->count());
        $current = EvaluacionKichwa::where('configuracion->bank_key', 'intermedio-modulo2-final-v6')->firstOrFail();
        $this->assertSame('¿Cuál es la diferencia entre -kamak y -kama?', Pregunta::where('id_evaluacion', $current->id_evaluacion)->where('orden_pregunta', 2)->firstOrFail()->enunciado_pregunta);
        $this->assertSame(20, Pregunta::where('id_evaluacion', $current->id_evaluacion)->count());
        $prompts = Pregunta::where('id_evaluacion', $current->id_evaluacion)->orderBy('orden_pregunta')->pluck('enunciado_pregunta')->all();
        $this->assertSame('¿Qué oración expresa una acción de ayer?', $prompts[6]);
        $this->assertSame('Alguien pregunta «Imata ruran?» (¿Qué hace?). ¿Qué respuesta corresponde?', $prompts[17]);
        $this->assertSame('¿Qué oración expresa una acción en presente?', $prompts[8]);
        $this->assertSame('Lee: «Kaya ñuka wasiman risha. Wasipi samarisha». ¿Dónde descansaré?', $prompts[19]);
    }

    public function test_final_unlocks_only_after_all_current_activities_in_all_four_units_are_correct(): void
    {
        $exam = $this->exam();
        $student = Usuario::factory()->create();
        $url = '/api/evaluations/'.$exam->id_evaluacion;
        $this->postJson($url.'/attempts')->assertUnauthorized();
        Sanctum::actingAs($student);
        $this->getJson('/api/modules/'.$exam->id_modulo)->assertOk()
            ->assertJsonPath('final_evaluation.unlocked', false)->assertJsonPath('final_evaluation.total_units', 4)
            ->assertJsonPath('final_evaluation.question_count', 20);
        $this->getJson($url)->assertOk()->assertJsonPath('questions', [])->assertJsonPath('module_final.unlocked', false);
        $unit = Unidad::where('id_modulo', $exam->id_modulo)->where('orden_unidad', 4)->firstOrFail();
        $missing = PublicacionContenido::exercises($unit->id_unidad)->firstOrFail();
        $this->complete($student, $exam, $missing->id_actividad);
        RespuestaActividad::create(['id_usuario' => $student->id_usuario, 'id_actividad' => $missing->id_actividad,
            'respuesta_actividad' => ['seleccion' => ['o0']], 'acierto_actividad' => false, 'retroalimentacion_actividad' => 'Incorrecto.']);
        $this->getJson('/api/modules/'.$exam->id_modulo)->assertOk()->assertJsonPath('final_evaluation.completed_units', 3);
        $this->postJson($url.'/attempts', ['unlocked' => true, 'score' => 100])->assertForbidden()
            ->assertJsonPath('message', 'Completa correctamente todas las actividades de todas las unidades del módulo para habilitar la prueba final.');
        $this->assertDatabaseCount('intentos_evaluacion', 0);
        $this->complete($student, $exam);
        $this->getJson('/api/modules/'.$exam->id_modulo)->assertOk()->assertJsonPath('final_evaluation.unlocked', true);
        $this->postJson($url.'/attempts')->assertOk()->assertJsonCount(20, 'questions');
        Sanctum::actingAs(Usuario::factory()->create());
        $this->postJson($url.'/attempts')->assertForbidden();
    }

    public function test_twenty_questions_cover_each_unit_and_pass_at_eighty_percent_without_losing_history(): void
    {
        $exam = $this->exam();
        $student = Usuario::factory()->create();
        $this->complete($student, $exam);
        Sanctum::actingAs($student);
        $url = '/api/evaluations/'.$exam->id_evaluacion;
        $start = $this->postJson($url.'/attempts')->assertOk()->assertJsonCount(20, 'questions')
            ->assertDontSee('correct_answer')->assertDontSee('solution')->assertDontSee('correct_feedback')->assertDontSee('incorrect_feedback')->json();
        $counts = array_count_values(array_map(fn (array $question): string => explode(' · ', $question['config']['title'])[0], $start['questions']));
        ksort($counts);
        $this->assertSame(['Unidad 1' => 5, 'Unidad 2' => 5, 'Unidad 3' => 5, 'Unidad 4' => 5], $counts);
        $this->postJson($url.'/attempts')->assertOk()->assertJsonPath('attempt_id', $start['attempt_id']);
        $answers = $this->answers($start['questions'], 16);
        $draft = array_column($answers, 'answer', 'question_id');
        $this->patchJson('/api/attempts/'.$start['attempt_id'], ['answers' => $draft])->assertOk();
        $this->getJson('/api/attempts/'.$start['attempt_id'])->assertOk()->assertJsonPath('answers.'.array_key_first($draft), $draft[array_key_first($draft)]);
        $this->postJson($url.'/submit', ['attempt_id' => $start['attempt_id'], 'answers' => array_slice($answers, 1)])->assertUnprocessable();
        $this->assertDatabaseCount('respuestas_evaluacion', 0);
        $payload = ['attempt_id' => $start['attempt_id'], 'answers' => $answers, 'score' => 1000];
        $result = $this->postJson($url.'/submit', $payload)->assertOk()->assertJsonPath('score', 80)
            ->assertJsonPath('passed', true)->assertJsonPath('correct_count', 16)->assertJsonPath('xp_earned', 210)->json();
        $expected = Pregunta::findOrFail($start['questions'][0]['id'])->solucion_pregunta;
        $this->assertSame($expected, $result['results'][0]['correct_answer']);
        $this->getJson('/api/attempts/'.$start['attempt_id'])->assertOk()->assertJsonPath('result.results.0.correct_answer', $expected);
        $this->postJson($url.'/submit', $payload)->assertOk()->assertExactJson($result);
        $this->assertDatabaseHas('intentos_evaluacion', ['id_intento' => $start['attempt_id'], 'estado_intento' => 'finalizado']);
        $this->assertDatabaseCount('respuestas_evaluacion', 20);
        $this->getJson('/api/modules/'.$exam->id_modulo)->assertOk()->assertJsonPath('final_evaluation.best_score', 80)->assertJsonPath('final_evaluation.passed', true)
            ->assertJsonPath('final_evaluation.latest_score', 80)->assertJsonPath('final_evaluation.latest_passed', true);
        $ids = Pregunta::where('id_evaluacion', $exam->id_evaluacion)->pluck('id_pregunta')->all();
        $this->seed(IntermedioModuloDosEvaluacionSeeder::class);
        $this->assertSame($ids, Pregunta::where('id_evaluacion', $exam->id_evaluacion)->pluck('id_pregunta')->all());
        $this->getJson('/api/attempts/'.$start['attempt_id'])->assertOk()->assertJsonPath('result.score', 80);
        $retry = $this->postJson($url.'/attempts')->assertOk()->json();
        $this->postJson($url.'/submit', ['attempt_id' => $retry['attempt_id'], 'answers' => $this->answers($retry['questions'], 15)])
            ->assertOk()->assertJsonPath('score', 75)->assertJsonPath('passed', false);
        $this->getJson('/api/modules/'.$exam->id_modulo)->assertOk()->assertJsonPath('final_evaluation.best_score', 80)->assertJsonPath('final_evaluation.passed', true);
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/attempts/'.$start['attempt_id'])->assertNotFound();
    }

    public function test_an_open_attempt_cannot_skip_a_new_required_activity(): void
    {
        $exam = $this->exam();
        $student = Usuario::factory()->create();
        $this->complete($student, $exam);
        Sanctum::actingAs($student);
        $url = '/api/evaluations/'.$exam->id_evaluacion;
        $start = $this->postJson($url.'/attempts')->assertOk()->json();
        $unit = Unidad::where('id_modulo', $exam->id_modulo)->firstOrFail();
        $new = PublicacionContenido::exercises($unit->id_unidad)->firstOrFail()->replicate();
        $new->origen_reactivo = 'intermedio-new-module-requirement';
        $new->orden_actividad = 1 + Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
        $new->save();
        $this->getJson('/api/attempts/'.$start['attempt_id'])->assertForbidden();
        $this->patchJson('/api/attempts/'.$start['attempt_id'], ['answers' => []])->assertForbidden();
        $this->postJson($url.'/submit', ['attempt_id' => $start['attempt_id'], 'answers' => $this->answers($start['questions'], 20)])->assertForbidden();
        $this->assertSame('en_curso', IntentoEvaluacion::findOrFail($start['attempt_id'])->estado_intento);
    }
}
