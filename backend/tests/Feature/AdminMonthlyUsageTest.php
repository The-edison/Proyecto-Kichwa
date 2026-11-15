<?php

namespace Tests\Feature;

use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\Grupo;
use App\Models\IntentoEvaluacion;
use App\Models\Usuario;
use Database\Seeders\DemostracionSeeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\UsesPostgreSQL;

class AdminMonthlyUsageTest extends TestCase
{
    use UsesPostgreSQL;

    public function test_monthly_usage_requires_authentication(): void
    {
        $this->getJson('/api/admin/usage-monthly')->assertUnauthorized();
    }

    public function test_students_cannot_access_monthly_usage(): void
    {
        Sanctum::actingAs(Usuario::factory()->create());
        $this->getJson('/api/admin/usage-monthly')->assertForbidden();
    }

    public function test_months_without_activity_have_zero_counts_including_the_year_boundary(): void
    {
        $this->travelTo(Carbon::parse('2027-01-01T04:59:59Z'));
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        $response = $this->getJson('/api/admin/usage-monthly')->assertOk()
            ->assertJsonPath('current_month', '2026-12')->assertJsonPath('timezone', 'America/Guayaquil')
            ->assertJsonCount(6, 'months')->assertJsonPath('months.0.month', '2026-07')->assertJsonPath('months.5.month', '2026-12');
        foreach ($response->json('months') as $month) {
            $this->assertSame(0, $month['active_students']);
            $this->assertSame(0, $month['exercise_answers']);
            $this->assertSame(0, $month['completed_tests']);
            $this->assertSame(0, $month['active_days']);
        }
    }

    public function test_monthly_summary_counts_real_activity_once_per_student_and_uses_local_month_boundaries(): void
    {
        $this->travelTo(Carbon::parse('2026-11-14T12:00:00Z'));
        $this->seed(DemostracionSeeder::class);
        $student = Usuario::factory()->create();
        $other = Usuario::factory()->create();
        $exercise = Actividad::firstOrFail();
        foreach (['2026-06-01T04:59:59Z', '2026-06-01T05:00:00Z', '2026-11-01T04:59:59Z', '2026-11-01T05:00:00Z', '2026-11-14T12:00:00Z', '2026-11-15T12:00:00Z'] as $date) {
            $this->answer($student, $exercise, $date);
        }
        $this->answer($other, $exercise, '2026-11-14T11:00:00Z');
        $evaluation = EvaluacionKichwa::where('tipo_evaluacion', 'unidad')->firstOrFail();
        foreach (['finalizado', 'abandonado', 'en_curso'] as $index => $state) {
            $attempt = IntentoEvaluacion::create(['id_usuario' => $other->id_usuario, 'id_evaluacion' => $evaluation->id_evaluacion,
                'numero_intento' => $index + 1, 'fecha_inicio_intento' => '2026-11-03T11:00:00Z', 'estado_intento' => 'en_curso']);
            if ($state !== 'en_curso') {
                $attempt->update(['estado_intento' => $state, 'fecha_fin_intento' => '2026-11-03T12:00:00Z']);
            }
        }
        $student->estado_usuario = 'bloqueado';
        $student->save();
        Sanctum::actingAs(Usuario::factory()->administrador()->create());

        $response = $this->getJson('/api/admin/usage-monthly')->assertOk()
            ->assertJsonPath('current_month', '2026-11')->assertJsonCount(6, 'months')
            ->assertJsonPath('months.0', ['month' => '2026-06', 'active_students' => 1, 'exercise_answers' => 1, 'completed_tests' => 0, 'active_days' => 1])
            ->assertJsonPath('months.4', ['month' => '2026-10', 'active_students' => 1, 'exercise_answers' => 1, 'completed_tests' => 0, 'active_days' => 1])
            ->assertJsonPath('months.5', ['month' => '2026-11', 'active_students' => 2, 'exercise_answers' => 3, 'completed_tests' => 1, 'active_days' => 3]);
        $this->assertSame(['current_month', 'timezone', 'months'], array_keys($response->json()));
    }

    private function answer(Usuario $student, Actividad $exercise, string $date): void
    {
        DB::table('respuestas_actividad')->insert(['id_usuario' => $student->id_usuario, 'id_actividad' => $exercise->id_actividad,
            'respuesta_actividad' => json_encode(['seleccion' => ['a']]), 'acierto_actividad' => false,
            'retroalimentacion_actividad' => 'Vuelve a intentarlo.', 'fecha_respuesta_actividad' => $date]);
    }

