<?php

namespace Tests\Feature;

use App\Models\Content;
use App\Models\Evaluation;
use App\Models\Exercise;
use App\Models\LearningModule;
use App\Models\Level;
use App\Models\Progress;
use App\Models\Role;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TestimonialApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_students_who_complete_intermediate_can_publish_one_opinion(): void
    {
        $this->getJson('/api/testimonials')->assertOk()->assertExactJson([]);
        $this->postJson('/api/testimonials', ['body' => 'Quiero compartir mi experiencia de aprendizaje.'])->assertUnauthorized();

        $admin = User::factory()->create(['role_id' => Role::where('code', 'admin')->firstOrFail()->id]);
        Sanctum::actingAs($admin);
        $this->postJson('/api/testimonials', ['body' => 'Quiero compartir mi experiencia de aprendizaje.'])->assertForbidden();

        $student = User::factory()->create(['name' => 'Ana Pérez']);
        Sanctum::actingAs($student);
        $this->getJson('/api/testimonials/eligibility')->assertOk()->assertJsonPath('can_comment', false);

        $level = Level::where('code', 'intermediate')->firstOrFail();
        $module = LearningModule::create(['level_id' => $level->id, 'title' => 'Vida cotidiana', 'is_published' => true]);
        $unit = Unit::create(['module_id' => $module->id, 'title' => 'Conversación', 'is_published' => true]);
        $content = Content::create([
            'unit_id' => $unit->id,
            'kind' => 'vocabulary',
            'title' => 'Palabras nuevas',
            'body' => 'Lección',
            'is_published' => true,
        ]);
        $exercise = Exercise::create([
            'content_id' => $content->id,
            'type' => 'complete',
            'prompt' => 'Escribe la palabra',
            'correct_answer' => 'alli',
            'is_published' => true,
        ]);
        $evaluation = Evaluation::create([
            'level_id' => $level->id,
            'title' => 'Evaluación intermedia',
            'passing_score' => 70,
            'is_published' => true,
        ]);

        $opinion = 'Aprendí nuevas palabras y pude practicar a mi propio ritmo.';
        $this->postJson('/api/testimonials', ['body' => $opinion])->assertForbidden();

        Progress::create([
            'user_id' => $student->id,
            'level_id' => $level->id,
            'exercise_id' => $exercise->id,
            'completed_at' => now(),
        ]);
        $evaluationProgress = Progress::create([
            'user_id' => $student->id,
            'level_id' => $level->id,
            'evaluation_id' => $evaluation->id,
            'best_score' => 50,
            'completed_at' => now(),
        ]);

        $this->getJson('/api/testimonials/eligibility')->assertJsonPath('can_comment', false);
        $this->postJson('/api/testimonials', ['body' => $opinion])->assertForbidden();

        $evaluationProgress->update(['best_score' => 80]);
        $this->getJson('/api/testimonials/eligibility')->assertJsonPath('can_comment', true);
        $this->postJson('/api/testimonials', ['body' => 'Muy corto'])->assertUnprocessable();
        $this->postJson('/api/testimonials', ['body' => "  {$opinion}  "])
            ->assertCreated()
            ->assertJsonPath('body', $opinion)
            ->assertJsonPath('name', 'Ana P.');

        $this->postJson('/api/testimonials', ['body' => $opinion])->assertStatus(409);
        $this->getJson('/api/testimonials/eligibility')
            ->assertJsonPath('has_commented', true)
            ->assertJsonPath('can_comment', false);
        $this->getJson('/api/testimonials')->assertOk()->assertJsonCount(1)
            ->assertJsonPath('0.body', $opinion)
            ->assertDontSee($student->cedula);
    }

    public function test_an_unpublished_intermediate_activity_does_not_block_an_eligible_student(): void
    {
        $student = User::factory()->create();
        $level = Level::where('code', 'intermediate')->firstOrFail();
        $publishedEvaluation = Evaluation::create([
            'level_id' => $level->id,
            'title' => 'Evaluación publicada',
            'passing_score' => 70,
            'is_published' => true,
        ]);
        Evaluation::create([
            'level_id' => $level->id,
            'title' => 'Borrador',
            'is_published' => false,
        ]);
        Progress::create([
            'user_id' => $student->id,
            'level_id' => $level->id,
            'evaluation_id' => $publishedEvaluation->id,
            'best_score' => 85,
            'completed_at' => now(),
        ]);

        Sanctum::actingAs($student);
        $this->getJson('/api/testimonials/eligibility')->assertJsonPath('can_comment', true);
    }
}
