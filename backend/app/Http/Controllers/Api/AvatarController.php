<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AvatarController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $presets = json_decode(file_get_contents(resource_path('avatar-presets.json')), true, 512, JSON_THROW_ON_ERROR);
        $data = $request->validate([
            'preset' => ['required', 'string', Rule::in([...array_column($presets, 'id'), 'initial'])],
            'image' => ['prohibited'],
        ], [
            'preset.in' => 'Selecciona uno de los avatares disponibles.',
            'image.prohibited' => 'Elige un avatar del selector. No se permiten fotos subidas.',
        ]);
        [$user, $previous] = DB::transaction(function () use ($request, $data): array {
            $user = Usuario::whereKey($request->user()->id_usuario)->lockForUpdate()->firstOrFail();
            $previous = $user->avatar_usuario;
            $user->avatar_usuario = $data['preset'] === 'initial' ? null : $data['preset'];
            $user->save();

            return [$user, $previous];
        });
        if ($previous !== $user->avatar_usuario && preg_match('#^avatars/[a-f0-9]{40}\.webp$#', $previous ?? '')) {
            Storage::disk('public')->delete($previous);
        }

        return response()->json($user->perfil());
    }

    public function show(Request $request, string $filename): BinaryFileResponse
    {
        $path = 'avatars/'.$filename;
        abort_unless(Storage::disk('public')->exists($path), 404);
        $response = response()->file(Storage::disk('public')->path($path), [
            'Content-Type' => 'image/webp', 'Cache-Control' => 'public, max-age=31536000, immutable',
            'X-Content-Type-Options' => 'nosniff', 'Content-Security-Policy' => "default-src 'none'",
        ]);
        $response->setAutoEtag();
        $response->isNotModified($request);

        return $response;
    }
}
