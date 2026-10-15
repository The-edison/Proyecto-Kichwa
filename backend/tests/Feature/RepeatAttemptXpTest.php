<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\Pregunta;
use App\Models\Usuario;
use Database\Seeders\UnidadUnoEjerciciosSeeder;
use Database\Seeders\UnidadUnoGuiadaSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class RepeatAttemptXpTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_each_new_practice_attempt_earns_xp_and_retries_of_the_same_submission_are_idempotent(): void
    {
        $this->seed(UnidadUnoGuiadaSeeder::class);
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $exercise = Actividad::where('origen_reactivo', 'u1-guided-v3-1')->firstOrFail();
        $url = '/api/exercises/'.$exercise->id_actividad.'/answer';
        $session = (string) Str::uuid();
        $this->postJson($url, ['practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid(), 'answer' => ['seleccion' => ['sisa']]])
            ->assertOk()->assertJsonPath('xp_earned', 0)->assertJsonPath('xp_attempt', 0);
        $payload = ['practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid(), 'answer' => ['seleccion' => ['wasi']]];
        $first = $this->postJson($url, $payload)->assertOk()->assertJsonPath('xp_earned', 10)->assertJsonPath('xp_attempt', 10)->json();
        $this->postJson($url, $payload)->assertOk()->assertExactJson($first);
        $this->assertDatabaseCount('respuestas_actividad', 2);
        $this->postJson($url, array_replace($payload, ['answer' => ['seleccion' => ['sisa']]]))->assertConflict();
        $this->postJson($url, array_replace($payload, ['submission_id' => (string) Str::uuid(), 'answer' => ['seleccion' => ['sisa']]]))->assertConflict();
        $this->assertDatabaseCount('respuestas_actividad', 2);
        $this->postJson($url, array_replace($payload, ['submission_id' => (string) Str::uuid()]))->assertOk()->assertJsonPath('xp_earned', 0)->assertJsonPath('xp_attempt', 10);
        $next = array_replace($payload, ['practice_attempt_id' => (string) Str::uuid(), 'submission_id' => (string) Str::uuid()]);
        $this->postJson($url, $next)->assertOk()->assertJsonPath('xp_earned', 10)->assertJsonPath('xp_attempt', 10)->assertJsonPath('xp_total', 20);
        $this->assertDatabaseCount('recompensas', 2);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 20);
        $this->postJson($url, ['answer' => $payload['answer'], 'practice_attempt_id' => $session])->assertUnprocessable()->assertJsonValidationErrors('submission_id');
    }

    public function test_guided_attempts_reset_their_xp_and_student_and_admin_reports_share_the_accumulated_total(): void
    {
        $this->seed(UnidadUnoGuiadaSeeder::class);
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $house = Actividad::where('origen_reactivo', 'u1-guided-v3-1')->firstOrFail();
        $exercises = Actividad::where('id_unidad', $house->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get();
        $firstIds = [];
        foreach ([40, 80] as $total) {
            $session = (string) Str::uuid();
            $ids = [];
            foreach ($exercises as $exercise) {
                $ids[] = $this->postJson('/api/exercises/'.$exercise->id_actividad.'/answer', ['answer' => $exercise->solucion_actividad,
                    'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])->assertOk()->assertJsonPath('xp_earned', 10)->json('response_id');
            }
            $payload = ['response_ids' => $ids, 'practice_attempt_id' => $session, 'xp_earned' => 99999];
            $url = '/api/units/'.$house->id_unidad.'/guided/result';
            $this->postJson($url, $payload)->assertOk()->assertJsonPath('xp_earned', 40)->assertJsonPath('xp_total', $total)->assertJsonPath('score', 20);
            $this->postJson($url, $payload)->assertOk()->assertJsonPath('xp_earned', 40)->assertJsonPath('xp_total', $total);
            if ($firstIds !== []) {
                $mixed = $ids;
                $mixed[0] = $firstIds[0];
                $this->postJson($url, ['response_ids' => $mixed, 'practice_attempt_id' => $session])->assertUnprocessable()->assertJsonValidationErrors('response_ids');
            }
            $firstIds = $ids;
        }
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 80);
        $this->assertDatabaseCount('recompensas', 8);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/admin/learning-results/'.$student->id_usuario)->assertOk()->assertJsonPath('xp', 80);
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 0);
        $this->getJson('/api/admin/learning-results/'.$student->id_usuario)->assertForbidden();
        $this->postJson($url, $payload)->assertUnprocessable();
    }

    public function test_evaluation_retries_reward_correct_answers_again_without_duplicating_achievements_or_final_submissions(): void
    {
        $this->seed(UnidadUnoEjerciciosSeeder::class);
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $evaluation = EvaluacionKichwa::where('publicado', true)->orderBy('id_evaluacion')->firstOrFail();
        $url = '/api/evaluations/'.$evaluation->id_evaluacion;
        foreach ([120, 240] as $total) {
            $start = $this->postJson($url.'/attempts')->assertOk()->json();
            $answers = array_map(function (array $item): array {
                $question = Pregunta::findOrFail($item['id']);
                $answer = $question->solucion_pregunta;
                if ($question->tipo_pregunta === 'completar') {
                    $answer['textos'] = array_map(fn (array $variants): string => $variants[0], $answer['textos']);
                }

                return ['question_id' => $question->id_pregunta, 'answer' => $answer];
            }, $start['questions']);
            $payload = ['attempt_id' => $start['attempt_id'], 'answers' => $answers];
            $result = $this->postJson($url.'/submit', $payload)->assertOk()->assertJsonPath('xp_earned', 120)->assertJsonPath('xp_total', $total)->assertJsonPath('score', 100)->json();
            $this->postJson($url.'/submit', $payload)->assertOk()->assertExactJson($result);
        }
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 240)->assertJsonCount(1, 'mastered_topics');
        $this->assertSame(1, DB::table('recompensas')->where('id_usuario', $student->id_usuario)->where('clave', 'dominio:'.$evaluation->id_tema)->count());
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/admin/learning-results/'.$student->id_usuario)->assertOk()->assertJsonPath('xp', 240);

    }
}
