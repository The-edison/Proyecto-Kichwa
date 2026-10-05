<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->string('name', 50);
        });

        DB::table('roles')->insert([
            ['code' => 'admin', 'name' => 'Administrador'],
            ['code' => 'student', 'name' => 'Estudiante'],
        ]);

        Schema::table('users', function (Blueprint $table) {
            $table->string('cedula', 10)->unique();
            $table->foreignId('role_id')->constrained('roles')->restrictOnDelete();
        });

        Schema::create('levels', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('name', 80);
            $table->unsignedInteger('sort_order');
            $table->boolean('is_published')->default(true);
            $table->timestamps();
        });

        DB::table('levels')->insert([
            ['code' => 'basic', 'name' => 'Básico', 'sort_order' => 1, 'is_published' => true, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'intermediate', 'name' => 'Intermedio', 'sort_order' => 2, 'is_published' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);

        Schema::create('modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('level_id')->constrained()->restrictOnDelete();
            $table->string('title', 160);
            $table->text('description')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_published')->default(false);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['level_id', 'is_published', 'sort_order']);
        });

        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('module_id')->constrained()->restrictOnDelete();
            $table->string('title', 160);
            $table->text('description')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_published')->default(false);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['module_id', 'is_published', 'sort_order']);
        });

        Schema::create('contents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_id')->constrained()->restrictOnDelete();
            $table->string('kind', 20);
            $table->string('title', 160);
            $table->text('body');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_published')->default(false);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['unit_id', 'is_published', 'sort_order']);
        });

        Schema::create('exercises', function (Blueprint $table) {
            $table->id();
            $table->foreignId('content_id')->constrained()->restrictOnDelete();
            $table->string('type', 20);
            $table->text('prompt');
            $table->json('options')->nullable();
            $table->text('correct_answer');
            $table->text('feedback_correct')->nullable();
            $table->text('feedback_incorrect')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_published')->default(false);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['content_id', 'is_published', 'sort_order']);
        });

        Schema::create('evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('level_id')->constrained()->restrictOnDelete();
            $table->string('title', 160);
            $table->text('description')->nullable();
            $table->unsignedTinyInteger('passing_score')->default(70);
            $table->boolean('is_published')->default(false);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['level_id', 'is_published']);
        });

        Schema::create('evaluation_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluation_id')->constrained()->restrictOnDelete();
            $table->string('type', 20);
            $table->text('prompt');
            $table->json('options')->nullable();
            $table->text('correct_answer');
            $table->text('feedback_correct')->nullable();
            $table->text('feedback_incorrect')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->index(['evaluation_id', 'sort_order']);
        });

        Schema::create('exercise_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('exercise_id')->constrained()->restrictOnDelete();
            $table->text('submitted_answer');
            $table->boolean('is_correct');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['user_id', 'exercise_id', 'created_at']);
        });

        Schema::create('evaluation_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('evaluation_id')->constrained()->restrictOnDelete();
            $table->decimal('score', 5, 2);
            $table->unsignedInteger('correct_count');
            $table->unsignedInteger('total_questions');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['user_id', 'evaluation_id', 'created_at']);
        });

        Schema::create('evaluation_attempt_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluation_attempt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('evaluation_question_id')->constrained()->restrictOnDelete();
            $table->text('submitted_answer');
            $table->boolean('is_correct');
            $table->unique(['evaluation_attempt_id', 'evaluation_question_id'], 'evaluation_answer_unique');
        });

        Schema::create('progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('level_id')->constrained()->restrictOnDelete();
            $table->foreignId('exercise_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('evaluation_id')->nullable()->constrained()->restrictOnDelete();
            $table->decimal('best_score', 5, 2)->nullable();
            $table->timestamp('completed_at');
            $table->index(['user_id', 'level_id']);
        });

        DB::statement('CREATE UNIQUE INDEX progress_exercise_unique ON progress (user_id, exercise_id) WHERE exercise_id IS NOT NULL');
        DB::statement('CREATE UNIQUE INDEX progress_evaluation_unique ON progress (user_id, evaluation_id) WHERE evaluation_id IS NOT NULL');
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE progress ADD CONSTRAINT progress_one_activity CHECK ((exercise_id IS NOT NULL) <> (evaluation_id IS NOT NULL))');
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_cedula_format CHECK (cedula ~ '^[0-9]{10}$')");
            DB::statement("ALTER TABLE contents ADD CONSTRAINT contents_kind_check CHECK (kind IN ('vocabulary', 'grammar'))");
            DB::statement("ALTER TABLE exercises ADD CONSTRAINT exercises_type_check CHECK (type IN ('multiple_choice', 'complete', 'select'))");
            DB::statement("ALTER TABLE evaluation_questions ADD CONSTRAINT questions_type_check CHECK (type IN ('multiple_choice', 'complete', 'select'))");
            DB::statement('ALTER TABLE evaluations ADD CONSTRAINT evaluations_passing_score_check CHECK (passing_score BETWEEN 0 AND 100)');
            DB::statement('ALTER TABLE evaluation_attempts ADD CONSTRAINT evaluation_attempts_score_check CHECK (score BETWEEN 0 AND 100)');
            DB::statement('ALTER TABLE progress ADD CONSTRAINT progress_best_score_check CHECK (best_score BETWEEN 0 AND 100)');
        }

        Schema::create('glossary', function (Blueprint $table) {
            $table->id();
            $table->string('spanish', 160);
            $table->string('kichwa', 160);
            $table->text('meaning');
            $table->text('example_spanish')->nullable();
            $table->text('example_kichwa')->nullable();
            $table->boolean('is_published')->default(false);
            $table->timestamps();
            $table->unique(['spanish', 'kichwa']);
            $table->index('is_published');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('glossary');
        Schema::dropIfExists('progress');
        Schema::dropIfExists('evaluation_attempt_answers');
        Schema::dropIfExists('evaluation_attempts');
        Schema::dropIfExists('exercise_attempts');
        Schema::dropIfExists('evaluation_questions');
        Schema::dropIfExists('evaluations');
        Schema::dropIfExists('exercises');
        Schema::dropIfExists('contents');
        Schema::dropIfExists('units');
        Schema::dropIfExists('modules');
        Schema::dropIfExists('levels');
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('role_id');
            $table->dropUnique(['cedula']);
            $table->dropColumn('cedula');
        });
        Schema::dropIfExists('roles');
    }
};
