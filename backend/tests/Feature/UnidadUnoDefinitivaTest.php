<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\Pregunta;
use App\Models\Unidad;
use App\Models\Usuario;
use Database\Seeders\UnidadUnoDefinitivaSeeder;
use Database\Seeders\UnidadUnoEjerciciosSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class UnidadUnoDefinitivaTest extends TestCase
{
    use UsesPostgreSQL;

    private function answer(Actividad|Pregunta $record): array
    {
        $answer = $record instanceof Actividad ? $record->solucion_actividad : $record->solucion_pregunta;
        $type = $record instanceof Actividad ? $record->tipo_actividad : $record->tipo_pregunta;
        if ($type === 'completar') {
            $answer['textos'] = array_map(fn ($values) => $values[0], $answer['textos']);
        }

        return $answer;
    }

    public function test_seven_new_activities_unlock_six_questions_and_preserve_history_and_unique_rewards(): void
    {
        Storage::fake('public');
        $this->seed(UnidadUnoEjerciciosSeeder::class);
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $old = Actividad::firstOrFail();
        $this->postJson('/api/exercises/'.$old->id_actividad.'/answer', ['answer' => $this->answer($old)])->assertOk()->assertJsonPath('xp_earned', 10);
        $history = DB::table('respuestas_actividad')->get()->toJson();
        $rewards = DB::table('recompensas')->get()->toJson();
        $this->seed(UnidadUnoDefinitivaSeeder::class);
        $this->assertSame($history, DB::table('respuestas_actividad')->get()->toJson());
        $this->assertSame($rewards, DB::table('recompensas')->get()->toJson());
        $this->assertFalse($old->fresh()->publicado);
        $unit = Unidad::firstOrFail();
        $evaluation = EvaluacionKichwa::where('publicado', true)->firstOrFail();
        $sequence = $this->getJson('/api/units/'.$unit->id_unidad.'/sequence')->assertOk()->assertJsonCount(7, 'exercises')->assertJsonPath('completed_count', 0)->assertJsonPath('unlocked', false)->json();
        $this->getJson('/api/units/'.$unit->id_unidad.'/contents')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/modules/'.$unit->id_modulo.'/contents')->assertOk()->assertJsonPath('data.0.exercise_count', 7)->assertJsonPath('data.0.evaluation_question_count', 6)->assertJsonPath('data.0.evaluation_locked', true);
        $this->postJson('/api/evaluations/'.$evaluation->id_evaluacion.'/attempts')->assertForbidden();
        $this->getJson('/api/units/'.$unit->id_unidad.'/exercises')->assertOk()->assertJsonCount(7, 'data')->assertDontSee('solution')->assertDontSee('word_target');
        foreach ($sequence['exercises'] as $index => $exercise) {
            $record = Actividad::findOrFail($exercise['id']);
            if ($index === 0) {
                $this->postJson('/api/exercises/'.$record->id_actividad.'/answer', ['answer' => ['seleccion' => ['e1', 'e3', 'e5']]])->assertOk()->assertJsonPath('is_correct', false)->assertJsonPath('xp_earned', 0);
            }
            $answer = $this->answer($record);
            if ($record->tipo_actividad === 'ordenar') {
                $answer['orden'] = ['s2', 'i', 's1', 'a'];
            }
            if ($index === 6) {
                $answer['textos']['palabra'] = '  wasi  ';
            }
            $this->postJson('/api/exercises/'.$record->id_actividad.'/answer', ['answer' => $answer, 'xp' => 9999])->assertOk()->assertJsonPath('is_correct', true)->assertJsonPath('xp_earned', 10);
            $this->postJson('/api/exercises/'.$record->id_actividad.'/answer', ['answer' => $answer])->assertOk()->assertJsonPath('xp_earned', 0);
        }
        $this->getJson('/api/units/'.$unit->id_unidad.'/sequence')->assertOk()->assertJsonPath('completed_count', 7)->assertJsonPath('unlocked', true);
        foreach ([4, 5, 6] as $correctCount) {
            $start = $this->postJson('/api/evaluations/'.$evaluation->id_evaluacion.'/attempts')->assertOk()->assertJsonCount(6, 'questions')->assertDontSee('solution')->assertDontSee('word_target')->assertDontSee('reveal_highlight')->json();
            $ids = array_column($start['questions'], 'id');
            $this->assertSame(Pregunta::where('id_evaluacion', $evaluation->id_evaluacion)->orderBy('orden_pregunta')->pluck('id_pregunta')->all(), $ids);
            $answers = array_map(function ($q): array {
                $record = Pregunta::findOrFail($q['id']);

                return ['question_id' => $record->id_pregunta, 'answer' => $this->answer($record)];
            }, $start['questions']);
            if ($correctCount < 6) {
                $answers[5]['answer'] = ['textos' => ['palabra' => 'incorrecta']];
            }
            if ($correctCount < 5) {
                $answers[4]['answer'] = ['orden' => ['a', 's1', 's2', 'i']];
            }
            $this->patchJson('/api/attempts/'.$start['attempt_id'], ['answers' => array_column($answers, 'answer', 'question_id')])->assertOk();
            $this->getJson('/api/attempts/'.$start['attempt_id'])->assertOk()->assertJsonPath('questions.0.id', $ids[0]);
            $payload = ['attempt_id' => $start['attempt_id'], 'answers' => $answers];
            $result = $this->postJson('/api/evaluations/'.$evaluation->id_evaluacion.'/submit', $payload)->assertOk()->assertJsonPath('correct_count', $correctCount)->assertJsonPath('passed', $correctCount >= 5)->assertJsonPath('xp_earned', $correctCount * 10 + ($correctCount >= 5 ? 50 : 0))->json();
            $this->postJson('/api/evaluations/'.$evaluation->id_evaluacion.'/submit', $payload)->assertOk()->assertExactJson($result);
        }
        $this->getJson('/api/units/'.$unit->id_unidad.'/sequence')->assertOk()->assertJsonPath('first_score', 66.67)->assertJsonPath('best_score', 100)->assertJsonPath('passed', true);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 330);
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/attempts/'.$start['attempt_id'])->assertNotFound();
        $this->getJson('/api/units/'.$unit->id_unidad.'/sequence')->assertOk()->assertJsonPath('completed_count', 0);
        $this->postJson('/api/admin/evaluations/'.$evaluation->id_evaluacion.'/preview', [])->assertForbidden();
    }

    public function test_each_new_attempt_earns_a_unit_bonus_and_other_units_are_unchanged(): void
    {
        Storage::fake('public');
        $this->seed(UnidadUnoEjerciciosSeeder::class);
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $unit = Unidad::firstOrFail();
        $other = Unidad::create(['id_modulo' => $unit->id_modulo, 'titulo_unidad' => 'Otra unidad', 'objetivo_unidad' => 'Conservar', 'orden_unidad' => 2, 'publicado' => true]);
        $otherSnapshot = $other->refresh()->toJson();
        foreach (EvaluacionKichwa::orderBy('id_evaluacion')->get() as $evaluation) {
            $start = $this->postJson('/api/evaluations/'.$evaluation->id_evaluacion.'/attempts')->assertOk()->json();
            $answers = array_map(fn ($q) => ['question_id' => $q['id'], 'answer' => $this->answer(Pregunta::findOrFail($q['id']))], $start['questions']);
            $this->postJson('/api/evaluations/'.$evaluation->id_evaluacion.'/submit', ['attempt_id' => $start['attempt_id'], 'answers' => $answers])->assertOk();
        }
        $this->getJson('/api/mastery')->assertJsonPath('xp', 510);
        $this->seed(UnidadUnoDefinitivaSeeder::class);
        $this->assertSame($otherSnapshot, $other->fresh()->toJson());
        $this->getJson('/api/mastery')->assertJsonCount(0, 'completed_units')->assertJsonPath('xp', 510);
        foreach (Actividad::where('publicado', true)->where('id_unidad', $unit->id_unidad)->get() as $activity) {
            $this->postJson('/api/exercises/'.$activity->id_actividad.'/answer', ['answer' => $this->answer($activity)])->assertOk();
        }
        $evaluation = EvaluacionKichwa::where('publicado', true)->firstOrFail();
        $start = $this->postJson('/api/evaluations/'.$evaluation->id_evaluacion.'/attempts')->assertOk()->json();
        $answers = array_map(fn ($q) => ['question_id' => $q['id'], 'answer' => $this->answer(Pregunta::findOrFail($q['id']))], $start['questions']);
        $this->postJson('/api/evaluations/'.$evaluation->id_evaluacion.'/submit', ['attempt_id' => $start['attempt_id'], 'answers' => $answers])->assertOk()->assertJsonPath('passed', true)->assertJsonPath('xp_earned', 110)->assertJsonPath('xp_total', 690);
        $this->assertSame(1, DB::table('recompensas')->where('id_usuario', $student->id_usuario)->where('clave', 'final:'.$unit->id_unidad)->count());
    }

    public function test_admin_preview_is_free_and_publication_rejects_missing_media_invalid_holes_and_incomplete_banks(): void
    {
        Storage::fake('public');
        $this->seed(UnidadUnoDefinitivaSeeder::class);
        $this->seed(UnidadUnoDefinitivaSeeder::class);
        $this->assertSame(7, Actividad::where('publicado', true)->count());
        $this->assertSame(1, EvaluacionKichwa::where('publicado', true)->count());
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $visual = Actividad::where('configuracion->presentation', 'visual')->firstOrFail();
        $elements = $visual->elementos_actividad;
        unset($elements[0]['imagen']);
        $this->patchJson('/api/admin/exercises/'.$visual->id_actividad, ['elements' => $elements])->assertUnprocessable();
        $letter = Actividad::where('configuracion->presentation', 'letter')->firstOrFail();
        $this->patchJson('/api/admin/exercises/'.$letter->id_actividad, ['config' => array_replace($letter->configuracion, ['missing_index' => 1])])->assertUnprocessable();
        $evaluation = EvaluacionKichwa::where('publicado', true)->firstOrFail();
        $questions = $this->getJson('/api/admin/evaluations/'.$evaluation->id_evaluacion.'/preview')->assertOk()->assertJsonCount(6, 'questions')->json('questions');
        $answers = array_map(fn ($q) => ['question_id' => $q['id'], 'answer' => $this->answer(Pregunta::findOrFail($q['id']))], $questions);
        $this->postJson('/api/admin/evaluations/'.$evaluation->id_evaluacion.'/preview', ['answers' => $answers])->assertOk()->assertJsonPath('score', 100);
        $this->assertDatabaseCount('intentos_evaluacion', 0);
        $this->assertDatabaseCount('recompensas', 0);
        $question = Pregunta::where('id_evaluacion', $evaluation->id_evaluacion)->firstOrFail();
        $this->patchJson('/api/admin/questions/'.$question->id_pregunta, ['published' => false])->assertOk();
        $this->patchJson('/api/admin/evaluations/'.$evaluation->id_evaluacion, ['published' => true])->assertUnprocessable();
    }
}
