<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\Tema;
use App\Models\Unidad;
use App\Models\Usuario;
use App\Services\KichwaResource;
use Database\Seeders\IntermedioDialogosEjerciciosSeeder;
use Database\Seeders\IntermedioDialogosSeeder;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class IntermedioDialogosEjerciciosTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_six_activities_are_published_once_and_keep_the_existing_lesson(): void
    {
        $this->seed(IntermedioDialogosSeeder::class);
        $topic = Tema::where('clave_leccion', IntermedioDialogosSeeder::LESSON_KEY)->firstOrFail();
        $unit = Unidad::findOrFail($topic->id_unidad);
        $before = $topic->getAttributes();
        $this->seed(IntermedioDialogosEjerciciosSeeder::class);
        $ids = Actividad::where('id_unidad', $unit->id_unidad)->orderBy('orden_actividad')->pluck('id_actividad')->all();
        $retired = Actividad::findOrFail($ids[0])->replicate();
        $retired->origen_reactivo = 'intermedio-m2-u4-actividad-3-v1';
        $retired->orden_actividad = 8;
        $retired->save();
        $ids[] = $retired->id_actividad;
        $removedVersions = [];
        foreach ([1, 3] as $index => $version) {
            $removed = Actividad::findOrFail($ids[0])->replicate();
            $removed->origen_reactivo = 'intermedio-m2-u4-actividad-7-v'.$version;
            $removed->orden_actividad = 9 + $index;
            $removed->save();
            $ids[] = $removed->id_actividad;
            $removedVersions[] = $removed;
        }
        $outdated = Actividad::where('origen_reactivo', 'intermedio-m2-u4-actividad-6-v4')->firstOrFail();
        $outdated->update(['elementos_actividad' => [['id' => 'old', 'texto' => 'Imanalla kuita Janeth.']], 'solucion_actividad' => ['orden' => ['old']]]);
        $this->seed(IntermedioDialogosEjerciciosSeeder::class);
        $this->assertSame($ids, Actividad::where('id_unidad', $unit->id_unidad)->orderBy('orden_actividad')->pluck('id_actividad')->all());
        $this->assertSame($before, $topic->fresh()->getAttributes());
        $this->assertFalse($retired->fresh()->publicado);
        foreach ($removedVersions as $removed) {
            $this->assertFalse($removed->fresh()->publicado);
        }
        Sanctum::actingAs(Usuario::factory()->create());
        $items = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 6)->json('exercises');
        $this->assertSame([1, 2, 4, 5, 6, 8], array_column(array_column($items, 'config'), 'dialogue_practice'));
        $this->assertCount(6, $items[1]['elements']);
        $this->assertCount(9, $items[4]['elements']);
        $orderedText = array_column($items[4]['elements'], 'texto', 'id');
        $this->assertSame('Janeth: Ahhh, chashnaka Kaya kama.', $orderedText['t7']);
        $this->assertSame('Edgar: Kaya kama.', $orderedText['t8']);
        $this->assertSame('Maymantatak rinki.', $items[0]['config']['dialogue_turns'][2]['text']);
        $this->assertSame('Imanalla kuitza Janeth.', $items[3]['config']['dialogue_turns'][0]['text']);
        $this->assertCount(15, $items[3]['config']['dialogue_turns']);
        $this->assertSame('Chashnaka hakuyari.', $items[3]['config']['dialogue_turns'][13]['text']);
        $this->assertSame('Haku haku.', $items[3]['config']['dialogue_turns'][14]['text']);
        $this->assertSame('Ñukapish allillami kani.', $items[3]['config']['dialogue_turns'][3]['text']);
        $this->assertSame('Mana casaranichu – kikinka.', $items[3]['config']['dialogue_turns'][5]['text']);
        $this->assertSame('Ñukapish wasimanmi rikuni.', $items[3]['config']['dialogue_turns'][12]['text']);
        $this->assertSame([], $items[3]['config']['dialogue_expressions']);
        foreach ($items as $item) {
            $this->assertArrayNotHasKey('solution', $item);
        }
    }

    public function test_complete_reading_replaces_the_answered_version_without_losing_its_response(): void
    {
        $this->seed(IntermedioDialogosSeeder::class);
        $topic = Tema::where('clave_leccion', IntermedioDialogosSeeder::LESSON_KEY)->firstOrFail();
        $exercise = json_decode(file_get_contents(resource_path('lessons/intermediate-dialogues-exercises.json')), true, 512, JSON_THROW_ON_ERROR)[4];
        $exercise['config']['dialogue_turns'] = array_slice($exercise['config']['dialogue_turns'], 0, 2);
        $previous = new Actividad(KichwaResource::attributes('exercises', $exercise));
        $previous->id_unidad = $topic->id_unidad;
        $previous->origen_reactivo = 'intermedio-m2-u4-actividad-5-v3';
        $previous->orden_actividad = 1;
        $previous->publicado = true;
        $previous->save();
        Sanctum::actingAs(Usuario::factory()->create());
        $response = $this->postJson('/api/exercises/'.$previous->id_actividad.'/answer', ['answer' => ['seleccion' => ['o2']], 'practice_attempt_id' => (string) Str::uuid(), 'submission_id' => (string) Str::uuid()])->assertOk()->assertJsonPath('is_correct', true);

        $this->seed(IntermedioDialogosEjerciciosSeeder::class);
        $this->seed(IntermedioDialogosEjerciciosSeeder::class);

        $this->assertFalse($previous->fresh()->publicado);
        $this->assertCount(2, $previous->fresh()->configuracion['dialogue_turns']);
        $replacement = Actividad::where('origen_reactivo', 'intermedio-m2-u4-actividad-5-v4')->firstOrFail();
        $this->assertSame(1, $replacement->orden_actividad);
        $this->assertCount(15, $replacement->configuracion['dialogue_turns']);
        $this->assertSame(6, Actividad::where('id_unidad', $topic->id_unidad)->where('publicado', true)->count());
        $this->assertDatabaseHas('respuestas_actividad', ['id_respuesta_actividad' => $response->json('response_id'), 'id_actividad' => $previous->id_actividad, 'acierto_actividad' => true]);
    }

    public function test_each_activity_rejects_wrong_answers_accepts_correct_answers_and_counts_toward_completion(): void
    {
        $this->seed([IntermedioDialogosSeeder::class, IntermedioDialogosEjerciciosSeeder::class]);
        $topic = Tema::where('clave_leccion', IntermedioDialogosSeeder::LESSON_KEY)->firstOrFail();
        Sanctum::actingAs(Usuario::factory()->create());
        $answers = array_map(fn (string $json): array => json_decode($json, true, 512, JSON_THROW_ON_ERROR), [
            '{"seleccion":["o1"]}',
            '{"orden":["t0","t1","t2","t3","t4","t5"]}',
            '{"textos":{"r1":"Allillami kani mashi Alexito.","r2":"Ñukaka hatun yachana ukumanmi rini.","r3":"Ñukaka Quitopi llankanamanmi rikuni.","r4":"Ashtakama mashi Alex, ukta tikramunki."}}',
            '{"seleccion":["o2"]}',
            '{"orden":["t0","t1","t2","t3","t4","t5","t6","t7","t8"]}',
            '{"textos":{"r1":"Imanalla","r2":"Alexito","r3":"kasararkanki","r4":"wasimanmi"}}',
        ]);
        $attempt = (string) Str::uuid();
        $responses = [];
        $records = Actividad::where('id_unidad', $topic->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get();
        foreach ($records as $index => $record) {
            $answer = $answers[$index];
            $wrong = match ($record->tipo_actividad) {
                'ordenar' => ['orden' => array_reverse($answer['orden'])],
                'seleccion_multiple' => ['seleccion' => ['o0']],
                default => ['textos' => array_fill_keys(array_keys($answer['textos']), 'incorrecto')],
            };
            $this->postJson('/api/exercises/'.$record->id_actividad.'/answer', ['answer' => $wrong, 'practice_attempt_id' => $attempt, 'submission_id' => (string) Str::uuid()])->assertOk()->assertJsonPath('is_correct', false);
            $response = $this->postJson('/api/exercises/'.$record->id_actividad.'/answer', ['answer' => $answer, 'practice_attempt_id' => $attempt, 'submission_id' => (string) Str::uuid()])->assertOk()->assertJsonPath('is_correct', true);
            $responses[] = $response->json('response_id');
            $this->assertDatabaseHas('respuestas_actividad', ['id_respuesta_actividad' => $response->json('response_id'), 'id_actividad' => $record->id_actividad, 'acierto_actividad' => true]);
        }
        $this->postJson('/api/units/'.$topic->id_unidad.'/guided/result', ['response_ids' => $responses])->assertOk()->assertJsonPath('correct_count', 6)->assertJsonPath('total_items', 6);
    }
}
