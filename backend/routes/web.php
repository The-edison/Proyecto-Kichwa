<?php

use App\Http\Controllers\Web\AuthController;
use App\Http\Controllers\Web\GoogleAuthController;
use App\Models\Level;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('Home'))->name('home');
Route::get('/glosario', fn () => Inertia::render('Glossary/Index'))->name('glossary');

Route::middleware('guest')->group(function (): void {
    Route::get('/iniciar-sesion', fn () => Inertia::render('Auth/Login'))->name('login');
    Route::post('/iniciar-sesion', [AuthController::class, 'login'])->middleware('throttle:5,1')->name('login.store');
    Route::get('/registro', fn () => Inertia::render('Auth/Register'))->name('register');
    Route::post('/registro', [AuthController::class, 'register'])->middleware('throttle:5,1')->name('register.store');
    Route::get('/auth/google', [GoogleAuthController::class, 'redirect'])->middleware('throttle:10,1')->name('google.redirect');
});

Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->middleware('throttle:10,1')->name('google.callback');

Route::middleware('auth')->group(function (): void {
    Route::post('/cerrar-sesion', [AuthController::class, 'logout'])->name('logout');
    Route::get('/cuenta', fn () => Inertia::render('Account/Index'))->name('account');
    Route::get('/cuenta/google', [GoogleAuthController::class, 'link'])->middleware('throttle:10,1')->name('google.link');

    Route::middleware('role:student')->group(function (): void {
        Route::get('/aprender', fn () => Inertia::render('Student/Dashboard'))->name('student.dashboard');
        Route::get('/aprender/nivel/{level}', fn (Level $level) => Inertia::render('Student/Level', [
            'level' => $level->only('id', 'name', 'code'),
        ]))->name('student.level');
        Route::get('/aprender/unidad/{unit}', fn (int $unit) => Inertia::render('Student/Unit', [
            'unitId' => $unit,
        ]))->name('student.unit');
        Route::get('/aprender/evaluacion/{evaluation}', fn (int $evaluation) => Inertia::render('Student/Evaluation', [
            'evaluationId' => $evaluation,
        ]))->name('student.evaluation');
        Route::get('/aprender/progreso', fn () => Inertia::render('Student/Progress'))->name('student.progress');
    });

    Route::prefix('admin')->middleware('role:admin')->group(function (): void {
        Route::get('/', fn () => Inertia::render('Admin/Dashboard'))->name('admin.dashboard');
        Route::get('/estudiantes', fn () => Inertia::render('Admin/Students'))->name('admin.students');
        Route::get('/contenidos', fn () => Inertia::render('Admin/ContentManager', [
            'levels' => Level::orderBy('sort_order')->get(['id', 'name']),
        ]))->name('admin.contents');
    });
});
