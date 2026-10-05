<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GlossaryTerm;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GlossaryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['q' => ['sometimes', 'string', 'max:100']]);
        $query = GlossaryTerm::query()->where('is_published', true);

        if (! empty($data['q'])) {
            $needle = '%'.mb_strtolower(trim($data['q'])).'%';
            $query->where(fn ($q) => $q
                ->whereRaw('LOWER(spanish) LIKE ?', [$needle])
                ->orWhereRaw('LOWER(kichwa) LIKE ?', [$needle]));
        }

        return response()->json($query->orderBy('spanish')->paginate(20));
    }
}
