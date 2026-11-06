<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\RespuestaActividad;
use App\Models\Tema;
use App\Models\Unidad;
use App\Models\Usuario;
use App\Services\KichwaResource;
use Database\Seeders\IntermedioTiemposEjerciciosSeeder;
use Database\Seeders\IntermedioTiemposSeeder;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class IntermedioTiemposEjerciciosTest extends TestCase
{
    use UsesPostgreSQL;

    public static function legacyListeningOrigins(): array
    {
        return [
            'past' => ['intermedio-m2-u2-actividad-3-v1', 'Alex descansó.', 'Alex llegó.'],
            'future' => ['intermedio-m2-u2-actividad-6-v1', 'Trabajaré.', 'Enseñaré.'],
        ];
    }

    #[DataProvider('legacyListeningOrigins')]
    public function test_replacing_a_short_question_preserves_its_saved_answer_and_existing_listening_ids(string $origin, string $correct, string $wrong): void
    {
        $this->seed([IntermedioTiemposSeeder::class, IntermedioTiemposEjerciciosSeeder::class]);
        $unit = Unidad::where('configuracion->guided_lesson', 'time-morphemes')->firstOrFail();
        $ids = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->pluck('id_actividad')->all();
        $legacy = new Actividad(KichwaResource::attributes('exercises', [
            'type' => 'seleccion_multiple', 'prompt' => 'Escucha la oración.',
            'elements' => [['id' => 'o0', 'texto' => $correct], ['id' => 'o1', 'texto' => $wrong]],
            'solution' => ['seleccion' => ['o0']], 'config' => ['time_practice' => 3], 'zones' => [], 'resource' => null,
        ]));
        $legacy->id_unidad = $unit->id_unidad;
        $legacy->origen_reactivo = $origin;
        $legacy->orden_actividad = 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
        $legacy->publicado = true;
        $legacy->save();
        Sanctum::actingAs(Usuario::factory()->create());
        $response = $this->postJson('/api/exercises/'.$legacy->id_actividad.'/answer', ['answer' => ['seleccion' => ['o0']]])->assertOk()->assertJsonPath('is_correct', true);
        $saved = RespuestaActividad::findOrFail($response->json('response_id'))->getAttributes();
        $this->seed(IntermedioTiemposEjerciciosSeeder::class);
        $this->assertFalse($legacy->fresh()->publicado);
        $this->assertSame($saved, RespuestaActividad::findOrFail($response->json('response_id'))->getAttributes());
        $this->assertSame($ids, Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->pluck('id_actividad')->all());
    }

    public function test_twelve_exercises_are_published_without_changing_the_lesson_or_duplicating_exercises(): void
    {
        $this->seed(IntermedioTiemposSeeder::class);
        $topic = Tema::where('clave_leccion', IntermedioTiemposSeeder::LESSON_KEY)->firstOrFail();
        $unit = Unidad::findOrFail($topic->id_unidad);
        $lesson = $topic->getAttributes();
        $unitBefore = $unit->getAttributes();
        $this->seed(IntermedioTiemposEjerciciosSeeder::class);
        $this->seed(IntermedioTiemposEjerciciosSeeder::class);
        $this->assertSame($lesson, $topic->fresh()->getAttributes());
        $this->assertSame($unitBefore, $unit->fresh()->getAttributes());
        Sanctum::actingAs(Usuario::factory()->create());
        $items = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 12)->json('exercises');
        $this->assertSame([2, 3, 3, 3, 3, 5, 6, 6, 6, 6, 8, 7], array_column(array_column($items, 'config'), 'time_practice'));
        $listening = array_slice($items, 1, 4);
        $this->assertSame(['alex', 'edgar', 'kaled', 'pakarina'], array_column(array_column($listening, 'config'), 'time_listening'));
        $this->assertSame([1, 1, 2, 2], array_column(array_column($listening, 'config'), 'time_panel'));
        $future = array_slice($items, 6, 4);
        $this->assertSame(['llanka', 'yachachi', 'puri', 'sira'], array_column(array_column($future, 'config'), 'time_listening'));
        $this->assertSame([1, 1, 2, 2], array_column(array_column($future, 'config'), 'time_panel'));
        foreach (['Mañana trabajaré con Matías.', 'Mañana enseñaré todas las frutas en clase.', 'Mañana caminaré por toda mi comunidad.', 'Mañana coseré tu sombrero.'] as $index => $meaning) {
            $this->assertSame($meaning, $future[$index]['elements'][[0, 1, 2, 0][$index]]['texto']);
        }
        foreach ($items as $item) {
            $this->assertArrayNotHasKey('solution', $item);
        }
    }

    public function test_each_activity_rejects_incorrect_answers_and_accepts_its_complete_answer(): void
    {
        $this->seed([IntermedioTiemposSeeder::class, IntermedioTiemposEjerciciosSeeder::class]);
        $unit = Unidad::where('configuracion->guided_lesson', 'time-morphemes')->firstOrFail();
        Sanctum::actingAs(Usuario::factory()->create());
        $answers = [
            2 => ['pares' => array_map(fn ($i) => ['origen' => 'k'.$i, 'destino' => 'd'.$i], range(0, 4))],
            3 => ['seleccion' => ['o0']],
            5 => ['textos' => ['llanka' => 'llankasha', 'yachachi' => 'yachachisha', 'puri' => 'purisha', 'kuya' => 'kuyasha', 'sira' => 'sirasha']],
            6 => ['seleccion' => ['o0']],
            7 => ['textos' => ['samari-past' => 'samarirka', 'samari-future' => 'samarisha', 'chaya-past' => 'chayarka', 'chaya-future' => 'chayasha', 'sira-past' => 'sirarka', 'sira-future' => 'sirasha']],
            8 => ['textos' => ['samari' => 'rka', 'puri' => 'sha', 'chinkari' => 'rka', 'yachachi' => 'sha', 'sentence' => 'sha']],
        ];
        $attempt = (string) Str::uuid();
        foreach (Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get() as $record) {
            $item = KichwaResource::present('exercises', $record, true);
            $activity = $item['config']['time_practice'];
            $correct = isset($item['config']['time_listening']) ? ['seleccion' => [['alex' => 'o0', 'edgar' => 'o1', 'kaled' => 'o2', 'pakarina' => 'o1', 'llanka' => 'o0', 'yachachi' => 'o1', 'puri' => 'o2', 'sira' => 'o0'][$item['config']['time_listening']]]] : $answers[$activity];
            $wrong = $item['type'] === 'completar' ? ['textos' => array_fill_keys(array_column($item['elements'], 'id'), 'incorrecto')] : ($activity === 2 ? ['pares' => array_map(fn ($i) => ['origen' => 'k'.$i, 'destino' => 'd'.(($i + 1) % 5)], range(0, 4))] : ['seleccion' => [$correct['seleccion'][0] === 'o0' ? 'o1' : 'o0']]);
            $this->postJson('/api/exercises/'.$record->id_actividad.'/answer', ['answer' => $wrong, 'practice_attempt_id' => $attempt, 'submission_id' => (string) Str::uuid()])->assertOk()->assertJsonPath('is_correct', false);
            $response = $this->postJson('/api/exercises/'.$record->id_actividad.'/answer', ['answer' => $correct, 'practice_attempt_id' => $attempt, 'submission_id' => (string) Str::uuid()])->assertOk()->assertJsonPath('is_correct', true);
            $this->assertDatabaseHas('respuestas_actividad', ['id_respuesta_actividad' => $response->json('response_id'), 'id_actividad' => $record->id_actividad, 'acierto_actividad' => true]);
        }
    }
}
