<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\RespuestaActividad;
use App\Models\Tema;
use App\Models\Unidad;
use App\Models\Usuario;
use Database\Seeders\IntermedioModuloDosEjerciciosSeeder;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class IntermedioModuloDosEjerciciosTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_all_four_units_publish_their_exercises_without_other_module_seeders(): void
    {
        $this->seed(IntermedioModuloDosEjerciciosSeeder::class);
        Sanctum::actingAs(Usuario::factory()->create());

        foreach (['advanced-morphemes' => 14, 'time-morphemes' => 12, 'verbal-analysis' => 14, 'short-dialogues' => 6] as $lesson => $total) {
            $unit = Unidad::where('configuracion->guided_lesson', $lesson)->firstOrFail();
            $this->getJson('/api/units/'.$unit->id_unidad.'/guided')
                ->assertOk()->assertJsonPath('total', $total)->assertJsonCount($total, 'exercises');
        }
    }

    public function test_reloading_the_module_preserves_edited_lessons_and_exercise_identities(): void
    {
        $this->seed(IntermedioModuloDosEjerciciosSeeder::class);
        $lessons = Tema::where('clave_leccion', 'like', 'intermedio-modulo2-%')->get();
        foreach ($lessons as $lesson) {
            $lesson->update(['contenido_tema' => 'Lección revisada por el docente: '.$lesson->id_tema]);
        }
        $before = $lessons->mapWithKeys(fn (Tema $lesson): array => [$lesson->id_tema => $lesson->getAttributes()])->all();
        $units = $lessons->pluck('id_unidad');
        $ids = Actividad::whereIn('id_unidad', $units)->orderBy('id_actividad')->pluck('id_actividad')->all();
        Actividad::whereIn('id_unidad', $units)->update(['publicado' => false]);
        Unidad::whereIn('id_unidad', $units)->update(['publicado' => false, 'configuracion' => ['learning_mode' => 'classic', 'custom_setting' => true]]);

        $this->seed(IntermedioModuloDosEjerciciosSeeder::class);

        $this->assertSame($ids, Actividad::whereIn('id_unidad', $units)->orderBy('id_actividad')->pluck('id_actividad')->all());
        foreach ($lessons as $lesson) {
            $this->assertSame($before[$lesson->id_tema], $lesson->fresh()->getAttributes());
            $unit = Unidad::findOrFail($lesson->id_unidad);
            $this->assertTrue($unit->publicado);
            $this->assertSame('guided', $unit->configuracion['learning_mode']);
            $this->assertTrue($unit->configuracion['custom_setting']);
        }
        $this->assertSame(46, Actividad::whereIn('id_unidad', $units)->where('publicado', true)->count());
    }

    public function test_production_seed_command_preserves_all_answered_exercises_rewards_and_accounts_on_restart(): void
    {
        $this->artisan('db:seed', ['--class' => IntermedioModuloDosEjerciciosSeeder::class, '--force' => true, '--no-interaction' => true])->assertExitCode(0);
        $student = Usuario::factory()->create();
        Sanctum::actingAs($student);
        $units = Unidad::whereIn('configuracion->guided_lesson', ['advanced-morphemes', 'time-morphemes', 'verbal-analysis', 'short-dialogues'])->pluck('id_unidad');
        $exercises = Actividad::whereIn('id_unidad', $units)->where('publicado', true)->orderBy('id_actividad')->get();
        $this->assertCount(46, $exercises);
        foreach ($exercises as $exercise) {
            $answer = $exercise->solucion_actividad;
            if ($exercise->tipo_actividad === 'completar') {
                $answer['textos'] = array_map(fn (array $variants): string => $variants[0], $answer['textos']);
            }
            $this->postJson('/api/exercises/'.$exercise->id_actividad.'/answer', ['answer' => $answer])
                ->assertOk()->assertJsonPath('is_correct', true);
        }
        $answers = RespuestaActividad::where('id_usuario', $student->id_usuario)->orderBy('id_respuesta_actividad')->get()->toArray();
        $rewards = DB::table('recompensas')->where('id_usuario', $student->id_usuario)->orderBy('clave')->get()->toJson();
        $account = $student->fresh()->getAttributes();

        $this->artisan('db:seed', ['--class' => IntermedioModuloDosEjerciciosSeeder::class, '--force' => true, '--no-interaction' => true])->assertExitCode(0);
        $this->artisan('db:seed', ['--class' => IntermedioModuloDosEjerciciosSeeder::class, '--force' => true, '--no-interaction' => true])->assertExitCode(0);

        $this->assertSame($exercises->modelKeys(), Actividad::whereIn('id_unidad', $units)->where('publicado', true)->orderBy('id_actividad')->pluck('id_actividad')->all());
        $this->assertSame($answers, RespuestaActividad::where('id_usuario', $student->id_usuario)->orderBy('id_respuesta_actividad')->get()->toArray());
        $this->assertSame($rewards, DB::table('recompensas')->where('id_usuario', $student->id_usuario)->orderBy('clave')->get()->toJson());
        $this->assertSame($account, $student->fresh()->getAttributes());
        $this->assertDatabaseCount('usuarios', 1);
    }
}
