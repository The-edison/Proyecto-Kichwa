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
        $data = $request->validate([
            'preset' => ['required_without:image', Rule::prohibitedIf($request->hasFile('image')), Rule::in(['cometa', 'cometa-guia', 'cometa-animo', 'sol', 'luna', 'flor', 'initial'])],
            'image' => ['required_without:preset', Rule::prohibitedIf($request->filled('preset')), 'image', 'mimetypes:image/jpeg,image/png,image/webp', 'max:2048', 'dimensions:min_width=64,min_height=64,max_width=3000,max_height=3000'],
        ], [
            'image.max' => 'La imagen debe pesar como máximo 2 MB.',
            'image.dimensions' => 'La imagen debe medir entre 64 y 3000 píxeles por lado.',
            'image.image' => 'Selecciona una imagen JPG, PNG o WebP válida.',
            'image.mimetypes' => 'Selecciona una imagen JPG, PNG o WebP.',
            'preset.in' => 'Selecciona uno de los avatares disponibles.',
        ]);
        $path = null;
        if ($request->hasFile('image')) {
            $image = @imagecreatefromstring($request->file('image')->get());
            abort_unless($image !== false, 422, 'No se pudo leer la imagen. Selecciona otra foto.');
            $size = min(imagesx($image), imagesy($image));
            $avatar = imagecreatetruecolor(256, 256);
            imagealphablending($avatar, false);
            imagesavealpha($avatar, true);
            imagecopyresampled($avatar, $image, 0, 0, (int) ((imagesx($image) - $size) / 2), (int) ((imagesy($image) - $size) / 2), 256, 256, $size, $size);
            ob_start();
            imagewebp($avatar, null, 84);
            $bytes = ob_get_clean();
            imagedestroy($image);
            imagedestroy($avatar);
            $path = 'avatars/'.bin2hex(random_bytes(20)).'.webp';
            abort_unless(Storage::disk('public')->put($path, $bytes), 503, 'No se pudo guardar tu imagen. Inténtalo de nuevo.');
        }
        try {
            [$user, $previous] = DB::transaction(function () use ($request, $data, $path): array {
                $user = Usuario::whereKey($request->user()->id_usuario)->lockForUpdate()->firstOrFail();
                $previous = $user->avatar_usuario;
                $user->avatar_usuario = $path ?? ($data['preset'] === 'initial' ? null : $data['preset']);
                $user->save();

                return [$user, $previous];
            });
        } catch (\Throwable $exception) {
            if ($path !== null) {
                Storage::disk('public')->delete($path);
            }
            throw $exception;
        }
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
