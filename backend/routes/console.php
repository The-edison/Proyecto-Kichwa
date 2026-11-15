<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Schedule::command('comentarios:actualizar-destacados')->weeklyOn(1, '03:00')
    ->timezone('America/Guayaquil')->withoutOverlapping(60);

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
