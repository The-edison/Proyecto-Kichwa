<?php

namespace Tests\Feature;

use App\Models\EvaluacionKichwa;
use App\Models\Pregunta;
use App\Models\RespuestaActividad;
use App\Models\Unidad;
use App\Models\Usuario;
use App\Services\PublicacionContenido;
use Database\Seeders\ModuloDosEvaluacionSeeder;
use Database\Seeders\UnidadesTematicasGuiadasSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class ModuloDosEvaluacionTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_final_lesson_appears_after_four_units_and_unlocks_when_they_are_complete(): void
    {
        $this->seed([UnidadesTematicasGuiadasSeeder::class, ModuloDosEvaluacionSeeder::class]);
        $exam = EvaluacionKichwa::where('configuracion->bank_key', 'basico-modulo2-final-v1')->firstOrFail();
        $this->publishOnlyModule($exam->id_modulo);
        $this->assertSame(16, Pregunta::where('id_evaluacion', $exam->id_evaluacion)->count());
        $this->assertSame(4, Unidad::where('id_modulo', $exam->id_modulo)->count());
        $titles = Pregunta::where('id_evaluacion', $exam->id_evaluacion)->orderBy('orden_pregunta')->get()
            ->map(fn (Pregunta $question): string => explode(' · ', $question->configuracion['title'])[0])->countBy()->all();
        $this->assertSame(['Unidad 1' => 4, 'Unidad 2' => 4, 'Unidad 3' => 4, 'Unidad 4' => 4], $titles);

        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $url = '/api/evaluations/'.$exam->id_evaluacion;
        $this->getJson('/api/modules/'.$exam->id_modulo)->assertOk()
            ->assertJsonPath('final_evaluation.title', 'Lección final · Vocabulario y gramática básica')
            ->assertJsonPath('final_evaluation.unlocked', false)->assertJsonPath('final_evaluation.question_count', 16);
        $this->postJson($url.'/attempts')->assertForbidden();

        $units = Unidad::where('id_modulo', $exam->id_modulo)->pluck('id_unidad');
        foreach (PublicacionContenido::exercises()->whereIn('id_unidad', $units)->get() as $exercise) {
            RespuestaActividad::create(['id_usuario' => $student->id_usuario, 'id_actividad' => $exercise->id_actividad,
                'respuesta_actividad' => $exercise->solucion_actividad, 'acierto_actividad' => true,
                'retroalimentacion_actividad' => 'Correcto.']);
        }
        $this->getJson('/api/modules/'.$exam->id_modulo)->assertOk()
            ->assertJsonPath('final_evaluation.unlocked', true)->assertJsonPath('final_evaluation.completed_units', 4);
        $this->postJson($url.'/attempts')->assertOk()->assertJsonCount(16, 'questions')->assertDontSee('solution');

        $this->seed(ModuloDosEvaluacionSeeder::class);
        $this->assertSame(1, EvaluacionKichwa::where('id_modulo', $exam->id_modulo)->where('publicado', true)->count());
        $this->assertSame(16, Pregunta::where('id_evaluacion', $exam->id_evaluacion)->count());

    }
}
