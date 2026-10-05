<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Content;
use Illuminate\Validation\Rule;

class ContentController extends BaseResourceController
{
    protected string $modelClass = Content::class;

    protected function storeRules(): array
    {
        return [
            'unit_id' => ['required', 'exists:units,id'],
            'kind' => ['required', Rule::in(['vocabulary', 'grammar'])],
            'title' => ['required', 'string', 'max:160'],
            'body' => ['required', 'string'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_published' => ['sometimes', 'boolean'],
        ];
    }

    protected function updateRules(): array
    {
        return [
            'kind' => ['sometimes', Rule::in(['vocabulary', 'grammar'])],
            'title' => ['sometimes', 'string', 'max:160'],
            'body' => ['sometimes', 'string'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_published' => ['sometimes', 'boolean'],
        ];
    }
}
