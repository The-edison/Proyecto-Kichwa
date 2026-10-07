<?php

use App\Http\Controllers\Api\ArchivoController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DiccionarioController;
use App\Http\Controllers\Api\KichwaAdminController;
use App\Http\Controllers\Api\KichwaCatalogController;
use App\Http\Controllers\Api\KichwaSubmissionController;
use App\Http\Controllers\Api\TestimonialController;
use App\Http\Controllers\Web\GoogleAuthController;
use Illuminate\Support\Facades\Route;

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
        Route::get('/units/{unit}/contents', [KichwaCatalogController::class, 'contents']);
        Route::get('/units/{unit}/topics/{topic}', [KichwaCatalogController::class, 'topic']);
        Route::get('/units/{unit}/exercises', [KichwaCatalogController::class, 'exercises']);
        Route::get('/levels/{level}/evaluations', [KichwaCatalogController::class, 'evaluations']);
        Route::get('/evaluations/{evaluation}', [KichwaCatalogController::class, 'evaluation']);
        Route::post('/exercises/{exercise}/answer', [KichwaSubmissionController::class, 'activity'])->middleware('throttle:60,1');
        Route::post('/evaluations/{evaluation}/attempts', [KichwaSubmissionController::class, 'start'])->middleware('throttle:10,1');
        Route::post('/evaluations/{evaluation}/submit', [KichwaSubmissionController::class, 'submit'])->middleware('throttle:10,1');
        Route::delete('/attempts/{attempt}', [KichwaSubmissionController::class, 'abandon']);
        Route::get('/progress', [KichwaCatalogController::class, 'progress']);
        Route::get('/progress/levels/{level}', [KichwaCatalogController::class, 'progress']);
        Route::get('/testimonials/eligibility', fn () => response()->json(['completed_intermediate' => false, 'has_commented' => false, 'can_comment' => false]));
        Route::post('/testimonials', fn () => abort(403, 'Disponible cuando se habilite Intermedio.'));
    });
    Route::prefix('admin')->middleware('role:admin')->group(function (): void {
        Route::get('/overview', [KichwaAdminController::class, 'overview']);
        Route::post('/diccionario/import', [DiccionarioController::class, 'import'])->middleware('throttle:5,1');
        Route::get('/students', [KichwaAdminController::class, 'students']);
        Route::patch('/students/{id}', [KichwaAdminController::class, 'block']);
        Route::post('/uploads', [ArchivoController::class, 'store'])->middleware('throttle:20,1');
        foreach (['levels', 'modules', 'units', 'contents', 'exercises', 'evaluations', 'questions', 'diccionario'] as $resource) {
            Route::get('/'.$resource.'/{id}/dependencies', [KichwaAdminController::class, 'dependencies'])->defaults('resource', $resource);
            Route::patch('/'.$resource.'/{id}/move', [KichwaAdminController::class, 'move'])->defaults('resource', $resource);
            Route::get('/'.$resource, [KichwaAdminController::class, 'index'])->defaults('resource', $resource);
            Route::get('/'.$resource.'/{id}', [KichwaAdminController::class, 'show'])->defaults('resource', $resource);
            if ($resource !== 'levels') {
                Route::post('/'.$resource, [KichwaAdminController::class, 'store'])->defaults('resource', $resource);
                Route::patch('/'.$resource.'/{id}', [KichwaAdminController::class, 'update'])->defaults('resource', $resource);
                Route::delete('/'.$resource.'/{id}', [KichwaAdminController::class, 'destroy'])->defaults('resource', $resource);
            }
        }
    });
});
