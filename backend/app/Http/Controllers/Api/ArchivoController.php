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
    public function index(Request $request): JsonResponse
    {
        $request->validate(['kind' => ['required', 'in:imagen,audio'], 'page' => ['sometimes', 'integer', 'min:1']]);
        $folder = $request->input('kind') === 'imagen' ? 'imagenes' : 'audio';
        $files = collect(Storage::disk('public')->files('kichwa/'.$folder))->sort()->values();
        $page = $request->integer('page', 1);

        return response()->json(['data' => $files->slice(($page - 1) * 24, 24)->map(fn ($path) => ['path' => $path, 'name' => basename($path)])->values(), 'last_page' => max(1, (int) ceil($files->count() / 24)), 'current_page' => $page]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate(['kind' => ['required', 'in:imagen,audio'], 'file' => ['required', 'file', 'max:10240']]);
        $image = $request->input('kind') === 'imagen';
        $rules = $image ? ['image', 'mimes:jpg,jpeg,png,webp', 'extensions:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=6000,max_height=6000'] :
            ['mimes:mp3,wav,ogg,m4a,mp4', 'extensions:mp3,wav,ogg,m4a', 'max:10240'];
        $request->validate(['file' => $rules]);
        $file = $request->file('file');
        if ($image) {
            $dimensions = getimagesize($file->getPathname());
            if (! $dimensions || $dimensions[0] * $dimensions[1] > 12000000) {
                throw ValidationException::withMessages(['file' => 'La imagen debe tener como máximo 12 millones de píxeles. Reduce sus dimensiones e inténtalo nuevamente.']);
            }
            try {
                $source = match ($file->getMimeType()) {
                    'image/jpeg' => imagecreatefromjpeg($file->getPathname()),
                    'image/png' => imagecreatefrompng($file->getPathname()),
                    'image/webp' => imagecreatefromwebp($file->getPathname()),
                    default => false,
                };
            } catch (\ErrorException) {
                throw ValidationException::withMessages(['file' => 'La imagen no se puede leer.']);
            }
            if (! $source) {
                throw ValidationException::withMessages(['file' => 'La imagen no se puede leer.']);
            }
            $width = imagesx($source);
            $height = imagesy($source);
            if (max($width, $height) > 1600) {
                $ratio = 1600 / max($width, $height);
                $resized = imagescale($source, max(1, (int) round($width * $ratio)), max(1, (int) round($height * $ratio)), IMG_BICUBIC);
                imagedestroy($source);
                $source = $resized;
            }
            ob_start();
            imagewebp($source, null, 82);
            $bytes = ob_get_clean();
            imagedestroy($source);
            $path = 'kichwa/imagenes/'.bin2hex(random_bytes(20)).'.webp';
            abort_unless(Storage::disk('public')->put($path, $bytes), 503, 'No se pudo guardar el archivo. Intenta nuevamente.');
        } else {
            $path = $file->storeAs('kichwa/audio', bin2hex(random_bytes(20)).'.'.strtolower($file->getClientOriginalExtension()), 'public');
            abort_unless(is_string($path) && $path !== '', 503, 'No se pudo guardar el audio.');
            ContratoEjercicio::file($path, 'audio');
        }

        return response()->json(['path' => $path, 'url' => url('/api/media/'.$path)], 201);
    }

    public function show(Request $request, string $path): BinaryFileResponse
    {
        abort_unless(preg_match('#^kichwa/(imagenes|audio)/[a-zA-Z0-9]+\\.(png|jpg|jpeg|webp|mp3|wav|ogg|m4a|mp4)$#', $path), 404);
        abort_unless(Storage::disk('public')->exists($path), 404);

        $response = response()->file(Storage::disk('public')->path($path), [
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'Content-Type' => Storage::disk('public')->mimeType($path),
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'",
        ]);
        $response->setAutoEtag();
        $response->isNotModified($request);

        return $response;
    }
}
