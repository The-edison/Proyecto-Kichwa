<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\Modulo;
use App\Models\Pregunta;
use App\Models\Tema;
use App\Models\Usuario;
use Database\Seeders\UnidadUnoEjerciciosSeeder;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class UnidadUnoEjerciciosTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_each_lesson_has_visible_functional_practice_and_the_final_remains_locked_until_mastery(): void
    {
        $this->seed(UnidadUnoEjerciciosSeeder::class);
        Sanctum::actingAs(Usuario::factory()->create());
        $topics = Tema::orderBy('id_tema')->get();
        $module = Modulo::firstOrFail();
        $this->getJson('/api/modules/'.$module->id_modulo.'/contents')->assertOk()
            ->assertJsonPath('data.0.exercise_count', 10)->assertJsonPath('data.1.exercise_count', 12)->assertJsonPath('data.2.exercise_count', 10)
            ->assertJsonPath('data.3.exercise_count', 0)->assertJsonPath('data.3.evaluation_question_count', 10)->assertJsonPath('data.3.evaluation_locked', true);
        foreach ($topics->take(3) as $topic) {
            $exercises = $this->getJson('/api/units/'.$topic->id_unidad.'/exercises?topic_id='.$topic->id_tema)->assertOk()->assertDontSee('solution')->json('data');
            foreach ($exercises as $exercise) {
                $record = Actividad::findOrFail($exercise['id']);
                $answer = $record->solucion_actividad;
                if ($record->tipo_actividad === 'completar') {
                    $answer['textos'] = array_map(fn ($variants) => $variants[0], $answer['textos']);
                }
                $this->postJson('/api/exercises/'.$record->id_actividad.'/answer', ['answer' => $answer])->assertOk()->assertJsonPath('is_correct', true)->assertJsonPath('xp_earned', 10);
            }
        }
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 320);
        foreach (EvaluacionKichwa::orderBy('id_evaluacion')->get() as $evaluation) {
            $start = $this->postJson('/api/evaluations/'.$evaluation->id_evaluacion.'/attempts')->assertOk()->assertJsonCount(10, 'questions')->json();
            $answers = array_map(function ($q): array {
                $record = Pregunta::findOrFail($q['id']);
                $answer = $record->solucion_pregunta;
                if ($record->tipo_pregunta === 'completar') {
                    $answer['textos'] = array_map(fn ($variants) => $variants[0], $answer['textos']);
                }

                return ['question_id' => $q['id'], 'answer' => $answer];
            }, $start['questions']);
            $this->postJson('/api/evaluations/'.$evaluation->id_evaluacion.'/submit', ['attempt_id' => $start['attempt_id'], 'answers' => $answers])->assertOk()->assertJsonPath('score', 100)->assertJsonPath('xp_earned', $evaluation->configuracion['final'] ? 150 : 120);
        }
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 830)->assertJsonCount(1, 'medals');
        $this->getJson('/api/modules/'.$module->id_modulo.'/contents')->assertOk()->assertJsonPath('data.3.evaluation_locked', false);
        $this->assertDatabaseCount('actividades', 32);
        $this->assertDatabaseCount('recompensas', 80);
    }

    public function test_reseeding_does_not_duplicate_exercises_or_overwrite_admin_retirement(): void
    {
        $this->seed(UnidadUnoEjerciciosSeeder::class);
        $practice = Actividad::firstOrFail();
        $practice->update(['publicado' => false]);
        $evaluation = EvaluacionKichwa::firstOrFail();
        $evaluation->update(['publicado' => false]);
        $this->seed(UnidadUnoEjerciciosSeeder::class);
        $this->assertDatabaseCount('actividades', 32);
        $this->assertDatabaseCount('preguntas', 62);
        $this->assertFalse($practice->fresh()->publicado);
        $this->assertFalse($evaluation->fresh()->publicado);
        $this->assertSame(2, Pregunta::where('publicado', false)->count());
    }
}
