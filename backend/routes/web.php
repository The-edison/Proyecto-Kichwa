<?php

use App\Http\Controllers\Web\GoogleAuthController;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->get('/auth/google', [GoogleAuthController::class, 'redirect'])->middleware('throttle:10,1')->name('google.redirect');
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->middleware('throttle:10,1')->name('google.callback');
Route::middleware(['auth', 'active'])->get('/cuenta/google', [GoogleAuthController::class, 'link'])->middleware('throttle:10,1')->name('google.link');
Route::get('/email/verify/{id}/{hash}', function (EmailVerificationRequest $request) {
    $request->fulfill();

    return redirect()->away(rtrim(config('app.frontend_url'), '/').'/cuenta?verified=1');
})->middleware(['auth', 'active', 'signed', 'throttle:6,1'])->name('verification.verify');