    public function test_group_filter_scopes_students_and_monthly_activity_and_keeps_the_shared_catalog(): void
    {
        $this->travelTo(Carbon::parse('2026-11-14T12:00:00Z'));
        $this->seed(DemostracionSeeder::class);
        $admin = Usuario::factory()->administrador()->create();
        $group = Grupo::create(['nombre' => 'Kichwa A', 'codigo' => 'KCH-7F3A9', 'admin_id' => $admin->id_usuario]);
        $empty = Grupo::create(['nombre' => 'Kichwa B', 'codigo' => 'KCH-AAAAA', 'admin_id' => $admin->id_usuario]);
        $other = Grupo::create(['nombre' => 'Otro curso', 'codigo' => 'KCH-BBBBB', 'admin_id' => Usuario::factory()->administrador()->create()->id_usuario]);
        $student = Usuario::factory()->create(['grupo_id' => $group->id]);
        $testStudent = Usuario::factory()->create(['grupo_id' => $group->id]);
        $outsider = Usuario::factory()->create(['grupo_id' => $other->id]);
        $ungrouped = Usuario::factory()->create();
        $exercise = Actividad::firstOrFail();
        foreach ([$student, $outsider, $ungrouped] as $participant) {
            $this->answer($participant, $exercise, '2026-11-01T12:00:00Z');
        }
        $evaluation = EvaluacionKichwa::where('tipo_evaluacion', 'unidad')->firstOrFail();
        $attempt = IntentoEvaluacion::create(['id_usuario' => $testStudent->id_usuario, 'id_evaluacion' => $evaluation->id_evaluacion,
            'numero_intento' => 1, 'fecha_inicio_intento' => '2026-11-03T11:00:00Z', 'estado_intento' => 'en_curso']);
        $attempt->update(['estado_intento' => 'finalizado', 'fecha_fin_intento' => '2026-11-03T12:00:00Z']);
        $group->activo = false;
        $group->save();
        Sanctum::actingAs($admin);

        $all = $this->getJson('/api/admin/overview')->assertOk()->assertJsonPath('students', 4)->json();
        $this->getJson('/api/admin/overview?grupo_id='.$group->id)->assertOk()->assertExactJson(array_replace($all, ['students' => 2]));
        $this->getJson('/api/admin/overview?grupo_id=sin_grupo')->assertOk()->assertJsonPath('students', 1);
        $this->getJson('/api/admin/overview?grupo_id='.$empty->id)->assertOk()->assertJsonPath('students', 0);
        $this->getJson('/api/admin/usage-monthly')->assertOk()->assertJsonPath('months.5.active_students', 4)->assertJsonPath('months.5.exercise_answers', 3);
        $this->getJson('/api/admin/usage-monthly?grupo_id='.$group->id)->assertOk()->assertJsonPath('months.5', [
            'month' => '2026-11', 'active_students' => 2, 'exercise_answers' => 1, 'completed_tests' => 1, 'active_days' => 2,
        ]);
        $this->getJson('/api/admin/usage-monthly?grupo_id=sin_grupo')->assertOk()->assertJsonPath('months.5.active_students', 1)->assertJsonPath('months.5.completed_tests', 0);
        $this->getJson('/api/admin/usage-monthly?grupo_id='.$empty->id)->assertOk()->assertJsonPath('months.5.active_students', 0)->assertJsonPath('months.5.exercise_answers', 0);
    }

    public function test_summary_filters_reject_other_admin_groups_and_malformed_group_identifiers(): void
    {
        $group = Grupo::create(['nombre' => 'Privado', 'codigo' => 'KCH-7F3A9', 'admin_id' => Usuario::factory()->administrador()->create()->id_usuario]);
        Sanctum::actingAs(Usuario::factory()->administrador()->create());
        foreach (['overview', 'usage-monthly'] as $endpoint) {
            $this->getJson('/api/admin/'.$endpoint.'?grupo_id='.$group->id)->assertNotFound();
            $this->getJson('/api/admin/'.$endpoint.'?grupo_id=999999')->assertNotFound();
            $this->getJson('/api/admin/'.$endpoint.'?grupo_id=invalid')->assertUnprocessable()->assertJsonValidationErrors('grupo_id');
        }
    }
}
