<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\GlossaryTerm;

class GlossaryController extends BaseResourceController
{
    protected string $modelClass = GlossaryTerm::class;

    protected function storeRules(): array
    {
        return [
            'spanish' => ['required', 'string', 'max:160'],
            'kichwa' => ['required', 'string', 'max:160'],
            'meaning' => ['required', 'string'],
            'example_spanish' => ['nullable', 'string'],
            'example_kichwa' => ['nullable', 'string'],
            'is_published' => ['sometimes', 'boolean'],
        ];
    }

    protected function updateRules(): array
    {
        return [
            'spanish' => ['sometimes', 'string', 'max:160'],
            'kichwa' => ['sometimes', 'string', 'max:160'],
            'meaning' => ['sometimes', 'string'],
            'example_spanish' => ['sometimes', 'nullable', 'string'],
            'example_kichwa' => ['sometimes', 'nullable', 'string'],
            'is_published' => ['sometimes', 'boolean'],
        ];
    }
}
