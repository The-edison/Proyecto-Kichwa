<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ContratoEjercicio;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ArchivoController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate(['kind' => ['required', 'in:imagen,audio'], 'file' => ['required', 'file', 'max:10240']]);
        $image = $request->input('kind') === 'imagen';
        $rules = $image ? ['image', 'mimes:jpg,jpeg,png,webp', 'extensions:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=6000,max_height=6000'] :
            ['mimes:mp3,wav,ogg,m4a,mp4', 'extensions:mp3,wav,ogg,m4a', 'max:10240'];
        $request->validate(['file' => $rules]);
        $file = $request->file('file');
        if ($image) {
            $source = match ($file->getMimeType()) {
                'image/jpeg' => imagecreatefromjpeg($file->getPathname()),
                'image/png' => imagecreatefrompng($file->getPathname()),
                'image/webp' => imagecreatefromwebp($file->getPathname()),
                default => false,
            };
            if (! $source) {
                throw ValidationException::withMessages(['file' => 'La imagen no se puede leer.']);
            }
            ob_start();
            imagepng($source);
            $bytes = ob_get_clean();
            imagedestroy($source);
            $path = 'kichwa/imagenes/'.bin2hex(random_bytes(20)).'.png';
            Storage::disk('public')->put($path, $bytes);
        } else {
            $path = $file->storeAs('kichwa/audio', bin2hex(random_bytes(20)).'.'.strtolower($file->getClientOriginalExtension()), 'public');
            ContratoEjercicio::file($path, 'audio');
        }

        return response()->json(['path' => $path, 'url' => url('/api/media/'.$path)], 201);
    }

    public function show(string $path): BinaryFileResponse
    {
        abort_unless(preg_match('#^kichwa/(imagenes|audio)/[a-zA-Z0-9]+\\.(png|jpg|jpeg|webp|mp3|wav|ogg|m4a|mp4)$#', $path), 404);
        abort_unless(Storage::disk('public')->exists($path), 404);

        return response()->file(Storage::disk('public')->path($path), [
            'Content-Type' => Storage::disk('public')->mimeType($path),
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'",
        ]);
    }
}
