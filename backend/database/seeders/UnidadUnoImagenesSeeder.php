<?php

namespace Database\Seeders;

use App\Models\Actividad;
use App\Models\Tema;
use App\Models\Unidad;
use App\Services\EstadoContenido;
use App\Services\KichwaResource;
use App\Services\PublicacionContenido;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class UnidadUnoImagenesSeeder extends Seeder
{
    public function run(): void
    {
        $images = ['sisa' => $this->imagePath('flor.png'), 'purina' => $this->imagePath('purina.png'), 'yura' => $this->imagePath('yura.png')];
        DB::transaction(function () use ($images): void {
            DB::select('SELECT pg_advisory_xact_lock(20261011)');
            $topic = Tema::where('clave_leccion', UnidadUnoGuiadaSeeder::LESSON_KEY)->firstOrFail();
            $unit = Unidad::whereKey($topic->id_unidad)->lockForUpdate()->firstOrFail();
            $previous = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u1-guided-v3-1')->firstOrFail();
            $bank = [
                'sisa' => ['choices' => ['purina', 'sisa', 'wasi', 'shunku'], 'alt' => 'Una flor rosada con pétalos abiertos, tallo y hojas verdes.',
                    'prompt' => 'Observa la imagen. Selecciona su nombre en kichwa.',
                    'correct' => 'Alli rurashka. Sisa significa flor.', 'incorrect' => 'Kutin rurapay. Observa la flor y vuelve a intentarlo.'],
                'purina' => ['choices' => ['wasi', 'shunku', 'purina', 'sisa'], 'alt' => 'Una mujer andina caminando por un sendero, con una pierna adelantada y los brazos en movimiento.',
                    'prompt' => 'Observa la imagen. Selecciona la acción en kichwa.',
                    'correct' => 'Alli rurashka. Purina significa caminar.', 'incorrect' => 'Kutin rurapay. Observa la acción de la persona y vuelve a intentarlo.'],
                'yura' => ['choices' => ['sisa', 'yura', 'wasi', 'purina'], 'alt' => 'Un árbol de tronco marrón y copa verde, completo y de pie sobre el césped.',
                    'prompt' => 'Observa la imagen. Selecciona su nombre en kichwa.',
                    'correct' => 'Alli rurashka. Yura significa árbol.', 'incorrect' => 'Kutin rurapay. Observa el tronco, las ramas y las hojas del árbol y vuelve a intentarlo.'],
            ];
            foreach ($bank as $word => $item) {
                $origin = 'u1-guided-image-'.$word.'-v1';
                $existing = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)->first();
                if ($existing) {
                    $previous = $existing;

                    continue;
                }
                $exercise = ['type' => 'seleccion_multiple', 'prompt' => $item['prompt'], 'resource' => null, 'zones' => [],
                    'elements' => array_map(fn (string $choice): array => ['id' => $choice, 'texto' => $choice], $item['choices']),
                    'solution' => ['seleccion' => [$word]],
                    'config' => ['title' => '¿Qué palabra corresponde?', 'prompt_image' => $images[$word], 'prompt_image_alt' => $item['alt'],
                        'presentation' => 'buttons', 'max_selections' => 1, 'exact_selections' => true, 'managed' => true, 'reviewed' => true,
                        'difficulty' => 'inicial', 'correct_feedback' => $item['correct'], 'incorrect_feedback' => $item['incorrect']]];
                EstadoContenido::assertReady($exercise);
                $position = $previous->orden_actividad + 1;
                foreach (Actividad::where('id_unidad', $unit->id_unidad)->where('orden_actividad', '>=', $position)->orderByDesc('orden_actividad')->get() as $following) {
                    $following->update(['orden_actividad' => $following->orden_actividad + 1]);
                }
                $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
                $record->id_unidad = $unit->id_unidad;
                $record->origen_reactivo = $origin;
                $record->orden_actividad = $position;
                $record->publicado = true;
                $record->save();
                $previous = $record;
            }
            if (! str_contains($topic->contenido_tema, 'yura = árbol')) {
                $topic->update(['contenido_tema' => $topic->contenido_tema."\n\nyura = árbol. Reconoce el tronco, las ramas y las hojas del árbol."]);
            }
        });
        PublicacionContenido::invalidate();
    }

    private function imagePath(string $filename): string
    {
        $source = resource_path('images/unidad1/'.$filename);
        $path = 'kichwa/imagenes/'.hash_file('sha256', $source).'.webp';
        if (! Storage::disk('public')->exists($path)) {
            $image = imagecreatefrompng($source);
            $small = imagescale($image, 640);
            ob_start();
            imagewebp($small, null, 88);
            $bytes = ob_get_clean();
            imagedestroy($image);
            imagedestroy($small);
            if (! Storage::disk('public')->put($path, $bytes)) {
                throw new \RuntimeException('No se pudo guardar la ilustración de '.$filename.'.');
            }
        }

        return $path;
    }
}
