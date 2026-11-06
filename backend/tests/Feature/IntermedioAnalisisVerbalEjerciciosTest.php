<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\RespuestaActividad;
use App\Models\Tema;
use App\Models\Unidad;
use App\Models\Usuario;
use App\Services\ContratoEjercicio;
use Database\Seeders\IntermedioAnalisisVerbalEjerciciosSeeder;
use Database\Seeders\IntermedioAnalisisVerbalSeeder;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class IntermedioAnalisisVerbalEjerciciosTest extends TestCase
{
    use UsesPostgreSQL;

    public static function blockActivities(): array
    {
        return ['form' => [2, 'miku-build'], 'integrative' => [8, 'segments']];
    }

    #[DataProvider('blockActivities')]
    public function test_verbal_block_solutions_must_use_every_token_exactly_once(int $activity, string $id): void
    {
        $exercise = ['type' => 'completar', 'prompt' => 'Ordena los bloques.', 'elements' => [['id' => $id, 'texto' => 'mikukuni', 'opciones' => ['ni', 'miku', 'ku']]], 'solution' => ['textos' => [$id => ['miku ku ni']]], 'zones' => [], 'resource' => null, 'config' => ['verbal_practice' => $activity]];
        ContratoEjercicio::validate($exercise);
        $exercise['solution']['textos'][$id] = ['miku ku ku'];
        $this->expectException(ValidationException::class);
        ContratoEjercicio::validate($exercise);
    }

    public function test_fourteen_exercises_are_published_idempotently_without_changing_the_lesson(): void
    {
        $this->seed(IntermedioAnalisisVerbalSeeder::class);
        $topic = Tema::where('clave_leccion', IntermedioAnalisisVerbalSeeder::LESSON_KEY)->firstOrFail();
        $unit = Unidad::findOrFail($topic->id_unidad);
        $topicBefore = $topic->getAttributes();
        $unitBefore = $unit->getAttributes();
        $this->seed(IntermedioAnalisisVerbalEjerciciosSeeder::class);
        $desire = Actividad::where('origen_reactivo', 'intermedio-m2-u3-escucha-mikunayan-v1')->firstOrFail();
        $desire->update(['configuracion' => array_replace($desire->configuracion, ['verbal_sentence' => 'Texto anterior.'])]);
        $this->seed(IntermedioAnalisisVerbalEjerciciosSeeder::class);
        $this->assertSame('Ñukatami mikunayan ishki kuyita', $desire->fresh()->configuracion['verbal_sentence']);
        $this->assertSame($topicBefore, $topic->fresh()->getAttributes());
        $this->assertSame($unitBefore, $unit->fresh()->getAttributes());
        Sanctum::actingAs(Usuario::factory()->create());
        $items = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 14)->json('exercises');
        $this->assertSame([1, 2, 3, 3, 3, 3, 4, 5, 6, 6, 6, 6, 7, 8], array_column(array_column($items, 'config'), 'verbal_practice'));
        $this->assertSame(['relacionar', 'completar', 'seleccion_multiple', 'seleccion_multiple', 'seleccion_multiple', 'seleccion_multiple', 'relacionar', 'completar', 'seleccion_multiple', 'seleccion_multiple', 'seleccion_multiple', 'seleccion_multiple', 'completar', 'completar'], array_column($items, 'type'));
        $listening = array_slice($items, 2, 4);
        $this->assertSame(['wawaku', 'warmiku', 'wasiku', 'mashiku'], array_column(array_column($listening, 'config'), 'verbal_listening'));
        $this->assertSame([1, 1, 2, 2], array_column(array_column($listening, 'config'), 'verbal_panel'));
        $this->assertSame(['Ñuka churika shuk sumak wawaku kan.', 'Ñuka warmiku mishkitami yanun.', 'Ñuka wasiku tukuykunatami chaskin.', 'Ñuka mashiku shuk sumak musumi kan.'], array_column(array_column($listening, 'config'), 'verbal_sentence'));
        $desires = array_slice($items, 8, 4);
        $this->assertSame(['mikunayan', 'millanayan', 'killkanayan', 'yachanayan'], array_column(array_column($desires, 'config'), 'verbal_listening'));
        $this->assertSame([1, 1, 2, 2], array_column(array_column($desires, 'config'), 'verbal_panel'));
        $this->assertSame(['Ñukatami mikunayan ishki kuyita', 'Chay mikunata rikushpaka ashkatami millanayan.', 'Kunan punchami ashkata killkanayan.', 'Ñukataka kay shimita ashkatami yachanayan.'], array_column(array_column($desires, 'config'), 'verbal_sentence'));
        $this->assertSame(['miku-parts', 'wasi-parts', 'wawa-parts', 'mashi-parts'], array_column($items[1]['elements'], 'id'));
        $this->assertSame(['Kaya tukuykuna _____.', 'Kipaka sarata _____.', 'Inti punchapi allkuta _____ kan.', 'Tukuykuna misita _____.'], array_column($items[7]['elements'], 'texto'));
        foreach (['shamu' => 'Mañana vengan todos.', 'apamu' => 'Después traigan el maíz.', 'arma' => 'El domingo hay que hacer bañar al perro.', 'hapi' => 'Todos, cojan al gato.'] as $id => $meaning) {
            $this->assertSame($meaning, $items[7]['config']['verbal_sentence_meanings'][$id]);
        }
        foreach ($items as $item) {
            $this->assertArrayNotHasKey('solution', $item);
        }
    }

    public static function replacedActivities(): array
    {
        return [
            'blocks' => [2, ['textos' => ['miku-parts' => 'miku ku ni', 'wasi-parts' => 'wasi ku', 'wawa-parts' => 'wawa ku', 'mashi-parts' => 'mashi ku']]],
            'sentences' => [5, ['textos' => ['shamu' => 'Shamuychi', 'apamu' => 'Apamuychi', 'arma' => 'Armachina', 'hapi' => 'Hapichi']]],
        ];
    }

    #[DataProvider('replacedActivities')]
    public function test_replacing_an_activity_preserves_saved_answers_and_its_position(int $activity, array $answer): void
    {
        $this->seed([IntermedioAnalisisVerbalSeeder::class, IntermedioAnalisisVerbalEjerciciosSeeder::class]);
        $previous = Actividad::where('origen_reactivo', 'intermedio-m2-u3-actividad-'.$activity.'-v2')->firstOrFail();
        $position = $previous->orden_actividad;
        $previous->origen_reactivo = 'intermedio-m2-u3-actividad-'.$activity.'-v1';
        $previous->save();
        Sanctum::actingAs(Usuario::factory()->create());
        $response = $this->postJson('/api/exercises/'.$previous->id_actividad.'/answer', ['answer' => $answer])->assertOk()->assertJsonPath('is_correct', true);
        $saved = RespuestaActividad::findOrFail($response->json('response_id'))->getAttributes();
        $this->seed(IntermedioAnalisisVerbalEjerciciosSeeder::class);
        $this->assertFalse($previous->fresh()->publicado);
        $replacement = Actividad::where('origen_reactivo', 'intermedio-m2-u3-actividad-'.$activity.'-v2')->firstOrFail();
        $this->assertSame($position, $replacement->orden_actividad);
        $this->assertSame($saved, RespuestaActividad::findOrFail($response->json('response_id'))->getAttributes());
        $this->assertSame(14, Actividad::where('id_unidad', $previous->id_unidad)->where('publicado', true)->count());
    }

    public function test_all_interactions_grade_correctly_and_the_final_result_counts_fourteen_complete_exercises(): void
    {
        $this->seed([IntermedioAnalisisVerbalSeeder::class, IntermedioAnalisisVerbalEjerciciosSeeder::class]);
        $unit = Unidad::where('configuracion->guided_lesson', 'verbal-analysis')->firstOrFail();
        Sanctum::actingAs(Usuario::factory()->create());
        $pairs = ['pares' => array_map(fn ($i) => ['origen' => 'k'.$i, 'destino' => 'd'.$i], range(0, 3))];
        $answers = [
            1 => $pairs,
            2 => ['textos' => ['miku-parts' => 'miku ku ni', 'wasi-parts' => 'wasi ku', 'wawa-parts' => 'wawa ku', 'mashi-parts' => 'mashi ku']],
            3 => ['seleccion' => ['o0']], 4 => $pairs,
            5 => ['textos' => ['shamu' => 'Shamuychi', 'apamu' => 'Apamuychi', 'arma' => 'Armachina', 'hapi' => 'Hapichi']],
            6 => ['seleccion' => ['o3']],
            7 => ['textos' => ['warmi' => 'ku', 'arma' => 'chi', 'killka' => 'naya', 'shamu' => 'pay']],
            8 => ['textos' => ['segments' => 'miku ku ni', 'chi' => 'causa', 'naya' => 'deseo', 'pay' => 'cortesia', 'ku-function' => 'curso']],
        ];
        $attempt = (string) Str::uuid();
        $responses = [];
        foreach (Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get() as $record) {
            $config = $record->configuracion;
            $correct = isset($config['verbal_listening']) ? ['seleccion' => [['wawaku' => 'o0', 'warmiku' => 'o1', 'wasiku' => 'o2', 'mashiku' => 'o0', 'mikunayan' => 'o0', 'millanayan' => 'o1', 'killkanayan' => 'o2', 'yachanayan' => 'o0'][$config['verbal_listening']]]] : $answers[$config['verbal_practice']];
            if ($record->tipo_actividad === 'relacionar') {
                $wrong = ['pares' => array_map(fn ($i) => ['origen' => 'k'.$i, 'destino' => 'd'.(($i + 1) % 4)], range(0, 3))];
            } elseif ($record->tipo_actividad === 'completar') {
                $wrong = ['textos' => array_fill_keys(array_keys($correct['textos']), 'incorrecto')];
            } else {
                $wrong = ['seleccion' => [$correct['seleccion'][0] === 'o1' ? 'o0' : 'o1']];
            }
            $this->postJson('/api/exercises/'.$record->id_actividad.'/answer', ['answer' => $wrong, 'practice_attempt_id' => $attempt, 'submission_id' => (string) Str::uuid()])->assertOk()->assertJsonPath('is_correct', false);
            $response = $this->postJson('/api/exercises/'.$record->id_actividad.'/answer', ['answer' => $correct, 'practice_attempt_id' => $attempt, 'submission_id' => (string) Str::uuid()])->assertOk()->assertJsonPath('is_correct', true);
            $responses[] = $response->json('response_id');
            $this->assertDatabaseHas('respuestas_actividad', ['id_respuesta_actividad' => $response->json('response_id'), 'id_actividad' => $record->id_actividad, 'acierto_actividad' => true]);
        }
        $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => $responses])->assertOk()->assertJsonPath('correct_count', 14)->assertJsonPath('total_items', 14);
    }
}
