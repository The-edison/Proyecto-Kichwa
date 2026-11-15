<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\Tema;
use App\Models\Unidad;
use App\Models\Usuario;
use App\Services\PublicacionContenido;
use Database\Seeders\UnidadDosGuiadaSeeder;
use Database\Seeders\UnidadUnoGuiadaSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class UnidadDosGuiadaTest extends TestCase
{
    use UsesPostgreSQL;

    private function unit(): Unidad
    {
        $this->seed(UnidadDosGuiadaSeeder::class);

        return Unidad::findOrFail(Tema::where('clave_leccion', UnidadDosGuiadaSeeder::LESSON_KEY)->value('id_unidad'));
    }

    public function test_courtesy_question_copy_is_updated_without_losing_saved_answers_or_creating_repeated_versions(): void
    {
        $unit = $this->unit();
        $activity = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-courtesy-order-0-v1')->firstOrFail();
        $question = 'Disculpe, licenciado, ¿puedo ingresar a sus clases?';
        $previous = 'Disculpe licenciado para ingresar a sus clases';
        $config = $activity->configuracion;
        $config['context_text'] = $previous;
        $config['correct_feedback'] = str_replace($question, $previous, $config['correct_feedback']);
        $activity->update(['configuracion' => $config]);
        Sanctum::actingAs(Usuario::factory()->create());
        $this->postJson('/api/exercises/'.$activity->id_actividad.'/answer', ['answer' => $activity->solucion_actividad,
            'practice_attempt_id' => (string) Str::uuid(), 'submission_id' => (string) Str::uuid()])->assertOk()->assertJsonPath('is_correct', true);

        $this->seed(UnidadDosGuiadaSeeder::class);
        $this->seed(UnidadDosGuiadaSeeder::class);

        $published = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $activity->origen_reactivo)->where('publicado', true)->firstOrFail();
        $this->assertNotSame($activity->id_actividad, $published->id_actividad);
        $this->assertSame($question, $published->configuracion['context_text']);
        $this->assertStringContainsString($question, $published->configuracion['correct_feedback']);
        $this->assertSame($activity->solucion_actividad, $published->solucion_actividad);
        $this->assertFalse($activity->fresh()->publicado);
        $this->assertSame($previous, $activity->fresh()->configuracion['context_text']);
        $this->assertSame(2, Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $activity->origen_reactivo)->count());
        $this->assertDatabaseHas('respuestas_actividad', ['id_actividad' => $activity->id_actividad]);
    }

    public function test_retired_response_scenes_stay_out_of_the_unit_without_losing_answers_or_rewards(): void
    {
        $unit = $this->unit();
        $expected = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->pluck('id_actividad')->all();
        $source = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-scene-a-0-v1')->firstOrFail();
        $position = (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
        $retired = [];
        foreach ([3 => 'Tengo 20 años', 4 => 'Sí', 5 => 'Nada'] as $index => $meaning) {
            $activity = $source->replicate();
            $activity->origen_reactivo = 'u2-scene-a-'.$index.'-v1';
            $activity->orden_actividad = ++$position;
            $activity->configuracion = array_replace($source->configuracion, ['context_text' => $meaning]);
            $activity->save();
            $retired[] = $activity;
        }
        Sanctum::actingAs(Usuario::factory()->create());
        $responseId = $this->postJson('/api/exercises/'.$retired[0]->id_actividad.'/answer', ['answer' => $retired[0]->solucion_actividad])
            ->assertOk()->assertJsonPath('xp_earned', 10)->json('response_id');

        $this->seed(UnidadDosGuiadaSeeder::class);
        $this->seed(UnidadDosGuiadaSeeder::class);

        $data = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 25)->json('exercises');
        $this->assertSame($expected, array_column($data, 'id'));
        foreach ($retired as $activity) {
            $this->assertDatabaseHas('actividades', ['id_actividad' => $activity->id_actividad, 'publicado' => false]);
        }
        $this->assertDatabaseHas('respuestas_actividad', ['id_respuesta_actividad' => $responseId, 'id_actividad' => $retired[0]->id_actividad]);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 10);
        $this->postJson('/api/exercises/'.$retired[0]->id_actividad.'/answer', ['answer' => $retired[0]->solucion_actividad])->assertNotFound();
    }

    public function test_existing_lesson_updates_the_two_farewells_without_replacing_its_exercises(): void
    {
        $unit = $this->unit();
        $lesson = Tema::where('clave_leccion', UnidadDosGuiadaSeeder::LESSON_KEY)->firstOrFail();
        $lesson->update(['contenido_tema' => str_replace(['Kayakaman = hasta mañana', 'Kipakaman = hasta luego'], ['Kayakama = hasta mañana', 'Tupananchikkama = hasta luego'], $lesson->contenido_tema)]);
        $ids = Actividad::where('id_unidad', $unit->id_unidad)->orderBy('orden_actividad')->pluck('id_actividad')->all();
        Sanctum::actingAs(Usuario::factory()->create());

        $this->seed(UnidadDosGuiadaSeeder::class);

        $body = $this->getJson('/api/units/'.$unit->id_unidad.'/topics/'.$lesson->id_tema)->assertOk()->json('body');
        $this->assertStringContainsString('Kayakaman = hasta mañana', $body);
        $this->assertStringContainsString('Kipakaman = hasta luego', $body);
        $this->assertStringNotContainsString('Kayakama =', $body);
        $this->assertStringNotContainsString('Tupananchikkama', $body);
        $this->assertSame($ids, Actividad::where('id_unidad', $unit->id_unidad)->orderBy('orden_actividad')->pluck('id_actividad')->all());
    }

    public function test_greetings_lesson_and_three_private_image_questions_are_shared_by_both_roles(): void
    {
        $unit = $this->unit();
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/units/'.$unit->id_unidad)->assertOk()->assertJsonPath('sort_order', 2)
            ->assertJsonPath('config.learning_mode', 'guided')->assertJsonPath('config.guided_lesson', 'greetings');
        $this->getJson('/api/units/'.$unit->id_unidad.'/contents')->assertOk()->assertJsonPath('data.0.title', 'Saludos y conversación');
        $data = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 25)->json('exercises');
        foreach (['puncha', 'chishi', 'tuta'] as $index => $answer) {
            $exercise = $data[$index];
            $this->assertArrayNotHasKey('solution', $exercise);
            $this->assertArrayNotHasKey('correct_feedback', $exercise['config']);
            $this->assertSame(['08:00', '17:30', '21:00'][$index], $exercise['config']['context_text']);
            $this->assertSame('1. SALUDOS ( NAPAYKUNA )', $exercise['config']['title']);
            $this->assertSame(['seleccion' => [$answer]], Actividad::findOrFail($exercise['id'])->solucion_actividad);
            $this->assertEqualsCanonicalizing(['Alli puncha', 'Alli chishi', 'Alli tuta'], array_column($exercise['elements'], 'texto'));
            $this->get('/api/media/'.$exercise['config']['prompt_image'])->assertOk()->assertHeader('Content-Type', 'image/webp');
        }
        $this->assertCount(3, array_unique(array_column(array_column(array_slice($data, 0, 3), 'config'), 'prompt_image')));
        $this->assertSame('completar', $data[3]['type']);
        $this->assertTrue($data[3]['config']['listening_greetings']);
        $this->assertArrayNotHasKey('solution', $data[3]);
        $this->assertSame(['Alli _____, churi.', 'Alli _____, kusa.', 'Alli _____, tayta.'], array_column($data[3]['elements'], 'texto'));
        $sentenceSolution = Actividad::findOrFail($data[3]['id'])->solucion_actividad['textos'];
        $this->assertSame(['puncha'], $sentenceSolution['alli-puncha-churi']);
        $this->assertSame(['chishi'], $sentenceSolution['alli-chishi-kusa']);
        $this->assertSame(['tuta'], $sentenceSolution['alli-tuta-tayta']);
        $this->assertSame('completar', $data[4]['type']);
        $this->assertSame('2. PREGUNTAS Y RESPUESTAS ( TAPUYKUNA KUTICHIKUNAPASH )', $data[4]['config']['title']);
        $this->assertTrue($data[4]['config']['listening_questions']);
        $this->assertArrayNotHasKey('solution', $data[4]);
        $this->assertSame(['Pregunta 1', 'Pregunta 2', 'Pregunta 3'], array_column($data[4]['elements'], 'texto'));
        $questionSolution = Actividad::findOrFail($data[4]['id'])->solucion_actividad['textos'];
        foreach (['imatak' => '¿Qué es?', 'pitak-kan' => '¿Quién es?', 'imamanta' => '¿Por qué?'] as $id => $meaning) {
            $this->assertSame([$meaning], $questionSolution[$id]);
        }
        foreach ($data[4]['elements'] as $element) {
            $this->assertCount(3, $element['opciones']);
            $this->get('/api/media/'.$element['imagen'])->assertOk()->assertHeader('Content-Type', 'image/webp');
        }
        foreach (['q', 'a'] as $groupIndex => $group) {
            foreach (range(0, $group === 'a' ? 2 : 5) as $index) {
                $scene = $data[5 + $groupIndex * 6 + $index];
                $this->assertSame('seleccion_multiple', $scene['type']);
                $this->assertTrue($scene['config']['scene_choice']);
                $this->assertSame($group, $scene['config']['conversation_group']);
                $this->assertCount(3, $scene['elements']);
                if ($group === 'q') {
                    foreach ($scene['elements'] as $element) {
                        $this->assertDoesNotMatchRegularExpression('/[¿?]/u', $element['texto']);
                    }
                    $this->assertStringContainsString('?', $scene['config']['context_text']);
                }
                $this->assertSame(['seleccion' => [$group.'-'.$index]], Actividad::findOrFail($scene['id'])->solucion_actividad);
                $this->assertArrayNotHasKey('solution', $scene);
                $this->get('/api/media/'.$scene['config']['prompt_image'])->assertOk()->assertHeader('Content-Type', 'image/webp');
            }
        }
        $farewellRows = [
            ['Kipakaman', 'Hasta luego'], ['Kayakaman', 'Hasta mañana'], ['Shukti punchakama', 'Hasta otro día'],
            ['Ashtak kaman', 'Hasta pronto'], ['Chisikaman', 'Hasta tarde'],
        ];
        foreach ($farewellRows as $index => [$kichwa, $spanish]) {
            $scene = $data[14 + $index];
            $this->assertTrue($scene['config']['scene_choice']);
            $this->assertSame('d', $scene['config']['conversation_group']);
            $this->assertSame('3. DESPEDIDA ( CHIKANYARIKUNA )', $scene['config']['title']);
            $this->assertSame($spanish, $scene['config']['context_text']);
            $this->assertCount(3, $scene['elements']);
            $this->assertSame($kichwa, collect($scene['elements'])->keyBy('id')['d-'.$index]['texto']);
            $this->assertSame(['seleccion' => ['d-'.$index]], Actividad::findOrFail($scene['id'])->solucion_actividad);
            $this->get('/api/media/'.$scene['config']['prompt_image'])->assertOk()->assertHeader('Content-Type', 'image/webp');
        }
        $this->assertCount(5, array_unique(array_column(array_column(array_slice($data, 14, 5), 'config'), 'prompt_image')));
        foreach ([['Alli shamushka', 'Bienvenido'], ['Yupaychani', 'Gracias'], ['Kishpichiway', 'Perdón'], ['Tiyaripay', 'Siéntese']] as $index => [$kichwa, $spanish]) {
            $scene = $data[19 + $index];
            $this->assertTrue($scene['config']['scene_choice']);
            $this->assertSame('c', $scene['config']['conversation_group']);
            $this->assertSame('4. CORTESÍA ( ALLI KAWSAYMANTA RIMAYKUNA )', $scene['config']['title']);
            $this->assertSame($spanish, $scene['config']['context_text']);
            $this->assertCount(3, $scene['elements']);
            $this->assertCount(3, array_unique(array_column($scene['elements'], 'id')));
            $this->assertSame($kichwa, collect($scene['elements'])->keyBy('id')['c-'.$index]['texto']);
            $this->assertSame(['seleccion' => ['c-'.$index]], Actividad::findOrFail($scene['id'])->solucion_actividad);
            $this->get('/api/media/'.$scene['config']['prompt_image'])->assertOk()->assertHeader('Content-Type', 'image/webp');
        }
        $this->assertCount(4, array_unique(array_column(array_column(array_slice($data, 19, 4), 'config'), 'prompt_image')));
        $sentences = [
            ['Kichpichiway yachachik kampak yachana ukuman yaykunkapak', 'Disculpe, licenciado, ¿puedo ingresar a sus clases?'],
            ['Kishpichiway yachachik ishpana ukuman rinkapak', 'Disculpe, licenciado, ¿puedo ir al baño?'],
        ];
        foreach ($sentences as $index => [$kichwa, $spanish]) {
            $sentence = $data[23 + $index];
            $this->assertSame('ordenar', $sentence['type']);
            $this->assertTrue($sentence['config']['sentence_order']);
            $this->assertSame($spanish, $sentence['config']['context_text']);
            $this->assertArrayNotHasKey('solution', $sentence);
            $record = Actividad::findOrFail($sentence['id']);
            $words = array_column($sentence['elements'], 'texto', 'id');
            $this->assertSame($kichwa, implode(' ', array_map(fn ($id) => $words[$id], $record->solucion_actividad['orden'])));
            $this->assertNotSame(array_keys($words), $record->solucion_actividad['orden']);
            $this->get('/api/media/'.$sentence['config']['prompt_image'])->assertOk()->assertHeader('Content-Type', 'image/webp');
        }
        $this->assertCount(2, array_unique(array_column(array_column(array_slice($data, 23, 2), 'config'), 'prompt_image')));
        $this->getJson('/api/units/'.$unit->id_unidad.'/exercises')->assertOk()->assertJsonPath('total', 25);
        $this->getJson('/api/progress')->assertOk()->assertJsonPath('0.total_activities', 31);
        $first = Unidad::findOrFail(Tema::where('clave_leccion', UnidadUnoGuiadaSeeder::LESSON_KEY)->value('id_unidad'));
        $this->getJson('/api/units/'.$first->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 6);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/admin/overview')->assertOk()->assertJsonPath('exercises', 31)->assertJsonPath('contents', 2);
        $adminExercise = $this->getJson('/api/admin/exercises/'.$data[0]['id'])->assertOk()->json();
        $this->patchJson('/api/admin/exercises/'.$data[0]['id'], $adminExercise)->assertOk();
        $conversationData = $this->getJson('/api/admin/exercises/'.$data[5]['id'])->assertOk()->json();
        $this->patchJson('/api/admin/exercises/'.$data[5]['id'], $conversationData)->assertOk()->assertJsonPath('config.scene_choice', true);
        $conversationData['elements'][0]['id'] = 'unsupported';
        $this->patchJson('/api/admin/exercises/'.$data[5]['id'], $conversationData)->assertUnprocessable()->assertJsonValidationErrors('config');
        $ordered = $this->getJson('/api/admin/exercises/'.$data[23]['id'])->assertOk()->json();
        $this->patchJson('/api/admin/exercises/'.$data[23]['id'], $ordered)->assertOk()->assertJsonPath('config.sentence_order', true);
        $ordered['elements'][0]['texto'] = 'dos palabras';
        $this->patchJson('/api/admin/exercises/'.$data[23]['id'], $ordered)->assertUnprocessable()->assertJsonValidationErrors('config');
        $sentenceExercise = $this->getJson('/api/admin/exercises/'.$data[3]['id'])->assertOk()->json();
        $this->patchJson('/api/admin/exercises/'.$data[3]['id'], $sentenceExercise)->assertOk()->assertJsonPath('config.listening_greetings', true);
        $sentenceExercise['elements'][0]['texto'] = 'Alli puncha churi.';
        $this->patchJson('/api/admin/exercises/'.$data[3]['id'], $sentenceExercise)->assertUnprocessable()->assertJsonValidationErrors('config');
        $audioExercise = $this->getJson('/api/admin/exercises/'.$data[4]['id'])->assertOk()->json();
        $this->patchJson('/api/admin/exercises/'.$data[4]['id'], $audioExercise)->assertOk()->assertJsonPath('config.listening_questions', true);
        $audioExercise['elements'][0]['id'] = 'unsupported';
        $this->patchJson('/api/admin/exercises/'.$data[4]['id'], $audioExercise)->assertUnprocessable()->assertJsonValidationErrors('config');
        $this->patchJson('/api/admin/units/'.$unit->id_unidad, ['module_id' => $unit->id_modulo, 'title' => $unit->titulo_unidad,
            'description' => $unit->objetivo_unidad, 'config' => $unit->configuracion, 'published' => true])
            ->assertOk()->assertJsonPath('config.guided_lesson', 'greetings');
    }

    public function test_each_new_attempt_scores_and_rewards_again_and_seeding_preserves_answers(): void
    {
        $unit = $this->unit();
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $exercises = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get();
        foreach ([250, 500] as $total) {
            $session = (string) Str::uuid();
            $ids = [];
            foreach ($exercises as $index => $exercise) {
                $url = '/api/exercises/'.$exercise->id_actividad.'/answer';
                if ($index === 0) {
                    $this->postJson($url, ['answer' => ['seleccion' => ['tuta']], 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])
                        ->assertOk()->assertJsonPath('is_correct', false)->assertJsonPath('xp_earned', 0)->assertJsonPath('xp_attempt', 0);
                }
                $payload = ['answer' => $exercise->tipo_actividad === 'completar' ? ['textos' => array_map(fn ($variants) => $variants[0], $exercise->solucion_actividad['textos'])] : $exercise->solucion_actividad, 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()];
                $result = $this->postJson($url, $payload)->assertOk()->assertJsonPath('is_correct', true)->assertJsonPath('xp_earned', 10)->json();
                $ids[] = $result['response_id'];
                $this->postJson($url, $payload)->assertOk()->assertExactJson($result);
                $changedAnswer = $exercise->tipo_actividad === 'relacionar' ? ['pares' => [
                    ['origen' => 'imatak', 'destino' => 'quien-es'],
                    ['origen' => 'pitak-kan', 'destino' => 'que-es'],
                    ['origen' => 'imamanta', 'destino' => 'por-que'],
                ]] : ($exercise->tipo_actividad === 'completar' ? ['textos' => ['alli-puncha-churi' => 'tuta', 'alli-chishi-kusa' => 'chishi', 'alli-tuta-tayta' => 'tuta']] : ['seleccion' => [$index === 2 ? 'puncha' : 'tuta']]);
                if ($exercise->tipo_actividad === 'seleccion_multiple') {
                    $wrong = collect($exercise->elementos_actividad)->first(fn ($element) => ! in_array($element['id'], $exercise->solucion_actividad['seleccion'], true));
                    $changedAnswer = ['seleccion' => [$wrong['id']]];
                }
                if ($exercise->tipo_actividad === 'ordenar') {
                    $changedAnswer = ['orden' => array_reverse($exercise->solucion_actividad['orden'])];
                }
                if ($exercise->configuracion['listening_questions'] ?? false) {
                    $changedAnswer = ['textos' => ['imatak' => '¿Por qué?', 'pitak-kan' => '¿Quién es?', 'imamanta' => '¿Por qué?']];
                }
                if ($exercise->configuracion['conversation_pairs'] ?? false) {
                    $changedAnswer = $exercise->solucion_actividad;
                    [$changedAnswer['pares'][0]['destino'], $changedAnswer['pares'][1]['destino']] = [$changedAnswer['pares'][1]['destino'], $changedAnswer['pares'][0]['destino']];
                }
                $this->postJson($url, ['answer' => $changedAnswer, 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])->assertConflict();
                $this->travel(1)->minutes();
            }
            $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => $ids, 'practice_attempt_id' => $session])
                ->assertOk()->assertJsonPath('score', 25)->assertJsonPath('max_score', 25)->assertJsonPath('correct_count', 25)
                ->assertJsonPath('total_items', 25)->assertJsonPath('passed', true)->assertJsonPath('xp_earned', 250)->assertJsonPath('xp_total', $total);
        }
        $this->seed(UnidadDosGuiadaSeeder::class);
        $this->assertSame($exercises->pluck('id_actividad')->all(), Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->pluck('id_actividad')->all());
        $this->assertDatabaseCount('respuestas_actividad', 52);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 500)->assertJsonPath('completed_units.0', $unit->id_unidad);
        $this->getJson('/api/progress')->assertOk()->assertJsonPath('0.total_activities', 31)->assertJsonPath('0.completed_activities', 25);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/admin/learning-results/'.$student->id_usuario)->assertOk()->assertJsonPath('xp', 500);
    }

    public function test_score_uses_saved_answers_and_rejects_incomplete_or_foreign_attempts(): void
    {
        $unit = $this->unit();
        Sanctum::actingAs(Usuario::factory()->create());
        $session = (string) Str::uuid();
        $ids = [];
        foreach (Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get() as $index => $exercise) {
            $ids[] = $this->postJson('/api/exercises/'.$exercise->id_actividad.'/answer', [
                'answer' => $index === 2 ? ['seleccion' => ['puncha']] : ($exercise->tipo_actividad === 'completar' ? ['textos' => array_map(fn ($variants) => $variants[0], $exercise->solucion_actividad['textos'])] : $exercise->solucion_actividad),
                'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid(),
            ])->assertOk()->json('response_id');
        }
        $url = '/api/units/'.$unit->id_unidad.'/guided/result';
        $payload = ['response_ids' => $ids, 'practice_attempt_id' => $session, 'score' => 20];
        $this->postJson($url, $payload)->assertUnprocessable()
            ->assertJsonPath('errors.response_ids.0', 'Corrige todos los ejercicios de esta unidad antes de ver tu resultado.');
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 240);
        $exercise = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get()[2];
        $ids[2] = $this->postJson('/api/exercises/'.$exercise->id_actividad.'/answer', [
            'answer' => $exercise->tipo_actividad === 'completar' ? ['textos' => array_map(fn ($variants) => $variants[0], $exercise->solucion_actividad['textos'])] : $exercise->solucion_actividad, 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid(),
        ])->assertOk()->json('response_id');
        $this->postJson($url, ['response_ids' => $ids, 'practice_attempt_id' => $session])->assertOk()
            ->assertJsonPath('score', 25)->assertJsonPath('max_score', 25)->assertJsonPath('xp_earned', 250);
        $this->postJson($url, ['response_ids' => array_slice($ids, 0, 2), 'practice_attempt_id' => $session])->assertUnprocessable();
        $this->postJson($url, array_replace($payload, ['practice_attempt_id' => (string) Str::uuid()]))->assertUnprocessable();
        Sanctum::actingAs(Usuario::factory()->create());
        $this->postJson($url, $payload)->assertUnprocessable();
    }

    public function test_visual_update_versions_used_questions_preserving_order_progress_and_rewards(): void
    {
        $unit = $this->unit();
        $exercise = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->firstOrFail();
        $config = $exercise->configuracion;
        unset($config['context_text']);
        $exercise->update(['configuracion' => $config]);
        Sanctum::actingAs(Usuario::factory()->create());
        $response = $this->postJson('/api/exercises/'.$exercise->id_actividad.'/answer', ['answer' => $exercise->tipo_actividad === 'completar' ? ['textos' => array_map(fn ($variants) => $variants[0], $exercise->solucion_actividad['textos'])] : $exercise->solucion_actividad])
            ->assertOk()->assertJsonPath('xp_earned', 10)->json('response_id');

        $this->seed(UnidadDosGuiadaSeeder::class);

        $data = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 25)
            ->assertJsonPath('completed_count', 1)->assertJsonPath('exercises.0.completed', true)->assertJsonPath('exercises.0.config.context_text', '08:00')->json();
        $this->assertNotSame($exercise->id_actividad, $data['exercises'][0]['id']);
        $this->assertDatabaseHas('respuestas_actividad', ['id_respuesta_actividad' => $response, 'id_actividad' => $exercise->id_actividad]);
        $this->assertDatabaseHas('actividades', ['id_actividad' => $exercise->id_actividad, 'publicado' => false]);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 10);
        $this->seed(UnidadDosGuiadaSeeder::class);
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertExactJson($data);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/admin/overview')->assertOk()->assertJsonPath('exercises', 31);
    }

    public function test_sentence_panel_is_inserted_before_used_questions_without_losing_their_answers(): void
    {
        $unit = $this->unit();
        Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-listening-greetings-v1')->delete();
        $questions = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-listening-questions-v1')->where('publicado', true)->firstOrFail();
        Sanctum::actingAs(Usuario::factory()->create());
        $responseId = $this->postJson('/api/exercises/'.$questions->id_actividad.'/answer', ['answer' => ['textos' => array_map(fn ($variants) => $variants[0], $questions->solucion_actividad['textos'])]])
            ->assertOk()->assertJsonPath('xp_earned', 10)->json('response_id');

        $this->seed(UnidadDosGuiadaSeeder::class);

        $data = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 25)
            ->assertJsonPath('exercises.3.config.listening_greetings', true)->assertJsonPath('exercises.4.id', $questions->id_actividad)->json();
        $this->assertDatabaseHas('respuestas_actividad', ['id_respuesta_actividad' => $responseId, 'id_actividad' => $questions->id_actividad]);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 10);
        $this->seed(UnidadDosGuiadaSeeder::class);
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertExactJson($data);
    }

    public function test_visual_question_update_preserves_answers_and_rewards_from_the_previous_matching_exercise(): void
    {
        $unit = $this->unit();
        Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-listening-questions-v1')->where('publicado', true)->delete();
        $old = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-listening-questions-v1')->firstOrFail();
        $old->update(['publicado' => true]);
        Sanctum::actingAs(Usuario::factory()->create());
        $responseId = $this->postJson('/api/exercises/'.$old->id_actividad.'/answer', ['answer' => $old->solucion_actividad])
            ->assertOk()->assertJsonPath('xp_earned', 10)->json('response_id');

        $this->seed(UnidadDosGuiadaSeeder::class);

        $data = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 25)->assertJsonPath('exercises.4.type', 'completar')->json();
        $this->assertNotSame($old->id_actividad, $data['exercises'][4]['id']);
        $this->assertDatabaseHas('respuestas_actividad', ['id_respuesta_actividad' => $responseId, 'id_actividad' => $old->id_actividad]);
        $this->assertDatabaseHas('actividades', ['id_actividad' => $old->id_actividad, 'publicado' => false]);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 10);
        $this->seed(UnidadDosGuiadaSeeder::class);
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertExactJson($data);
    }

    public function test_retired_ordered_sentences_preserve_answers_and_rewards_and_stay_retired(): void
    {
        $unit = $this->unit();
        $source = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-courtesy-order-0-v1')->firstOrFail();
        $position = (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
        $retired = [];
        foreach ([2 => 'Disculpe para salir', 3 => 'Perdón madre tierra'] as $index => $meaning) {
            $activity = $source->replicate();
            $activity->origen_reactivo = 'u2-courtesy-order-'.$index.'-v1';
            $activity->orden_actividad = ++$position;
            $activity->configuracion = array_replace($source->configuracion, ['context_text' => $meaning]);
            $activity->save();
            $retired[] = $activity;
        }
        $source->update(['configuracion' => array_replace($source->configuracion, ['context_meaning' => 'Oración 1 de 4'])]);
        Sanctum::actingAs(Usuario::factory()->create());
        foreach ([$source, ...$retired] as $activity) {
            $this->postJson('/api/exercises/'.$activity->id_actividad.'/answer', ['answer' => $activity->solucion_actividad])->assertOk()->assertJsonPath('xp_earned', 10);
        }

        $this->seed(UnidadDosGuiadaSeeder::class);
        $ids = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->pluck('id_actividad')->all();
        $this->seed(UnidadDosGuiadaSeeder::class);

        $data = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 25)->json('exercises');
        $this->assertSame($ids, array_column($data, 'id'));
        $this->assertSame('Oración 1 de 2', $data[23]['config']['context_meaning']);
        $this->assertSame('Oración 2 de 2', $data[24]['config']['context_meaning']);
        $this->assertFalse($source->refresh()->publicado);
        foreach ($retired as $activity) {
            $this->assertFalse($activity->refresh()->publicado);
            $this->assertDatabaseHas('respuestas_actividad', ['id_actividad' => $activity->id_actividad]);
            $this->postJson('/api/exercises/'.$activity->id_actividad.'/answer', ['answer' => $activity->solucion_actividad])->assertNotFound();
        }
        $this->assertDatabaseHas('respuestas_actividad', ['id_actividad' => $source->id_actividad]);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 30);
    }

    public function test_guided_catalog_is_cached_while_completion_stays_private_and_publication_refreshes_it(): void
    {
        $unit = $this->unit();
        Sanctum::actingAs(Usuario::factory()->create());
        $url = '/api/units/'.$unit->id_unidad.'/guided';
        $catalog = $this->getJson($url)->assertOk()->json();
        DB::enableQueryLog();
        DB::flushQueryLog();
        $this->getJson($url)->assertOk()->assertExactJson($catalog);
        $queries = DB::getQueryLog();
        DB::disableQueryLog();
        $this->assertCount(0, array_filter($queries, fn ($query) => str_contains($query['query'], 'select * from "actividades"')));
        $first = Actividad::findOrFail($catalog['exercises'][0]['id']);
        $this->postJson('/api/exercises/'.$first->id_actividad.'/answer', ['answer' => $first->solucion_actividad])->assertOk();
        $this->getJson($url)->assertOk()->assertJsonPath('completed_count', 1)->assertJsonPath('exercises.0.completed', true);
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson($url)->assertOk()->assertJsonPath('completed_count', 0)->assertJsonPath('exercises.0.completed', false);
        Actividad::findOrFail($catalog['exercises'][1]['id'])->update(['enunciado_actividad' => 'Catálogo actualizado']);
        PublicacionContenido::invalidate();
        $this->getJson($url)->assertOk()->assertJsonPath('exercises.1.prompt', 'Catálogo actualizado');
    }

    public function test_ordered_sentences_reject_missing_or_duplicate_words_and_grade_the_order_independently(): void
    {
        $unit = $this->unit();
        $sentences = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->where('tipo_actividad', 'ordenar')->orderBy('orden_actividad')->get();
        Sanctum::actingAs(Usuario::factory()->create());
        $first = $sentences[0];
        $correct = $first->solucion_actividad['orden'];
        $attempt = (string) Str::uuid();
        $url = '/api/exercises/'.$first->id_actividad.'/answer';
        $this->postJson($url, ['answer' => ['orden' => array_slice($correct, 1)]])->assertUnprocessable();
        $this->postJson($url, ['answer' => ['orden' => array_fill(0, count($correct), $correct[0])]])->assertUnprocessable();
        $this->postJson($url, ['answer' => ['orden' => array_reverse($correct)], 'practice_attempt_id' => $attempt, 'submission_id' => (string) Str::uuid()])
            ->assertOk()->assertJsonPath('is_correct', false)->assertJsonPath('xp_earned', 0);
        $this->postJson('/api/exercises/'.$sentences[1]->id_actividad.'/answer', ['answer' => $sentences[1]->solucion_actividad, 'practice_attempt_id' => $attempt, 'submission_id' => (string) Str::uuid()])
            ->assertOk()->assertJsonPath('is_correct', true)->assertJsonPath('xp_earned', 10);
        $this->postJson($url, ['answer' => ['orden' => $correct], 'practice_attempt_id' => $attempt, 'submission_id' => (string) Str::uuid()])
            ->assertOk()->assertJsonPath('is_correct', true)->assertJsonPath('xp_attempt', 20);
    }

    public function test_kichwa_question_copy_updates_saved_scenes_without_changing_spanish_or_graded_answers(): void
    {
        $unit = $this->unit();
        $scene = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-scene-q-0-v1')->firstOrFail();
        $elements = array_map(fn ($element) => array_replace($element, ['texto' => '¿'.$element['texto'].'?']), $scene->elementos_actividad);
        $scene->update(['elementos_actividad' => $elements]);
        $lesson = Tema::where('clave_leccion', UnidadDosGuiadaSeeder::LESSON_KEY)->firstOrFail();
        $lesson->update(['contenido_tema' => str_replace('Imanalla kanki', 'Imanalla kanki?', $lesson->contenido_tema)]);
        Sanctum::actingAs(Usuario::factory()->create());
        $responseId = $this->postJson('/api/exercises/'.$scene->id_actividad.'/answer', ['answer' => $scene->solucion_actividad])
            ->assertOk()->assertJsonPath('is_correct', true)->json('response_id');

        $this->seed(UnidadDosGuiadaSeeder::class);

        $replacement = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-scene-q-0-v1')->where('publicado', true)->firstOrFail();
        $this->assertNotSame($scene->id_actividad, $replacement->id_actividad);
        $this->assertFalse($scene->refresh()->publicado);
        foreach ($replacement->elementos_actividad as $element) {
            $this->assertDoesNotMatchRegularExpression('/[¿?]/u', $element['texto']);
        }
        $this->assertSame('¿Cómo estás?', $replacement->configuracion['context_text']);
        $this->assertStringNotContainsString('Imanalla kanki?', $lesson->refresh()->contenido_tema);
        $this->assertStringContainsString('¿Cómo estás?', $lesson->contenido_tema);
        $this->assertSame(['seleccion' => ['q-0']], $scene->solucion_actividad);
        $this->assertDatabaseHas('respuestas_actividad', ['id_respuesta_actividad' => $responseId, 'id_actividad' => $scene->id_actividad, 'acierto_actividad' => true]);
    }

    public function test_farewell_scenes_preserve_the_previous_matching_answer_and_other_exercises(): void
    {
        $unit = $this->unit();
        Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'like', 'u2-scene-d-%')->delete();
        $old = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-expressions-d-v1')->firstOrFail();
        $old->update(['publicado' => true]);
        $otherIds = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->whereKeyNot($old->id_actividad)->pluck('id_actividad')->all();
        Sanctum::actingAs(Usuario::factory()->create());
        $responseId = $this->postJson('/api/exercises/'.$old->id_actividad.'/answer', ['answer' => $old->solucion_actividad])
            ->assertOk()->assertJsonPath('is_correct', true)->assertJsonPath('xp_earned', 10)->json('response_id');

        $this->seed(UnidadDosGuiadaSeeder::class);

        $this->assertDatabaseHas('actividades', ['id_actividad' => $old->id_actividad, 'publicado' => false]);
        $this->assertDatabaseHas('respuestas_actividad', ['id_respuesta_actividad' => $responseId, 'id_actividad' => $old->id_actividad]);
        $this->assertSame(5, Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->where('origen_reactivo', 'like', 'u2-scene-d-%')->count());
        $this->assertCount(count($otherIds), Actividad::whereKey($otherIds)->where('publicado', true)->get());
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 10);
    }

    public function test_split_exercises_grade_and_reward_independently_while_preserving_the_old_attempt(): void
    {
        $unit = $this->unit();
        Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'like', 'u2-scene-%')->delete();
        Actividad::where('id_unidad', $unit->id_unidad)->whereIn('origen_reactivo', ['u2-conversation-q-v2', 'u2-conversation-a-v2'])->delete();
        $old = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-conversation-pairs-v1')->firstOrFail();
        $old->update(['publicado' => true]);
        Sanctum::actingAs(Usuario::factory()->create());
        $oldResponse = $this->postJson('/api/exercises/'.$old->id_actividad.'/answer', ['answer' => $old->solucion_actividad])
            ->assertOk()->assertJsonPath('xp_earned', 10)->json('response_id');

        $this->seed(UnidadDosGuiadaSeeder::class);

        $questions = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-scene-q-0-v1')->firstOrFail();
        $answers = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-scene-a-0-v1')->firstOrFail();
        $this->assertDatabaseHas('respuestas_actividad', ['id_respuesta_actividad' => $oldResponse, 'id_actividad' => $old->id_actividad]);
        $this->assertDatabaseHas('actividades', ['id_actividad' => $old->id_actividad, 'publicado' => false]);
        $attempt = (string) Str::uuid();
        $questionResponse = $this->postJson('/api/exercises/'.$questions->id_actividad.'/answer', ['answer' => $questions->solucion_actividad, 'practice_attempt_id' => $attempt, 'submission_id' => (string) Str::uuid()])
            ->assertOk()->assertJsonPath('is_correct', true)->assertJsonPath('xp_earned', 10)->assertJsonPath('xp_attempt', 10)->json('response_id');
        $incorrect = $answers->solucion_actividad;
        $wrong = collect($answers->elementos_actividad)->first(fn ($element) => $element['id'] !== $answers->solucion_actividad['seleccion'][0]);
        $incorrect = ['seleccion' => [$wrong['id']]];
        $this->postJson('/api/exercises/'.$answers->id_actividad.'/answer', ['answer' => $incorrect, 'practice_attempt_id' => $attempt, 'submission_id' => (string) Str::uuid()])
            ->assertOk()->assertJsonPath('is_correct', false)->assertJsonPath('xp_earned', 0)->assertJsonPath('xp_attempt', 10);
        $this->assertDatabaseHas('respuestas_actividad', ['id_respuesta_actividad' => $questionResponse, 'id_actividad' => $questions->id_actividad, 'acierto_actividad' => true]);
        $this->postJson('/api/exercises/'.$answers->id_actividad.'/answer', ['answer' => $answers->solucion_actividad, 'practice_attempt_id' => $attempt, 'submission_id' => (string) Str::uuid()])
            ->assertOk()->assertJsonPath('is_correct', true)->assertJsonPath('xp_earned', 10)->assertJsonPath('xp_attempt', 20);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 30);
        $this->seed(UnidadDosGuiadaSeeder::class);
        $this->assertSame(2, Actividad::where('id_unidad', $unit->id_unidad)->whereIn('origen_reactivo', ['u2-conversation-q-v2', 'u2-conversation-a-v2'])->count());
    }
}
