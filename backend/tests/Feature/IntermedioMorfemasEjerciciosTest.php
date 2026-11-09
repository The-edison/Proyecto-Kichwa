<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\RespuestaActividad;
use App\Models\Unidad;
use App\Models\Usuario;
use Database\Seeders\IntermedioMorfemasEjerciciosSeeder;
use Database\Seeders\IntermedioMorfemasSeeder;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class IntermedioMorfemasEjerciciosTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_family_matching_uses_hijastro_and_hijastra_without_changing_pairs_or_losing_previous_answers(): void
    {
        $this->seed([IntermedioMorfemasSeeder::class, IntermedioMorfemasEjerciciosSeeder::class]);
        $exercise = Actividad::where('origen_reactivo', 'intermedio-m2-u1-practica-7-v2')->firstOrFail();
        $solution = $exercise->solucion_actividad;
        $elements = $exercise->elementos_actividad;
        foreach ($elements as &$element) {
            if ($element['id'] === 'd2') {
                $element['texto'] = 'Entenado';
            } elseif ($element['id'] === 'd3') {
                $element['texto'] = 'Entenada';
            }
        }
        unset($element);
        $exercise->update(['elementos_actividad' => $elements]);
        $exercise->origen_reactivo = 'intermedio-m2-u1-practica-7-v1';
        $exercise->save();
        Sanctum::actingAs(Usuario::factory()->create());
        $response = $this->postJson('/api/exercises/'.$exercise->id_actividad.'/answer', ['answer' => $solution, 'practice_attempt_id' => (string) Str::uuid(), 'submission_id' => (string) Str::uuid()])->assertOk()->assertJsonPath('is_correct', true);

        $this->seed(IntermedioMorfemasEjerciciosSeeder::class);
        $this->seed(IntermedioMorfemasEjerciciosSeeder::class);

        $updated = Actividad::where('origen_reactivo', 'intermedio-m2-u1-practica-7-v2')->firstOrFail();
        $labels = array_column($updated->elementos_actividad, 'texto', 'id');
        $this->assertSame('Lachuri', $labels['k2']);
        $this->assertSame('Hijastro', $labels['d2']);
        $this->assertSame('Laushushi', $labels['k3']);
        $this->assertSame('Hijastra', $labels['d3']);
        $this->assertSame($solution, $updated->solucion_actividad);
        $this->assertSame(1, Actividad::where('origen_reactivo', $updated->origen_reactivo)->count());
        $this->assertFalse($exercise->fresh()->publicado);
        $this->assertSame($elements, $exercise->fresh()->elementos_actividad);
        $this->assertDatabaseHas('respuestas_actividad', ['id_respuesta_actividad' => $response->json('response_id'), 'id_actividad' => $exercise->id_actividad, 'acierto_actividad' => true]);
    }

    public function test_four_family_recordings_have_spanish_meanings_in_two_panels_and_independent_grading(): void
    {
        $this->seed([IntermedioMorfemasSeeder::class, IntermedioMorfemasEjerciciosSeeder::class]);
        $unit = Unidad::where('configuracion->guided_lesson', 'advanced-morphemes')->firstOrFail();
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $items = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 14)->json('exercises');
        $family = array_values(array_filter($items, fn (array $exercise): bool => isset($exercise['config']['morpheme_family_listening'])));
        $this->assertSame(['laushushi', 'layaya', 'lamama', 'lachuri'], array_column(array_column($family, 'config'), 'morpheme_family_listening'));
        $this->assertSame([1, 1, 2, 2], array_column(array_column($family, 'config'), 'morpheme_panel'));
        $meanings = ['La hijastra no quiere trabajar.', 'El joven Brayan tiene muchas mujeres, como el padrastro.', 'Tu hija no cocina, al igual que la madrastra.', 'Él es solo un hijastro.'];
        $correct = ['o0', 'o1', 'o2', 'o1'];
        $session = (string) Str::uuid();
        foreach ($family as $index => $exercise) {
            $options = array_column($exercise['elements'], 'texto', 'id');
            $this->assertSame($meanings[$index], $options[$correct[$index]]);
            $this->postJson('/api/exercises/'.$exercise['id'].'/answer', ['answer' => ['seleccion' => [$correct[$index] === 'o0' ? 'o1' : 'o0']], 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])
                ->assertOk()->assertJsonPath('is_correct', false);
            $response = $this->postJson('/api/exercises/'.$exercise['id'].'/answer', ['answer' => ['seleccion' => [$correct[$index]]], 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])
                ->assertOk()->assertJsonPath('is_correct', true)->json();
            $saved = RespuestaActividad::findOrFail($response['response_id']);
            $this->assertSame($exercise['id'], $saved->id_actividad);
            $this->assertSame(['seleccion' => [$correct[$index]]], $saved->respuesta_actividad);
        }
        $this->assertSame(4, RespuestaActividad::where('id_usuario', $student->id_usuario)->whereIn('id_actividad', array_column($family, 'id'))->where('acierto_actividad', true)->count());
    }

    public function test_replacing_the_old_kichwa_choice_preserves_history_without_duplicating_family_exercises(): void
    {
        $this->seed([IntermedioMorfemasSeeder::class, IntermedioMorfemasEjerciciosSeeder::class]);
        $unit = Unidad::where('configuracion->guided_lesson', 'advanced-morphemes')->firstOrFail();
        $legacy = new Actividad(['id_unidad' => $unit->id_unidad, 'tipo_actividad' => 'seleccion_multiple',
            'enunciado_actividad' => 'Escucha el audio y elige la oración correcta.',
            'elementos_actividad' => [['id' => 'o0', 'texto' => 'Payka laushushi mana llankanata munanchu.'], ['id' => 'o1', 'texto' => 'Payka lachuri llami kan.']],
            'zonas_actividad' => [], 'solucion_actividad' => ['seleccion' => ['o0']],
            'orden_actividad' => 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad'),
            'publicado' => true, 'configuracion' => ['morpheme_practice' => 8]]);
        $legacy->origen_reactivo = 'intermedio-m2-u1-practica-8-v1';
        $legacy->save();
        Sanctum::actingAs(Usuario::factory()->create());
        $response = $this->postJson('/api/exercises/'.$legacy->id_actividad.'/answer', ['answer' => ['seleccion' => ['o0']], 'practice_attempt_id' => (string) Str::uuid(), 'submission_id' => (string) Str::uuid()])->assertOk()->json();

        $this->seed(IntermedioMorfemasEjerciciosSeeder::class);
        $this->seed(IntermedioMorfemasEjerciciosSeeder::class);

        $this->assertFalse($legacy->fresh()->publicado);
        $this->assertSame(['seleccion' => ['o0']], $legacy->fresh()->solucion_actividad);
        $this->assertSame($legacy->id_actividad, RespuestaActividad::findOrFail($response['response_id'])->id_actividad);
        $this->assertSame(4, Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'like', 'intermedio-m2-u1-parentesco-escucha-%')->count());
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 14);
    }

    public function test_four_listening_sentences_form_two_panels_and_keep_independent_answers(): void
    {
        $this->seed([IntermedioMorfemasSeeder::class, IntermedioMorfemasEjerciciosSeeder::class]);
        $unit = Unidad::where('configuracion->guided_lesson', 'advanced-morphemes')->firstOrFail();
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $items = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 14)->json('exercises');
        $listening = array_values(array_filter($items, fn (array $exercise): bool => isset($exercise['config']['morpheme_listening'])));
        $this->assertSame(['julio', 'manuelito', 'marilin', 'luis'], array_column(array_column($listening, 'config'), 'morpheme_listening'));
        $this->assertSame([1, 1, 2, 2], array_column(array_column($listening, 'config'), 'morpheme_panel'));
        $correct = ['o0', 'o1', 'o2', 'o0'];
        $meanings = ['Julio es un buen cuidador de la casa.', 'Don Manuelito es un portero de años.', 'Marilin es una señorita ovejera.', 'Luis es un buen panadero.'];
        $session = (string) Str::uuid();
        foreach ($listening as $index => $exercise) {
            $this->assertSame('seleccion_multiple', $exercise['type']);
            $options = array_column($exercise['elements'], 'texto', 'id');
            $this->assertSame($meanings[$index], $options[$correct[$index]]);
            $response = $this->postJson('/api/exercises/'.$exercise['id'].'/answer', ['answer' => ['seleccion' => [$correct[$index]]], 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])
                ->assertOk()->assertJsonPath('is_correct', true)->json();
            $saved = RespuestaActividad::findOrFail($response['response_id']);
            $this->assertSame($exercise['id'], $saved->id_actividad);
            $this->assertSame(['seleccion' => [$correct[$index]]], $saved->respuesta_actividad);
        }
        $this->assertSame(4, RespuestaActividad::where('id_usuario', $student->id_usuario)->whereIn('id_actividad', array_column($listening, 'id'))->count());
    }

    public function test_retiring_listen_and_complete_preserves_its_history_without_duplicating_the_new_panels(): void
    {
        $this->seed([IntermedioMorfemasSeeder::class, IntermedioMorfemasEjerciciosSeeder::class]);
        $unit = Unidad::where('configuracion->guided_lesson', 'advanced-morphemes')->firstOrFail();
        $legacy = new Actividad(['id_unidad' => $unit->id_unidad, 'tipo_actividad' => 'seleccion_multiple',
            'enunciado_actividad' => 'Mario musuka shuk _____ kan.',
            'elementos_actividad' => [['id' => 'o0', 'texto' => 'punkukamak'], ['id' => 'o1', 'texto' => 'wakrakamak'], ['id' => 'o2', 'texto' => 'tantakamak']],
            'zonas_actividad' => [], 'solucion_actividad' => ['seleccion' => ['o1']],
            'orden_actividad' => 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad'),
            'publicado' => true, 'configuracion' => ['morpheme_practice' => 4]]);
        $legacy->origen_reactivo = 'intermedio-m2-u1-practica-4-v1';
        $legacy->save();
        Sanctum::actingAs(Usuario::factory()->create());
        $response = $this->postJson('/api/exercises/'.$legacy->id_actividad.'/answer', ['answer' => ['seleccion' => ['o1']], 'practice_attempt_id' => (string) Str::uuid(), 'submission_id' => (string) Str::uuid()])->assertOk()->json();

        $this->seed(IntermedioMorfemasEjerciciosSeeder::class);
        $this->seed(IntermedioMorfemasEjerciciosSeeder::class);

        $this->assertFalse($legacy->fresh()->publicado);
        $this->assertSame(['seleccion' => ['o1']], $legacy->fresh()->solucion_actividad);
        $this->assertSame($legacy->id_actividad, RespuestaActividad::findOrFail($response['response_id'])->id_actividad);
        $items = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 14)->json('exercises');
        $this->assertSame([1, 2, 2, 2, 2, 3, 5, 6, 6, 7, 8, 8, 8, 8], array_column(array_column($items, 'config'), 'morpheme_practice'));
        $this->assertSame(4, Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'like', 'intermedio-m2-u1-escucha-%')->count());
    }

    public function test_all_nine_ordinals_are_required_and_graded_in_their_actual_positions(): void
    {
        $this->seed([IntermedioMorfemasSeeder::class, IntermedioMorfemasEjerciciosSeeder::class]);
        $unit = Unidad::where('configuracion->guided_lesson', 'advanced-morphemes')->firstOrFail();
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $items = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 14)->json('exercises');
        $exercise = $items[6];
        $this->assertSame(5, $exercise['config']['morpheme_practice']);
        $words = array_column($exercise['elements'], 'texto', 'id');
        $expected = ['uno' => 'Shukniki', 'dos' => 'Ishkayniki', 'tres' => 'Kimsaniki',
            'cuatro' => 'Chuskuniki', 'cinco' => 'Pichkaniki', 'seis' => 'Suktaniki',
            'siete' => 'Kanchisniki', 'ocho' => 'Pusakniki', 'nueve' => 'Iskunniki'];
        $this->assertCount(9, $words);
        foreach ($expected as $id => $word) {
            $this->assertSame($word, $words[$id]);
        }
        $session = (string) Str::uuid();
        $endpoint = '/api/exercises/'.$exercise['id'].'/answer';
        $this->postJson($endpoint, ['answer' => ['orden' => ['uno', 'tres', 'nueve']], 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])->assertUnprocessable();
        $this->assertSame(0, RespuestaActividad::where('id_actividad', $exercise['id'])->count());

        $wrong = $this->postJson($endpoint, ['answer' => ['orden' => ['uno', 'tres', 'dos', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']], 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])
            ->assertOk()->assertJsonPath('is_correct', false)->assertJsonPath('item_results.dos', false)->assertJsonPath('item_results.tres', false)->assertJsonPath('item_results.nueve', true)->json();
        $this->assertFalse(RespuestaActividad::findOrFail($wrong['response_id'])->acierto_actividad);

        $correct = $this->postJson($endpoint, ['answer' => ['orden' => ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']], 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])
            ->assertOk()->assertJsonPath('is_correct', true)->assertJsonPath('item_results.dos', true)->assertJsonPath('item_results.tres', true)->assertJsonPath('item_results.nueve', true)->json();
        $this->assertTrue(RespuestaActividad::findOrFail($correct['response_id'])->acierto_actividad);
    }

    public function test_replacing_the_three_word_activity_preserves_history_and_the_fifth_panel_without_duplicates(): void
    {
        $this->seed([IntermedioMorfemasSeeder::class, IntermedioMorfemasEjerciciosSeeder::class]);
        $unit = Unidad::where('configuracion->guided_lesson', 'advanced-morphemes')->firstOrFail();
        $legacy = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'intermedio-m2-u1-practica-5-v2')->firstOrFail();
        $legacy->fill(['tipo_actividad' => 'ordenar',
            'enunciado_actividad' => 'Organiza las palabras desde el primer hasta el noveno lugar.',
            'elementos_actividad' => [['id' => 'nueve', 'texto' => 'Iskunniki'], ['id' => 'uno', 'texto' => 'Shukniki'], ['id' => 'tres', 'texto' => 'Kimsaniki']],
            'zonas_actividad' => [], 'solucion_actividad' => ['orden' => ['uno', 'tres', 'nueve']],
            'publicado' => true, 'configuracion' => ['morpheme_practice' => 5]]);
        $legacy->origen_reactivo = 'intermedio-m2-u1-practica-5-v1';
        $legacy->save();
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $response = $this->postJson('/api/exercises/'.$legacy->id_actividad.'/answer', ['answer' => ['orden' => ['uno', 'tres', 'nueve']], 'practice_attempt_id' => (string) Str::uuid(), 'submission_id' => (string) Str::uuid()])->assertOk()->json();
        $oldSolution = $legacy->solucion_actividad;

        $this->seed(IntermedioMorfemasEjerciciosSeeder::class);

        $new = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'intermedio-m2-u1-practica-5-v2')->firstOrFail();
        $this->assertFalse($legacy->fresh()->publicado);
        $this->assertSame($oldSolution, $legacy->fresh()->solucion_actividad);
        $this->assertSame($legacy->id_actividad, RespuestaActividad::findOrFail($response['response_id'])->id_actividad);
        $this->assertSame(7, $new->orden_actividad);
        $this->assertCount(9, $new->elementos_actividad);
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 14)->assertJsonPath('exercises.6.id', $new->id_actividad);

        $this->seed(IntermedioMorfemasEjerciciosSeeder::class);

        $this->assertSame(1, Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'intermedio-m2-u1-practica-5-v2')->count());
        $this->assertSame(14, Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->count());
    }

    public function test_first_and_third_place_are_independent_and_the_new_exercise_is_not_duplicated(): void
    {
        $this->seed([IntermedioMorfemasSeeder::class, IntermedioMorfemasEjerciciosSeeder::class]);
        $unit = Unidad::where('configuracion->guided_lesson', 'advanced-morphemes')->firstOrFail();
        Sanctum::actingAs(Usuario::factory()->create());
        $items = $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 14)->json('exercises');
        $first = $items[7];
        $third = $items[8];
        $this->assertSame(6, $first['config']['morpheme_practice']);
        $this->assertSame('tercero', $third['config']['morpheme_position']);
        $this->assertSame($first['elements'], $third['elements']);
        $session = (string) Str::uuid();

        $firstResponse = $this->postJson('/api/exercises/'.$first['id'].'/answer', ['answer' => ['seleccion' => ['o0']], 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])
            ->assertOk()->assertJsonPath('is_correct', true)->json();
        $this->postJson('/api/exercises/'.$third['id'].'/answer', ['answer' => ['seleccion' => ['o0']], 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])
            ->assertOk()->assertJsonPath('is_correct', false);
        $thirdResponse = $this->postJson('/api/exercises/'.$third['id'].'/answer', ['answer' => ['seleccion' => ['o1']], 'practice_attempt_id' => $session, 'submission_id' => (string) Str::uuid()])
            ->assertOk()->assertJsonPath('is_correct', true)->json();
        $this->assertSame($first['id'], RespuestaActividad::findOrFail($firstResponse['response_id'])->id_actividad);
        $this->assertSame($third['id'], RespuestaActividad::findOrFail($thirdResponse['response_id'])->id_actividad);

        $this->seed(IntermedioMorfemasEjerciciosSeeder::class);

        $this->assertSame(1, Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'intermedio-m2-u1-posicion-tercero-v1')->count());
        $this->getJson('/api/units/'.$unit->id_unidad.'/guided')->assertOk()->assertJsonPath('total', 14)->assertJsonPath('exercises.8.id', $third['id']);
    }
}
