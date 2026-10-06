<?php

namespace Tests\Feature;

use App\Models\Content;
use App\Models\Evaluation;
use App\Models\EvaluationQuestion;
use App\Models\Exercise;
use App\Models\LearningModule;
use App\Models\Level;
use App\Models\Role;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LearningApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_uses_cedula_and_assigns_student_role(): void
    {
        $registered = $this->postJson('/api/auth/register', [
            'name' => 'Ana Yánez',
            'cedula' => '0201234567',
            'email' => 'ana@example.test',
            'password' => 'ClaveSegura123',
            'password_confirmation' => 'ClaveSegura123',
        ]);

        $registered->assertCreated()->assertJsonPath('user.role.code', 'student');
        $this->assertNotEmpty($registered->json('token'));

        $this->postJson('/api/auth/login', [
            'cedula' => '0201234567',
            'password' => 'ClaveSegura123',
        ])->assertOk()->assertJsonPath('user.cedula', '0201234567');

        $this->postJson('/api/auth/login', [
            'cedula' => '0201234567',
            'password' => 'incorrecta',
        ])->assertUnprocessable();
    }

    public function test_api_registration_and_login_accept_email_without_cedula(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Rosa Test',
            'email' => 'rosa@example.test',
            'password' => 'ClaveSegura123',
            'password_confirmation' => 'ClaveSegura123',
        ])->assertCreated()->assertJsonPath('user.cedula', null);

        $this->postJson('/api/auth/login', [
            'identifier' => 'rosa@example.test',
            'password' => 'ClaveSegura123',
        ])->assertOk()->assertJsonPath('user.email', 'rosa@example.test');

        $this->postJson('/api/auth/login', [
            'identifier' => 'rosa@example.test',
            'password' => 'incorrecta',
        ])->assertUnprocessable();
    }

    public function test_student_cannot_use_admin_crud_and_admin_can(): void
    {
        $student = User::factory()->create();
        Sanctum::actingAs($student);

        $this->getJson('/api/admin/students')->assertForbidden();
        $this->postJson('/api/admin/modules', ['level_id' => 1, 'title' => 'Uno'])->assertForbidden();

        $admin = User::factory()->create(['role_id' => Role::where('code', 'admin')->firstOrFail()->id]);
        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/modules', [
            'level_id' => Level::where('code', 'basic')->firstOrFail()->id,
            'title' => 'Saludos',
            'is_published' => true,
        ])->assertCreated()->assertJsonPath('title', 'Saludos');

        $this->getJson('/api/admin/students')->assertOk()
            ->assertJsonPath('data.0.cedula', $student->cedula);
    }

    public function test_exercise_and_evaluation_feedback_update_progress(): void
    {
        $level = Level::where('code', 'basic')->firstOrFail();
        $module = LearningModule::create(['level_id' => $level->id, 'title' => 'Primer módulo', 'is_published' => true]);
        $unit = Unit::create(['module_id' => $module->id, 'title' => 'Saludos', 'is_published' => true]);
        $content = Content::create([
            'unit_id' => $unit->id, 'kind' => 'vocabulary', 'title' => 'Saludar',
            'body' => 'Contenido revisado.', 'is_published' => true,
        ]);
        $exercise = Exercise::create([
            'content_id' => $content->id, 'type' => 'multiple_choice', 'prompt' => 'Selecciona la respuesta.',
            'options' => ['Uno', 'Dos'], 'correct_answer' => 'Uno',
            'feedback_incorrect' => 'Inténtalo de nuevo.', 'is_published' => true,
        ]);
        $evaluation = Evaluation::create([
            'level_id' => $level->id, 'title' => 'Evaluación básica',
            'passing_score' => 70, 'is_published' => true,
        ]);
        $first = EvaluationQuestion::create([
            'evaluation_id' => $evaluation->id, 'type' => 'multiple_choice',
            'prompt' => 'Pregunta 1', 'options' => ['A', 'B'], 'correct_answer' => 'A',
        ]);
        $second = EvaluationQuestion::create([
            'evaluation_id' => $evaluation->id, 'type' => 'complete',
            'prompt' => 'Pregunta 2', 'correct_answer' => 'respuesta',
        ]);

        Sanctum::actingAs(User::factory()->create());
        $this->getJson("/api/contents/{$content->id}/exercises")
            ->assertOk()->assertDontSee('correct_answer');

        $this->postJson("/api/exercises/{$exercise->id}/answer", ['answer' => 'Dos'])
            ->assertOk()->assertJsonPath('is_correct', false)
            ->assertJsonPath('correct_answer', 'Uno');
        $this->getJson("/api/progress/levels/{$level->id}")
            ->assertJsonPath('percentage', 0);

        $this->postJson("/api/exercises/{$exercise->id}/answer", ['answer' => 'Uno'])
            ->assertOk()->assertJsonPath('is_correct', true);
        $this->getJson("/api/progress/levels/{$level->id}")
            ->assertJsonPath('percentage', 50);

        $this->getJson("/api/evaluations/{$evaluation->id}")
            ->assertOk()->assertDontSee('correct_answer');
        $this->postJson("/api/evaluations/{$evaluation->id}/submit", [
            'answers' => [
                ['question_id' => $first->id, 'answer' => 'A'],
                ['question_id' => $second->id, 'answer' => 'equivocada'],
            ],
        ])->assertOk()->assertJsonPath('score', 50)->assertJsonPath('passed', false)
            ->assertJsonPath('results.1.correct_answer', 'respuesta');

        $this->getJson("/api/progress/levels/{$level->id}")
            ->assertOk()->assertJsonPath('percentage', 100)
            ->assertJsonPath('evaluation_results.0.best_score', '50.00');
    }

    public function test_unpublished_parent_hides_student_content(): void
    {
        $level = Level::where('code', 'basic')->firstOrFail();
        $module = LearningModule::create(['level_id' => $level->id, 'title' => 'Oculto']);
        Sanctum::actingAs(User::factory()->create());

        $this->getJson("/api/modules/{$module->id}/units")->assertNotFound();
    }

    public function test_admin_validates_answer_keys_and_keeps_published_evaluations_answerable(): void
    {
        $admin = User::factory()->create(['role_id' => Role::where('code', 'admin')->firstOrFail()->id]);
        Sanctum::actingAs($admin);
        $level = Level::where('code', 'basic')->firstOrFail();
        $module = LearningModule::create(['level_id' => $level->id, 'title' => 'Module']);
        $unit = Unit::create(['module_id' => $module->id, 'title' => 'Unit']);
        $content = Content::create([
            'unit_id' => $unit->id, 'kind' => 'vocabulary', 'title' => 'Content', 'body' => 'Text',
        ]);

        $exercise = [
            'content_id' => $content->id,
            'type' => 'multiple_choice',
            'prompt' => 'Choose',
            'options' => ['A', 'B'],
            'correct_answer' => 'C',
        ];
        $this->postJson('/api/admin/exercises', $exercise)->assertUnprocessable();
        $this->postJson('/api/admin/exercises', array_replace($exercise, ['correct_answer' => 'A']))
            ->assertCreated();

        $evaluation = Evaluation::create(['level_id' => $level->id, 'title' => 'Exam']);
        $question = $this->postJson('/api/admin/questions', [
            'evaluation_id' => $evaluation->id, 'type' => 'complete',
            'prompt' => 'Write a word', 'correct_answer' => 'A',
        ])->assertCreated();
        $this->patchJson("/api/admin/evaluations/{$evaluation->id}", ['is_published' => true])
            ->assertOk();
        $this->deleteJson('/api/admin/questions/'.$question->json('id'))
            ->assertStatus(409);
    }
}
