<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\Tema;
use App\Models\Unidad;
use App\Models\Usuario;
use Database\Seeders\UnidadDosGuiadaSeeder;
use Database\Seeders\UnidadUnoGuiadaSeeder;
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
        $data = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 9)->json('exercises');
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
        $this->assertTrue($data[5]['config']['conversation_pairs']);
        $this->assertCount(12, $data[5]['elements']);
        $conversation = Actividad::findOrFail($data[5]['id']);
        $this->assertCount(6, $conversation->solucion_actividad['pares']);
        $this->assertSame('q', $data[5]['config']['conversation_group']);
        $this->assertSame('a', $data[6]['config']['conversation_group']);
        $this->assertCount(12, $data[6]['elements']);
        $this->assertSame(['Imanalla kanki?', 'Maymanta kanki?', 'Maypitak llankanki?', 'Mashna watakunatatak charinki?', 'Llakillachu kanki?', 'Imata ruranki?'], array_slice(array_column($data[5]['elements'], 'texto'), 0, 6));
        $this->assertSame(['Allilla kani', 'Ambatomanta kani', 'Quitupi llankani', 'Ishkay chunka watakuntami charini', 'Ari', 'Nimata'], array_slice(array_column($data[6]['elements'], 'texto'), 0, 6));
        foreach ([
            7 => ['group' => 'd', 'title' => '3. DESPEDIDA ( CHIKANYARIKUNA )', 'rows' => [
                ['Kipakaman', 'Hasta luego'], ['Kayakaman', 'Hasta mañana'], ['Shukti punchakama', 'Hasta otro día'], ['Ashtak kaman', 'Hasta pronto'], ['Chisikaman', 'Hasta tarde'],
            ]],
            8 => ['group' => 'c', 'title' => '4. CORTESÍA ( ALLI KAWSAYMANTA RIMAYKUNA )', 'rows' => [
                ['Alli shamushka', 'Bienvenido'], ['Yupaychani', 'Gracias'], ['Kishpichiway', 'Perdón'], ['Tiyaripay', 'Siéntese'],
            ]],
        ] as $index => $expected) {
            $this->assertSame($expected['title'], $data[$index]['config']['title']);
            $this->assertSame($expected['group'], $data[$index]['config']['conversation_group']);
            $this->assertCount(count($expected['rows']) * 2, $data[$index]['elements']);
            $elements = collect($data[$index]['elements'])->keyBy('id');
            $solution = Actividad::findOrFail($data[$index]['id'])->solucion_actividad['pares'];
            $this->assertCount(count($expected['rows']), $solution);
            foreach ($expected['rows'] as $row => [$kichwa, $spanish]) {
                $this->assertSame($kichwa, $elements[$solution[$row]['origen']]['texto']);
                $this->assertSame($spanish, $elements[$solution[$row]['destino']]['texto']);
            }
        }
        $this->getJson('/api/units/'.$unit->id_unidad.'/exercises')->assertOk()->assertJsonPath('total', 9);
        $this->getJson('/api/progress')->assertOk()->assertJsonPath('0.total_activities', 15);
        $first = Unidad::findOrFail(Tema::where('clave_leccion', UnidadUnoGuiadaSeeder::LESSON_KEY)->value('id_unidad'));
        $this->getJson('/api/units/'.$first->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 6);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/admin/overview')->assertOk()->assertJsonPath('exercises', 15)->assertJsonPath('contents', 2);
        $adminExercise = $this->getJson('/api/admin/exercises/'.$data[0]['id'])->assertOk()->json();
        $this->patchJson('/api/admin/exercises/'.$data[0]['id'], $adminExercise)->assertOk();
        $conversationData = $this->getJson('/api/admin/exercises/'.$data[5]['id'])->assertOk()->json();
        $this->patchJson('/api/admin/exercises/'.$data[5]['id'], $conversationData)->assertOk()->assertJsonPath('config.conversation_pairs', true);
        $conversationData['elements'][0]['id'] = 'unsupported';
        $this->patchJson('/api/admin/exercises/'.$data[5]['id'], $conversationData)->assertUnprocessable()->assertJsonValidationErrors('config');
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
        foreach ([90, 180] as $total) {
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
                if ($exercise->configuracion['listening_questions'] ?? false) {
                    $changedAnswer = ['textos' => ['imatak' => '¿Por qué?', 'pitak-kan' => '¿Quién es?', 'imamanta' => '¿Por qué?']];
                }
                if ($exercise->configuracion['conversation_pairs'] ?? false) {
                    $changedAnswer = $exercise->solucion_actividad;
                    [$changedAnswer['pares'][0]['destino'], $changedAnswer['pares'][1]['destino']] = [$changedAnswer['pares'][1]['destino'], $changedAnswer['pares'][0]['destino']];
                }
                $this->postJson($url, ['answer' => $changedAnswer, 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])->assertConflict();
            }
            $this->postJson('/api/units/'.$unit->id_unidad.'/guided/result', ['response_ids' => $ids, 'practice_attempt_id' => $session])
                ->assertOk()->assertJsonPath('score', 9)->assertJsonPath('max_score', 9)->assertJsonPath('correct_count', 9)
                ->assertJsonPath('total_items', 9)->assertJsonPath('passed', true)->assertJsonPath('xp_earned', 90)->assertJsonPath('xp_total', $total);
        }
        $this->seed(UnidadDosGuiadaSeeder::class);
        $this->assertSame($exercises->pluck('id_actividad')->all(), Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->pluck('id_actividad')->all());
        $this->assertDatabaseCount('respuestas_actividad', 20);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 180)->assertJsonPath('completed_units.0', $unit->id_unidad);
        $this->getJson('/api/progress')->assertOk()->assertJsonPath('0.total_activities', 15)->assertJsonPath('0.completed_activities', 9);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/admin/learning-results/'.$student->id_usuario)->assertOk()->assertJsonPath('xp', 180);
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
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 80);
        $exercise = Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->orderBy('orden_actividad')->get()[2];
        $ids[2] = $this->postJson('/api/exercises/'.$exercise->id_actividad.'/answer', [
            'answer' => $exercise->tipo_actividad === 'completar' ? ['textos' => array_map(fn ($variants) => $variants[0], $exercise->solucion_actividad['textos'])] : $exercise->solucion_actividad, 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid(),
        ])->assertOk()->json('response_id');
        $this->postJson($url, ['response_ids' => $ids, 'practice_attempt_id' => $session])->assertOk()
            ->assertJsonPath('score', 9)->assertJsonPath('max_score', 9)->assertJsonPath('xp_earned', 90);
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

        $data = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 9)
            ->assertJsonPath('completed_count', 1)->assertJsonPath('exercises.0.completed', true)->assertJsonPath('exercises.0.config.context_text', '08:00')->json();
        $this->assertNotSame($exercise->id_actividad, $data['exercises'][0]['id']);
        $this->assertDatabaseHas('respuestas_actividad', ['id_respuesta_actividad' => $response, 'id_actividad' => $exercise->id_actividad]);
        $this->assertDatabaseHas('actividades', ['id_actividad' => $exercise->id_actividad, 'publicado' => false]);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 10);
        $this->seed(UnidadDosGuiadaSeeder::class);
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertExactJson($data);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $this->getJson('/api/admin/overview')->assertOk()->assertJsonPath('exercises', 15);
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

        $data = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 9)
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

        $data = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 9)->assertJsonPath('exercises.4.type', 'completar')->json();
        $this->assertNotSame($old->id_actividad, $data['exercises'][4]['id']);
        $this->assertDatabaseHas('respuestas_actividad', ['id_respuesta_actividad' => $responseId, 'id_actividad' => $old->id_actividad]);
        $this->assertDatabaseHas('actividades', ['id_actividad' => $old->id_actividad, 'publicado' => false]);
        $this->getJson('/api/mastery')->assertOk()->assertJsonPath('xp', 10);
        $this->seed(UnidadDosGuiadaSeeder::class);
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertExactJson($data);
    }

    public function test_split_exercises_grade_and_reward_independently_while_preserving_the_old_attempt(): void
    {
        $unit = $this->unit();
        Actividad::where('id_unidad', $unit->id_unidad)->whereIn('origen_reactivo', ['u2-conversation-q-v2', 'u2-conversation-a-v2'])->delete();
        $old = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-conversation-pairs-v1')->firstOrFail();
        $old->update(['publicado' => true]);
        Sanctum::actingAs(Usuario::factory()->create());
        $oldResponse = $this->postJson('/api/exercises/'.$old->id_actividad.'/answer', ['answer' => $old->solucion_actividad])
            ->assertOk()->assertJsonPath('xp_earned', 10)->json('response_id');

        $this->seed(UnidadDosGuiadaSeeder::class);

        $questions = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-conversation-q-v2')->firstOrFail();
        $answers = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-conversation-a-v2')->firstOrFail();
        $this->assertDatabaseHas('respuestas_actividad', ['id_respuesta_actividad' => $oldResponse, 'id_actividad' => $old->id_actividad]);
        $this->assertDatabaseHas('actividades', ['id_actividad' => $old->id_actividad, 'publicado' => false]);
        $attempt = (string) Str::uuid();
        $questionResponse = $this->postJson('/api/exercises/'.$questions->id_actividad.'/answer', ['answer' => $questions->solucion_actividad, 'practice_attempt_id' => $attempt, 'submission_id' => (string) Str::uuid()])
            ->assertOk()->assertJsonPath('is_correct', true)->assertJsonPath('xp_earned', 10)->assertJsonPath('xp_attempt', 10)->json('response_id');
        $incorrect = $answers->solucion_actividad;
        [$incorrect['pares'][0]['destino'], $incorrect['pares'][1]['destino']] = [$incorrect['pares'][1]['destino'], $incorrect['pares'][0]['destino']];
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
