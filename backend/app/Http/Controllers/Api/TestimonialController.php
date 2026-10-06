<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Testimonial;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class TestimonialController extends Controller
{
    public function index(): JsonResponse
    {
        $testimonials = Testimonial::with('user:id,name')
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn (Testimonial $testimonial) => $this->present($testimonial));

        return response()->json($testimonials);
    }

    private function present(Testimonial $testimonial): array
    {
        $nameParts = preg_split('/\s+/u', trim($testimonial->user->name)) ?: [];
        $firstName = $nameParts[0] ?? 'Estudiante';
        $displayName = isset($nameParts[1])
            ? $firstName.' '.Str::upper(Str::substr($nameParts[1], 0, 1)).'.'
            : $firstName;

        return [
            'id' => $testimonial->id,
            'name' => $displayName,
            'body' => $testimonial->body,
            'created_at' => $testimonial->created_at?->toDateString(),
        ];
    }
}
