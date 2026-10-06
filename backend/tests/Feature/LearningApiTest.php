<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\Pregunta;
use App\Models\RespuestaEvaluacion;
use App\Models\Unidad;
use App\Models\Usuario;
use App\Models\VistaProgreso;
use App\Models\VistaProgresoNivel;
use App\Services\ContratoEjercicio;
use Database\Seeders\DemostracionSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL as RefreshDatabase;

class LearningApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_invalid_solution_references_and_unuploaded_resources_are_rejected(): void
    {
        $this->seed(DemostracionSeeder::class);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $unit = Unidad::firstOrFail()->id_unidad;
        $payload = ['unit_id' => $unit, 'type' => 'seleccion_multiple', 'prompt' => '[DEMO] Prueba',
            'elements' => [['id' => 'a', 'texto' => '[DEMO] A'], ['id' => 'b', 'texto' => '[DEMO] B']],
            'zones' => [], 'solution' => ['seleccion' => ['no_existe']], 'sort_order' => 10];
        $this->postJson('/api/admin/exercises', $payload)->assertUnprocessable()->assertJsonValidationErrors('solution');
        $payload['solution'] = ['seleccion' => ['a']];
        $this->postJson('/api/admin/exercises', $payload + ['resource' => 'https://example.com/a.mp3'])->assertUnprocessable();
        $this->postJson('/api/admin/exercises', $payload)->assertCreated();
        $payload['elements'][1]['id'] = 'a';
        $this->postJson('/api/admin/exercises', $payload)->assertUnprocessable()->assertJsonValidationErrors('elements.0.id');
    }

    public function test_progress_counts_distinct_successes_and_averages_unstarted_units(): void
    {
        $this->seed(DemostracionSeeder::class);
        $unit = Unidad::firstOrFail();
        Unidad::create(['id_modulo' => $unit->id_modulo, 'titulo_unidad' => '[DEMO] No iniciada', 'objetivo_unidad' => 'Prueba', 'orden_unidad' => 2]);
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $activity = Actividad::where('tipo_actividad', 'seleccion_multiple')->firstOrFail()->id_actividad;
        foreach ([['a'], ['a'], ['b']] as $selection) {
            $this->postJson('/api/exercises/'.$activity.'/answer', ['answer' => ['seleccion' => $selection]])->assertOk();
        }
        $this->getJson('/api/progress')->assertOk()->assertJsonPath('0.completed_activities', 1)->assertJsonPath('0.percentage', 12.5);
        $this->assertSame('25.00', (string) VistaProgreso::where('id_usuario', $student->id_usuario)->value('porcentaje_progreso'));
    }

    public function test_database_rejects_response_with_question_from_another_evaluation(): void
    {
        $this->seed(DemostracionSeeder::class);
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $evaluation = EvaluacionKichwa::where('tipo_evaluacion', 'unidad')->firstOrFail()->id_evaluacion;
        $attempt = $this->postJson('/api/evaluations/'.$evaluation.'/attempts')->assertOk()->json('attempt_id');
        $otherQuestion = Pregunta::where('id_evaluacion', '<>', $evaluation)->firstOrFail()->id_pregunta;
        $this->postJson('/api/evaluations/'.$evaluation.'/submit', ['attempt_id' => $attempt,
            'answers' => [['question_id' => $otherQuestion, 'answer' => ['textos' => ['h1' => 'ishkay']]]]])->assertUnprocessable();
        try {
            DB::transaction(fn () => RespuestaEvaluacion::create(['id_intento' => $attempt, 'id_pregunta' => $otherQuestion,
                'id_evaluacion' => $evaluation, 'respuesta_evaluacion' => ['textos' => ['h1' => 'ishkay']], 'puntaje_respuesta_evaluacion' => 0]));
            $this->fail('Se permitió mezclar evaluaciones.');
        } catch (QueryException $exception) {
            $this->assertSame('23503', $exception->errorInfo[0]);
        }
        $this->assertDatabaseCount('respuestas_evaluacion', 0);
    }

    public function test_empty_evaluation_diagnostic_contract_and_readonly_views(): void
    {
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->postJson('/api/admin/evaluations', ['title' => '[DEMO] Sin unidad', 'type' => 'unidad'])->assertUnprocessable();
        $evaluation = $this->postJson('/api/admin/evaluations', ['title' => '[DEMO] Diagnóstico', 'type' => 'diagnostica', 'unit_id' => null])->assertCreated()->json('id');
        Sanctum::actingAs(Usuario::factory()->create());
        $this->postJson('/api/evaluations/'.$evaluation.'/attempts')->assertUnprocessable();
        $this->assertDatabaseCount('intentos_evaluacion', 0);
        $view = new VistaProgresoNivel;
        $this->expectException(\LogicException::class);
        $view->save();
    }

    public function test_admin_block_revokes_tokens_and_prevents_password_and_google_access(): void
    {
        $student = Usuario::factory()->create();
        $student->createToken('viejo');
        $admin = Usuario::factory()->administrador()->create();
        Sanctum::actingAs($admin);
        $this->patchJson('/api/admin/students/'.$student->id_usuario, ['state' => 'bloqueado'])->assertOk()->assertJsonPath('state', 'bloqueado');
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->postJson('/api/auth/login', ['identifier' => $student->correo_usuario, 'password' => 'PruebaSegura#2026'])->assertUnprocessable();
        $this->patchJson('/api/admin/students/'.$student->id_usuario, ['state' => 'activo'])->assertOk();
    }

    public function test_selection_and_pairs_are_sets_and_unicode_is_normalized(): void
    {
        $selection = ['type' => 'seleccion_multiple', 'elements' => [['id' => 'a'], ['id' => 'b']], 'solution' => ['seleccion' => ['a', 'b']]];
        $this->assertTrue(ContratoEjercicio::grade($selection, ['seleccion' => ['b', 'a']]));
        $text = ['type' => 'completar', 'solution' => ['textos' => ['x' => ['á']]]];
        $this->assertTrue(ContratoEjercicio::grade($text, ['textos' => ['x' => "A\u{0301}"]]));
    }
}
