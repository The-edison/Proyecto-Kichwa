<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Content;
use App\Models\Evaluation;
use App\Models\Exercise;
use App\Models\LearningModule;
use App\Models\Level;
use App\Models\Unit;
use App\Services\PublishedCatalog;
use Illuminate\Http\JsonResponse;

class CatalogController extends Controller
{
    public function levels(): JsonResponse
    {
        return response()->json(Level::where('is_published', true)->orderBy('sort_order')
            ->get(['id', 'code', 'name', 'sort_order']));
    }

    public function modules(Level $level): JsonResponse
    {
        PublishedCatalog::level($level);

        return response()->json($level->modules()->where('is_published', true)
            ->orderBy('sort_order')->get(['id', 'level_id', 'title', 'description', 'sort_order']));
    }

    public function units(LearningModule $module): JsonResponse
    {
        PublishedCatalog::module($module);

        return response()->json($module->units()->where('is_published', true)
            ->orderBy('sort_order')->get(['id', 'module_id', 'title', 'description', 'sort_order']));
    }

    public function contents(Unit $unit): JsonResponse
    {
        PublishedCatalog::unit($unit);

        return response()->json($unit->contents()->where('is_published', true)
            ->orderBy('sort_order')->get(['id', 'unit_id', 'kind', 'title', 'body', 'sort_order']));
    }

    public function exercises(Content $content): JsonResponse
    {
        PublishedCatalog::content($content);

        return response()->json($content->exercises()->where('is_published', true)
            ->orderBy('sort_order')->get(['id', 'content_id', 'type', 'prompt', 'options', 'sort_order']));
    }

    public function evaluations(Level $level): JsonResponse
    {
        PublishedCatalog::level($level);

        return response()->json($level->evaluations()->where('is_published', true)
            ->orderBy('id')->get(['id', 'level_id', 'title', 'description', 'passing_score']));
    }

    public function evaluation(Evaluation $evaluation): JsonResponse
    {
        PublishedCatalog::evaluation($evaluation);

        return response()->json([
            'id' => $evaluation->id,
            'level_id' => $evaluation->level_id,
            'title' => $evaluation->title,
            'description' => $evaluation->description,
            'passing_score' => $evaluation->passing_score,
            'questions' => $evaluation->questions()->orderBy('sort_order')
                ->get(['id', 'evaluation_id', 'type', 'prompt', 'options', 'sort_order']),
        ]);
    }
}
