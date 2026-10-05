<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['q' => ['sometimes', 'string', 'max:100']]);
        $query = User::query()->whereHas('role', fn ($q) => $q->where('code', 'student'));

        if (! empty($data['q'])) {
            $needle = '%'.mb_strtolower(trim($data['q'])).'%';
            $query->where(fn ($q) => $q
                ->whereRaw('LOWER(name) LIKE ?', [$needle])
                ->orWhere('cedula', 'like', $needle));
        }

        return response()->json($query->select('id', 'name', 'cedula', 'email', 'created_at')
            ->orderBy('name')->paginate(20));
    }
}
