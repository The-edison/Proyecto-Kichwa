<?php

use App\Http\Controllers\Api\Admin\ContentController as AdminContentController;
use App\Http\Controllers\Api\Admin\EvaluationController as AdminEvaluationController;
use App\Http\Controllers\Api\Admin\ExerciseController as AdminExerciseController;
use App\Http\Controllers\Api\Admin\GlossaryController as AdminGlossaryController;
use App\Http\Controllers\Api\Admin\ModuleController as AdminModuleController;
use App\Http\Controllers\Api\Admin\QuestionController as AdminQuestionController;
use App\Http\Controllers\Api\Admin\StudentController;
use App\Http\Controllers\Api\Admin\UnitController as AdminUnitController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\EvaluationSubmissionController;
use App\Http\Controllers\Api\ExerciseSubmissionController;
use App\Http\Controllers\Api\GlossaryController;
use App\Http\Controllers\Api\ProgressController;
use App\Http\Controllers\Api\TestimonialController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::get('/glossary', [GlossaryController::class, 'index']);
Route::get('/testimonials', [TestimonialController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::middleware('role:student')->group(function () {
        Route::get('/levels', [CatalogController::class, 'levels']);
        Route::get('/levels/{level}/modules', [CatalogController::class, 'modules']);
        Route::get('/modules/{module}/units', [CatalogController::class, 'units']);
        Route::get('/units/{unit}/contents', [CatalogController::class, 'contents']);
        Route::get('/contents/{content}/exercises', [CatalogController::class, 'exercises']);
        Route::get('/levels/{level}/evaluations', [CatalogController::class, 'evaluations']);
        Route::get('/evaluations/{evaluation}', [CatalogController::class, 'evaluation']);
        Route::post('/exercises/{exercise}/answer', [ExerciseSubmissionController::class, 'store']);
        Route::post('/evaluations/{evaluation}/submit', [EvaluationSubmissionController::class, 'store']);
        Route::get('/progress', [ProgressController::class, 'index']);
        Route::get('/progress/levels/{level}', [ProgressController::class, 'show']);
        Route::get('/testimonials/eligibility', [TestimonialController::class, 'eligibility']);
        Route::post('/testimonials', [TestimonialController::class, 'store'])->middleware('throttle:5,1');
    });

    Route::prefix('admin')->middleware('role:admin')->group(function () {
        Route::get('/students', [StudentController::class, 'index']);
        Route::apiResource('modules', AdminModuleController::class);
        Route::apiResource('units', AdminUnitController::class);
        Route::apiResource('contents', AdminContentController::class);
        Route::apiResource('exercises', AdminExerciseController::class);
        Route::apiResource('evaluations', AdminEvaluationController::class);
        Route::apiResource('questions', AdminQuestionController::class);
        Route::apiResource('glossary', AdminGlossaryController::class);
    });
});
