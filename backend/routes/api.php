<?php

use App\Http\Controllers\Api\ArchivoController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DiccionarioController;
use App\Http\Controllers\Api\KichwaAdminController;
use App\Http\Controllers\Api\KichwaCatalogController;
use App\Http\Controllers\Api\KichwaSubmissionController;
use App\Http\Controllers\Api\TestimonialController;
use App\Http\Controllers\Web\GoogleAuthController;
use App\Services\DominioLecciones;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

foreach (['id', 'level', 'module', 'unit', 'topic', 'exercise', 'evaluation', 'attempt'] as $parameter) {
    Route::pattern($parameter, '[1-9][0-9]{0,17}');
}

Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:3,1');
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');
Route::post('/auth/google/prepare', [GoogleAuthController::class, 'prepare'])->middleware('throttle:10,1');
Route::get('/diccionario', [KichwaCatalogController::class, 'diccionario']);
Route::get('/diccionario/buscar', [DiccionarioController::class, 'search'])->middleware('throttle:120,1');
Route::get('/testimonials', [TestimonialController::class, 'index']);
Route::get('/media/{path}', [ArchivoController::class, 'show'])->where('path', '.*');
Route::get('/config', fn () => response()->json(['google' => ['enabled' => (bool) (config('services.google.client_id') && config('services.google.client_secret'))]]));
Route::middleware(['auth:sanctum', 'active'])->group(function (): void {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/google/link-prepare', [GoogleAuthController::class, 'prepare'])->defaults('intent', 'link')->middleware('throttle:10,1');
    Route::post('/auth/change-password', [AuthController::class, 'changePassword'])->middleware('throttle:5,1');
    Route::post('/auth/verification-notification', [AuthController::class, 'resendVerification'])->middleware('throttle:3,1');
    Route::middleware('role:student')->group(function (): void {
        Route::get('/levels', [KichwaCatalogController::class, 'levels']);
        Route::get('/levels/{level}/modules', [KichwaCatalogController::class, 'modules']);
        Route::get('/modules/{module}/units', [KichwaCatalogController::class, 'units']);
        Route::get('/modules/{module}/contents', [KichwaCatalogController::class, 'moduleContents']);
        Route::get('/modules/{module}', [KichwaCatalogController::class, 'module']);
        Route::get('/units/{unit}', [KichwaCatalogController::class, 'unit']);
        Route::get('/units/{unit}/sequence', [KichwaCatalogController::class, 'sequence']);
        Route::get('/units/{unit}/guided', [KichwaCatalogController::class, 'guided']);
        Route::post('/units/{unit}/guided/result', [KichwaSubmissionController::class, 'guidedResult'])->middleware('throttle:30,1,guided-result');
        Route::get('/units/{unit}/contents', [KichwaCatalogController::class, 'contents']);
        Route::get('/units/{unit}/topics/{topic}', [KichwaCatalogController::class, 'topic']);
        Route::get('/units/{unit}/exercises', [KichwaCatalogController::class, 'exercises']);
        Route::get('/levels/{level}/evaluations', [KichwaCatalogController::class, 'evaluations']);
        Route::get('/evaluations/{evaluation}', [KichwaCatalogController::class, 'evaluation']);
        Route::post('/exercises/{exercise}/answer', [KichwaSubmissionController::class, 'activity'])->middleware('throttle:60,1,practice');
        Route::post('/evaluations/{evaluation}/attempts', [KichwaSubmissionController::class, 'start'])->middleware('throttle:10,1,evaluation-start');
        Route::post('/evaluations/{evaluation}/submit', [KichwaSubmissionController::class, 'submit'])->middleware('throttle:10,1,evaluation-submit');
        Route::get('/attempts/{attempt}', [KichwaSubmissionController::class, 'resume']);
        Route::patch('/attempts/{attempt}', [KichwaSubmissionController::class, 'draft']);
        Route::post('/attempts/{attempt}/pair', [KichwaSubmissionController::class, 'pair'])->middleware('throttle:60,1,practice-pairs');
        Route::get('/mastery', fn (Request $request) => response()->json(DominioLecciones::progress($request->user()->id_usuario)));
        Route::delete('/attempts/{attempt}', [KichwaSubmissionController::class, 'abandon']);
        Route::get('/progress', [KichwaCatalogController::class, 'progress']);
        Route::get('/progress/levels/{level}', [KichwaCatalogController::class, 'progress']);
        Route::get('/testimonials/eligibility', [TestimonialController::class, 'eligibility']);
        Route::post('/testimonials', [TestimonialController::class, 'store'])->middleware('throttle:5,1');
    });
    Route::prefix('admin')->middleware('role:admin')->group(function (): void {
        Route::get('/overview', [KichwaAdminController::class, 'overview']);
        Route::post('/evaluations/{id}/review-bank', [KichwaAdminController::class, 'reviewBank']);
        Route::get('/evaluations/{id}/preview', [KichwaAdminController::class, 'previewEvaluation']);
        Route::post('/evaluations/{id}/preview', [KichwaAdminController::class, 'previewEvaluation']);
        Route::post('/evaluations/{id}/synchronize-bank', [KichwaAdminController::class, 'synchronizeFinalBank']);
        Route::post('/diccionario/import', [DiccionarioController::class, 'import'])->middleware('throttle:5,1');
        Route::get('/students', [KichwaAdminController::class, 'students']);
        Route::patch('/students/{id}', [KichwaAdminController::class, 'block']);
        Route::post('/preview', [KichwaAdminController::class, 'preview']);
        Route::get('/media', [ArchivoController::class, 'index']);
        Route::get('/learning-results/{id}', fn (int $id) => response()->json(DominioLecciones::progress($id)));
        Route::post('/uploads', [ArchivoController::class, 'store'])->middleware('throttle:20,1');
        foreach (['levels', 'modules', 'units', 'contents', 'exercises', 'evaluations', 'questions', 'diccionario'] as $resource) {
            Route::post('/'.$resource.'/{id}/version', [KichwaAdminController::class, 'version'])->defaults('resource', $resource);
            Route::get('/'.$resource.'/{id}/dependencies', [KichwaAdminController::class, 'dependencies'])->defaults('resource', $resource);
            Route::patch('/'.$resource.'/{id}/move', [KichwaAdminController::class, 'move'])->defaults('resource', $resource);
            Route::get('/'.$resource, [KichwaAdminController::class, 'index'])->defaults('resource', $resource);
            Route::get('/'.$resource.'/{id}', [KichwaAdminController::class, 'show'])->defaults('resource', $resource);

            Route::post('/'.$resource, [KichwaAdminController::class, 'store'])->defaults('resource', $resource);
            Route::patch('/'.$resource.'/{id}', [KichwaAdminController::class, 'update'])->defaults('resource', $resource);
            Route::delete('/'.$resource.'/{id}', [KichwaAdminController::class, 'destroy'])->defaults('resource', $resource);

        }
    });
});
