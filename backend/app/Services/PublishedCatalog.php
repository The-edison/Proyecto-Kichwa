<?php

namespace App\Services;

use App\Models\Content;
use App\Models\Evaluation;
use App\Models\Exercise;
use App\Models\LearningModule;
use App\Models\Level;
use App\Models\Unit;

class PublishedCatalog
{
    public static function level(Level $level): void
    {
        abort_unless($level->is_published, 404);
    }

    public static function module(LearningModule $module): void
    {
        $module->loadMissing('level');
        abort_unless($module->is_published && $module->level?->is_published, 404);
    }

    public static function unit(Unit $unit): void
    {
        $unit->loadMissing('module.level');
        abort_unless($unit->is_published, 404);
        abort_unless($unit->module, 404);
        self::module($unit->module);
    }

    public static function content(Content $content): void
    {
        $content->loadMissing('unit.module.level');
        abort_unless($content->is_published, 404);
        abort_unless($content->unit, 404);
        self::unit($content->unit);
    }

    public static function exercise(Exercise $exercise): void
    {
        $exercise->loadMissing('content.unit.module.level');
        abort_unless($exercise->is_published, 404);
        abort_unless($exercise->content, 404);
        self::content($exercise->content);
    }

    public static function evaluation(Evaluation $evaluation): void
    {
        $evaluation->loadMissing('level');
        abort_unless($evaluation->is_published, 404);
        self::level($evaluation->level);
    }
}
