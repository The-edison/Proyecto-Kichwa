<?php

use App\Http\Controllers\Web\GoogleAuthController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->get('/auth/google', [GoogleAuthController::class, 'redirect'])
    ->middleware('throttle:10,1')->name('google.redirect');
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])
    ->middleware('throttle:10,1')->name('google.callback');
Route::middleware('auth')->get('/cuenta/google', [GoogleAuthController::class, 'link'])
    ->middleware('throttle:10,1')->name('google.link');
