<?php

namespace Tests\Feature;

use App\Models\EvaluacionKichwa;
use App\Models\IntentoEvaluacion;
use App\Models\Modulo;
use App\Models\Pregunta;
use App\Models\Tema;
use App\Models\Unidad;
use App\Models\Usuario;
use App\Services\ContratoEjercicio;
use App\Services\KichwaResource;
use Database\Seeders\UnidadUnoSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class LessonMasteryTest extends TestCase
{
    use UsesPostgreSQL;

    private function prepareLessons(): void
    {
        $this->seed(UnidadUnoSeeder::class);
        Modulo::query()->update(['publicado' => true]);
        Unidad::query()->update(['publicado' => true]);
        Tema::query()->update(['publicado' => true]);
        foreach (Pregunta::all() as $question) {
            $config = $question->configuracion;
            if (($config['requires_audio'] ?? false) || ($config['requires_images'] ?? false)) {
                continue;
            }
            $config['reviewed'] = true;
            $question->update(['configuracion' => $config, 'publicado' => true]);
        }
        EvaluacionKichwa::query()->update(['publicado' => true]);
    }

    private function answers(array $questions): array
    {
        return array_map(function ($data): array {
            $question = Pregunta::findOrFail($data['id']);
            $solution = $question->solucion_pregunta;
            if ($question->tipo_pregunta === 'completar') {
                $solution['textos'] = array_map(fn ($values) => $values[0], $solution['textos']);
            }

            return ['question_id' => $question->id_pregunta, 'answer' => $solution];
        }, $questions);
    }

    public function test_complete_learning_path_resumes_and_rewards_only_once(): void
    {
        $this->prepareLessons();
        $user = Usuario::factory()->create();
        Sanctum::actingAs($user);
        $evaluations = EvaluacionKichwa::orderBy('id_evaluacion')->get();
        $final = $evaluations->last();
        $this->postJson('/api/evaluations/'.$final->id_evaluacion.'/attempts')->assertForbidden();
        foreach ($evaluations as $evaluation) {
            $this->travel(61)->seconds();
            $url = '/api/evaluations/'.$evaluation->id_evaluacion;
            $start = $this->postJson($url.'/attempts')->assertOk()->assertJsonCount(10, 'questions')->assertDontSee('solution')->assertDontSee('explanation')->json();
            $again = $this->postJson($url.'/attempts')->assertOk()->json();
            $this->assertSame($start['questions'], $again['questions']);
            $answers = $this->answers($start['questions']);
            $draft = array_column($answers, 'answer', 'question_id');
            $this->patchJson('/api/attempts/'.$start['attempt_id'], ['answers' => $draft])->assertOk();
            $this->getJson('/api/attempts/'.$start['attempt_id'])->assertOk()->assertJsonPath('answers.'.array_key_first($draft), $draft[array_key_first($draft)]);
            $payload = ['attempt_id' => $start['attempt_id'], 'answers' => $answers, 'score' => 0, 'xp' => 99999];
            $result = $this->postJson($url.'/submit', $payload)->assertOk()->assertJsonPath('score', 100)->assertJsonPath('stars', 3)->json();
            $this->postJson($url.'/submit', $payload)->assertOk()->assertExactJson($result);
            $retry = $this->postJson($url.'/attempts')->assertOk()->json();
            $this->postJson($url.'/submit', ['attempt_id' => $retry['attempt_id'], 'answers' => $this->answers($retry['questions'])])->assertOk()->assertJsonPath('xp_earned', 0);
        }
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 410)->assertJsonCount(1, 'medals')->assertJsonCount(1, 'completed_units')->assertJsonCount(3, 'mastered_topics');
        $this->assertDatabaseCount('recompensas', 34);
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/attempts/'.$start['attempt_id'])->assertNotFound();
        $this->patchJson('/api/attempts/'.$start['attempt_id'], ['answers' => $draft])->assertNotFound();
        $this->postJson('/api/admin/preview', [])->assertForbidden();
    }

    public function test_seed_is_idempotent_and_pending_content_cannot_be_published(): void
    {
        $this->seed(UnidadUnoSeeder::class);
        $counts = [Tema::count(), Pregunta::count()];
        $this->seed(UnidadUnoSeeder::class);
        $this->assertSame($counts, [Tema::count(), Pregunta::count()]);
        $this->assertSame([4, 62], $counts);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $question = Pregunta::firstOrFail();
        $this->patchJson('/api/admin/questions/'.$question->id_pregunta, ['published' => true])->assertUnprocessable()->assertJsonValidationErrors('publication');
        $evaluation = EvaluacionKichwa::firstOrFail();
        $this->patchJson('/api/admin/evaluations/'.$evaluation->id_evaluacion, ['published' => true])->assertUnprocessable();
        $pending = Pregunta::where('configuracion->requires_audio', true)->firstOrFail();
        $config = $pending->configuracion;
        $config['reviewed'] = true;
        $this->patchJson('/api/admin/questions/'.$pending->id_pregunta, ['config' => $config, 'published' => true])->assertUnprocessable()->assertJsonValidationErrors('publication');
        $preview = KichwaResource::present('questions', $question, true);
        $answer = $this->answers([['id' => $question->id_pregunta]])[0]['answer'];
        $this->postJson('/api/admin/preview', ['exercise' => $preview, 'answer' => $answer])->assertOk()->assertJsonPath('is_correct', true);
        $this->assertDatabaseCount('intentos_evaluacion', 0);
        $this->assertDatabaseCount('recompensas', 0);
    }

    public function test_ordering_selection_limits_and_normalization_are_validated_on_server(): void
    {
        $this->seed(UnidadUnoSeeder::class);
        $ordered = KichwaResource::present('questions', Pregunta::where('tipo_pregunta', 'ordenar')->firstOrFail(), true);
        $this->assertTrue(ContratoEjercicio::grade($ordered, $ordered['solution']));
        $this->assertFalse(ContratoEjercicio::grade($ordered, ['orden' => array_reverse($ordered['solution']['orden'])]));
        $written = ['type' => 'completar', 'elements' => [['id' => 'a', 'texto' => 'Significado']], 'solution' => ['textos' => ['a' => ['Corazón']]], 'config' => ['ignore_accents' => true]];
        $this->assertTrue(ContratoEjercicio::grade($written, ['textos' => ['a' => '  CORAZON  ']]));
        $written['config']['ignore_accents'] = false;
        $this->assertFalse(ContratoEjercicio::grade($written, ['textos' => ['a' => 'corazon']]));
    }

    public function test_new_version_preserves_old_attempt_and_question_content(): void
    {
        $this->prepareLessons();
        Sanctum::actingAs(Usuario::factory()->create());
        $evaluation = EvaluacionKichwa::firstOrFail();
        $start = $this->postJson('/api/evaluations/'.$evaluation->id_evaluacion.'/attempts')->assertOk()->json();
        $question = Pregunta::findOrFail($start['questions'][0]['id']);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->patchJson('/api/admin/questions/'.$question->id_pregunta, ['prompt' => 'Cambiar el historial'])->assertStatus(409);
        $copy = $this->postJson('/api/admin/evaluations/'.$evaluation->id_evaluacion.'/version')->assertCreated()->assertJsonPath('published', false)->json('id');
        $this->assertSame($question->enunciado_pregunta, $question->fresh()->enunciado_pregunta);
        $this->assertSame(11, Pregunta::where('id_evaluacion', $copy)->count());
        $this->assertSame(array_column($start['questions'], 'id'), IntentoEvaluacion::findOrFail($start['attempt_id'])->preguntas_seleccionadas);
    }

    public function test_partial_scores_keep_the_best_result_and_reward_each_question_once(): void
    {
        $this->prepareLessons();
        Sanctum::actingAs(Usuario::factory()->create());
        $evaluation = EvaluacionKichwa::firstOrFail();
        foreach ([7, 8, 9, 10, 7] as $correctCount) {
            $this->travel(61)->seconds();
            $start = $this->postJson('/api/evaluations/'.$evaluation->id_evaluacion.'/attempts')->assertOk()->json();
            $answers = $this->answers($start['questions']);
            foreach (array_slice($answers, $correctCount, null, true) as $index => $answer) {
                $question = Pregunta::findOrFail($answer['question_id']);
                if ($question->tipo_pregunta === 'completar') {
                    $answers[$index]['answer'] = ['textos' => ['palabra' => 'incorrecta']];
                } elseif ($question->tipo_pregunta === 'ordenar') {
                    $answers[$index]['answer'] = ['orden' => array_reverse($question->solucion_pregunta['orden'])];
                } elseif ($question->tipo_pregunta === 'relacionar') {
                    $pairs = $question->solucion_pregunta['pares'];
                    $destination = $pairs[0]['destino'];
                    $pairs[0]['destino'] = $pairs[1]['destino'];
                    $pairs[1]['destino'] = $destination;
                    $answers[$index]['answer'] = ['pares' => $pairs];
                } else {
                    $wrong = collect($question->elementos_pregunta)->pluck('id')->diff($question->solucion_pregunta['seleccion'])->first();
                    $answers[$index]['answer'] = ['seleccion' => [$wrong]];
                }
            }
            $this->postJson('/api/evaluations/'.$evaluation->id_evaluacion.'/submit', ['attempt_id' => $start['attempt_id'], 'answers' => $answers])
                ->assertOk()->assertJsonPath('score', $correctCount * 10)->assertJsonPath('stars', $correctCount === 10 ? 3 : max(0, $correctCount - 7));
        }
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 120)->assertJsonPath('lessons.0.best_score', 100)->assertJsonPath('lessons.0.latest_score', 70)->assertJsonPath('lessons.0.stars', 3);
    }

    public function test_admin_can_save_incomplete_drafts_review_banks_and_preview_without_progress(): void
    {
        $this->seed(UnidadUnoSeeder::class);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $unit = Unidad::firstOrFail();
        $draft = $this->postJson('/api/admin/exercises', ['unit_id' => $unit->id_unidad, 'type' => 'seleccion_multiple', 'prompt' => '', 'elements' => [], 'zones' => [], 'solution' => [], 'published' => false, 'config' => ['managed' => true, 'reviewed' => false]])
            ->assertCreated()->assertJsonPath('published', false)->json('id');
        $this->patchJson('/api/admin/exercises/'.$draft, ['published' => true])->assertUnprocessable();
        $evaluation = EvaluacionKichwa::firstOrFail();
        $this->postJson('/api/admin/evaluations/'.$evaluation->id_evaluacion.'/review-bank', [])->assertUnprocessable();
        $this->postJson('/api/admin/evaluations/'.$evaluation->id_evaluacion.'/review-bank', ['confirmed' => true])->assertOk()->assertJsonPath('published_count', 10)->assertJsonCount(1, 'pending');
        $preview = $this->getJson('/api/admin/evaluations/'.$evaluation->id_evaluacion.'/preview')->assertOk()->assertJsonCount(10, 'questions')->json('questions');
        $this->postJson('/api/admin/evaluations/'.$evaluation->id_evaluacion.'/preview', ['answers' => $this->answers($preview)])->assertOk()->assertJsonPath('score', 100);
        $this->assertDatabaseCount('intentos_evaluacion', 0);
        $this->assertDatabaseCount('recompensas', 0);
        $level = $this->postJson('/api/admin/levels', ['name' => 'Nivel adicional', 'description' => 'Contenido futuro', 'published' => false])->assertCreated()->json('id');
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/levels')->assertOk()->assertJsonMissing(['id' => $level]);
        $this->postJson('/api/admin/evaluations/'.$evaluation->id_evaluacion.'/review-bank', ['confirmed' => true])->assertForbidden();
    }

    public function test_pairs_are_checked_without_rewards_and_foreign_questions_are_rejected(): void
    {
        $this->prepareLessons();
        Sanctum::actingAs(Usuario::factory()->create());
        $evaluation = EvaluacionKichwa::orderBy('id_evaluacion')->get()[2];
        $start = $this->postJson('/api/evaluations/'.$evaluation->id_evaluacion.'/attempts')->assertOk()->json();
        $question = Pregunta::where('id_evaluacion', $evaluation->id_evaluacion)->where('tipo_pregunta', 'relacionar')->firstOrFail();
        $this->postJson('/api/attempts/'.$start['attempt_id'].'/pair', ['question_id' => $question->id_pregunta, 'origin' => 'k0', 'destination' => 's0'])->assertOk()->assertJsonPath('is_correct', true);
        $this->postJson('/api/attempts/'.$start['attempt_id'].'/pair', ['question_id' => $question->id_pregunta, 'origin' => 'k0', 'destination' => 's1'])->assertOk()->assertJsonPath('is_correct', false);
        $this->postJson('/api/attempts/'.$start['attempt_id'].'/pair', ['question_id' => Pregunta::firstOrFail()->id_pregunta, 'origin' => 'k0', 'destination' => 's0'])->assertUnprocessable();
        $this->patchJson('/api/attempts/'.$start['attempt_id'], ['answers' => [$question->id_pregunta => ['pares' => [['origen' => 'k0', 'destino' => 's0']]]]])->assertOk();
        $this->getJson('/api/attempts/'.$start['attempt_id'])->assertOk()->assertJsonPath('confirmed_pairs.'.$question->id_pregunta, ['k0']);
        $text = Pregunta::where('id_evaluacion', $evaluation->id_evaluacion)->where('tipo_pregunta', 'completar')->firstOrFail();
        $this->patchJson('/api/attempts/'.$start['attempt_id'], ['answers' => [$text->id_pregunta => ['textos' => 'bad']]])->assertUnprocessable();
        $this->getJson('/api/evaluations/not-a-number')->assertNotFound();
        $this->getJson('/api/evaluations/999999999999999999999999')->assertNotFound();
        $this->assertDatabaseCount('recompensas', 0);
    }

    public function test_practice_versions_preserve_progress_and_reward_only_the_first_correct_answer(): void
    {
        $this->prepareLessons();
        $admin = Usuario::factory()->administrador()->create();
        $student = Usuario::factory()->create();
        Sanctum::actingAs($admin);
        $unit = Unidad::firstOrFail();
        $topic = Tema::firstOrFail();
        $payload = ['unit_id' => $unit->id_unidad, 'topic_id' => $topic->id_tema, 'type' => 'seleccion_multiple', 'prompt' => 'Selecciona A.',
            'elements' => [['id' => 'a', 'texto' => 'A'], ['id' => 'i', 'texto' => 'I']], 'zones' => [], 'solution' => ['seleccion' => ['a']],
            'published' => true, 'config' => ['managed' => true, 'reviewed' => true, 'max_selections' => 1, 'correct_feedback' => 'Bien hecho.']];
        $original = $this->postJson('/api/admin/exercises', $payload)->assertCreated()->json('id');
        Sanctum::actingAs($student);
        $this->postJson('/api/exercises/'.$original.'/answer', ['answer' => ['seleccion' => ['a']]])->assertOk()->assertJsonPath('xp_earned', 10)->assertJsonPath('feedback', 'Bien hecho.');
        $this->postJson('/api/exercises/'.$original.'/answer', ['answer' => ['seleccion' => ['a']]])->assertOk()->assertJsonPath('xp_earned', 0);
        Sanctum::actingAs($admin);
        $copy = $this->postJson('/api/admin/exercises/'.$original.'/version')->assertCreated()->json('id');
        $this->patchJson('/api/admin/exercises/'.$copy, ['prompt' => 'Nueva instrucción: selecciona A.', 'config' => $payload['config'], 'published' => true])->assertOk();
        $this->patchJson('/api/admin/exercises/'.$original, ['published' => false])->assertOk();
        Sanctum::actingAs($student);
        $this->getJson('/api/units/'.$unit->id_unidad.'/exercises?topic_id='.$topic->id_tema)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $copy);
        $this->getJson('/api/units/'.$unit->id_unidad.'/contents')->assertOk()->assertJsonPath('data.0.percentage', 100);
        $this->postJson('/api/exercises/'.$copy.'/answer', ['answer' => ['seleccion' => ['a']]])->assertOk()->assertJsonPath('xp_earned', 0);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 10);
        $this->assertDatabaseCount('respuestas_actividad', 3);
        $this->assertDatabaseCount('recompensas', 1);
    }
}
