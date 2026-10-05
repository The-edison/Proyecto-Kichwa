<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Testimonial;
use App\Services\IntermediateCompletion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

    public function eligibility(Request $request, IntermediateCompletion $completion): JsonResponse
    {
        $hasCommented = Testimonial::where('user_id', $request->user()->id)->exists();
        $completedIntermediate = $completion->isComplete($request->user());

        return response()->json([
            'completed_intermediate' => $completedIntermediate,
            'has_commented' => $hasCommented,
            'can_comment' => $completedIntermediate && ! $hasCommented,
        ]);
    }

    public function store(Request $request, IntermediateCompletion $completion): JsonResponse
    {
        if (is_string($request->input('body'))) {
            $request->merge(['body' => trim($request->input('body'))]);
        }

        $data = $request->validate([
            'body' => ['required', 'string', 'min:20', 'max:500'],
        ]);

        if (! $completion->isComplete($request->user())) {
            return response()->json(['message' => 'Completa el nivel Intermedio y aprueba sus evaluaciones antes de opinar.'], 403);
        }

        if (Testimonial::where('user_id', $request->user()->id)->exists()) {
            return response()->json(['message' => 'Ya compartiste tu opinión.'], 409);
        }

        $testimonial = Testimonial::create([
            'user_id' => $request->user()->id,
            'body' => $data['body'],
        ]);
        $testimonial->setRelation('user', $request->user());

        return response()->json($this->present($testimonial), 201);
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
