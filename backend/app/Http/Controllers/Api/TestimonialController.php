<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SaveTestimonialRequest;
use App\Models\Testimonial;
use App\Models\Usuario;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TestimonialController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $language = in_array($request->query('language'), ['es', 'qu'], true) ? $request->query('language') : 'es';
        $testimonials = Testimonial::with(['user:id,name', 'usuario:id_usuario,nombre_usuario'])
            ->where('language', $language)
            ->where(function (Builder $query): void {
                $query->whereHas('usuario', fn (Builder $user) => $user->where('rol_usuario', 'estudiante')->where('estado_usuario', 'activo'))
                    ->orWhere(fn (Builder $legacy) => $legacy->whereNull('usuario_id')->whereHas('user'));
            })
            ->latest('updated_at')->orderByDesc('id')
            ->limit(6)
            ->get()
            ->map(fn (Testimonial $testimonial) => $this->present($testimonial));

        return response()->json($testimonials);
    }

    public function eligibility(Request $request): JsonResponse
    {
        $language = in_array($request->query('language'), ['es', 'qu'], true) ? $request->query('language') : 'es';
        $testimonial = Testimonial::with('usuario:id_usuario,nombre_usuario')
            ->where('usuario_id', $request->user()->getKey())->where('language', $language)->first();

        return response()->json([
            'has_commented' => $testimonial !== null,
            'can_comment' => true,
            'testimonial' => $testimonial ? $this->present($testimonial) : null,
        ]);
    }

    public function store(SaveTestimonialRequest $request): JsonResponse
    {
        $testimonial = DB::transaction(function () use ($request): Testimonial {
            Usuario::whereKey($request->user()->getKey())->lockForUpdate()->firstOrFail();

            return Testimonial::updateOrCreate(
                ['usuario_id' => $request->user()->getKey(), 'language' => $request->validated('language') ?? 'es'],
                ['body' => $request->validated('body')],
            );
        });

        return response()->json($this->present($testimonial->load('usuario')), $testimonial->wasRecentlyCreated ? 201 : 200);
    }

    private function present(Testimonial $testimonial): array
    {
        $name = $testimonial->usuario?->nombre_usuario ?? $testimonial->user?->name ?? 'Estudiante';
        $nameParts = preg_split('/\s+/u', trim($name)) ?: [];
        $firstName = $nameParts[0] ?? 'Estudiante';
        $displayName = isset($nameParts[1])
            ? $firstName.' '.Str::upper(Str::substr($nameParts[1], 0, 1)).'.'
            : $firstName;

        return [
            'id' => $testimonial->id,
            'name' => $displayName,
            'body' => $testimonial->body,
            'language' => $testimonial->language,
            'created_at' => $testimonial->created_at?->toDateString(),
        ];
    }
}
