<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\LearningModule;

class ModuleController extends BaseResourceController
{
    protected string $modelClass = LearningModule::class;

    protected function storeRules(): array
    {
        return [
            'level_id' => ['required', 'exists:levels,id'],
            'title' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_published' => ['sometimes', 'boolean'],
        ];
    }

    protected function updateRules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:160'],
            'description' => ['sometimes', 'nullable', 'string'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_published' => ['sometimes', 'boolean'],
        ];
    }
}
