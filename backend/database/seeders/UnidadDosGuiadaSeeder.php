<?php

namespace Database\Seeders;

use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\Tema;
use App\Models\Unidad;
use App\Services\EstadoContenido;
use App\Services\KichwaResource;
use App\Services\PublicacionContenido;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class UnidadDosGuiadaSeeder extends Seeder
{
    public const LESSON_KEY = 'basico-modulo1-unidad2-saludos-v1';

    public function run(): void
    {
        $this->call(UnidadUnoGuiadaSeeder::class);
        $images = [];
        foreach (['manana', 'tarde', 'noche'] as $time) {
            $images[$time] = $this->imagePath($time);
        }
        DB::transaction(function () use ($images): void {
            DB::select('SELECT pg_advisory_xact_lock(20261011)');
            if (Tema::where('clave_leccion', self::LESSON_KEY)->exists()) {
                return;
            }
            $firstLesson = Tema::where('clave_leccion', UnidadUnoGuiadaSeeder::LESSON_KEY)->firstOrFail();
            $firstUnit = Unidad::findOrFail($firstLesson->id_unidad);
            $unit = Unidad::where('id_modulo', $firstUnit->id_modulo)->where('orden_unidad', 2)->lockForUpdate()->first();
            if (! $unit) {
                $unit = Unidad::create(['id_modulo' => $firstUnit->id_modulo, 'orden_unidad' => 2,
                    'titulo_unidad' => 'Saludos y conversación', 'objetivo_unidad' => 'Saludar según el momento del día y conversar en kichwa.', 'publicado' => true]);
            }
            Actividad::where('id_unidad', $unit->id_unidad)->update(['publicado' => false]);
            EvaluacionKichwa::where('id_unidad', $unit->id_unidad)->update(['publicado' => false]);
            Tema::where('id_unidad', $unit->id_unidad)->update(['publicado' => false]);
            Tema::create(['id_unidad' => $unit->id_unidad, 'clave_leccion' => self::LESSON_KEY, 'tipo_tema' => 'vocabulario',
                'titulo_tema' => 'Saludos y conversación',
                'contenido_tema' => "Elige una expresión según lo que necesitas decir.\n\nPara saludar:\nAlli puncha = buenos días\nAlli chishi = buenas tardes\nAlli tuta = buenas noches\n\nPara conversar:\nImanalla kanki? = ¿Cómo estás?\nAllilla kani. = Estoy bien.\nMaymanta kanki? = ¿De dónde eres?\nMaypitak llankanki? = ¿Dónde trabajas?\n\nPara despedirse o ser amable:\nKayakama = hasta mañana\nTupananchikkama = hasta luego\nYupaychani = gracias\nKishpichiway = perdón\n\nUn ejemplo de conversación:\nA: Imanalla kanki?\nB: Allilla kani.\nUna pregunta necesita una respuesta que trate del mismo tema.",
                'orden_tema' => 1 + (int) Tema::where('id_unidad', $unit->id_unidad)->max('orden_tema'), 'publicado' => true]);
            $bank = [
                ['time' => 'manana', 'answer' => 'puncha', 'choices' => ['chishi', 'puncha', 'tuta'], 'meaning' => 'buenos días', 'alt' => 'Amanecer en un pueblo andino: el sol aparece junto al horizonte y las nubes tienen tonos rosados.'],
                ['time' => 'tarde', 'answer' => 'chishi', 'choices' => ['chishi', 'tuta', 'puncha'], 'meaning' => 'buenas tardes', 'alt' => 'Un pueblo andino por la tarde, con cielo azul y el sol alto iluminando el paisaje.'],
                ['time' => 'noche', 'answer' => 'tuta', 'choices' => ['puncha', 'chishi', 'tuta'], 'meaning' => 'buenas noches', 'alt' => 'Un pueblo andino bajo un cielo oscuro con luna y estrellas y una ventana iluminada.'],
            ];
            $order = (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            foreach ($bank as $item) {
                $exercise = ['type' => 'seleccion_multiple', 'prompt' => 'Observa la imagen. Elige el saludo en kichwa que corresponde al momento del día.',
                    'resource' => null, 'zones' => [],
                    'elements' => array_map(fn (string $word): array => ['id' => $word, 'texto' => 'Alli '.$word], $item['choices']),
                    'solution' => ['seleccion' => [$item['answer']]],
                    'config' => ['title' => '¿Qué saludo corresponde?', 'prompt_image' => $images[$item['time']], 'prompt_image_alt' => $item['alt'],
                        'presentation' => 'buttons', 'max_selections' => 1, 'exact_selections' => true, 'managed' => true, 'reviewed' => true, 'difficulty' => 'inicial',
                        'correct_feedback' => 'Alli rurashka. Alli '.$item['answer'].' significa '.$item['meaning'].'.',
                        'incorrect_feedback' => 'Kutin rurapay. Observa la luz del cielo y vuelve a elegir el saludo.']];
                EstadoContenido::assertReady($exercise);
                $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
                $record->id_unidad = $unit->id_unidad;
                $record->origen_reactivo = 'u2-guided-saludo-'.$item['time'].'-v1';
                $record->orden_actividad = ++$order;
                $record->publicado = true;
                $record->save();
            }
            $unit->update(['titulo_unidad' => 'Saludos y conversación', 'objetivo_unidad' => 'Saludar según el momento del día y conversar en kichwa.',
                'publicado' => true, 'configuracion' => array_replace($unit->configuracion ?? [], ['learning_mode' => 'guided', 'guided_lesson' => 'greetings'])]);
        });
        $this->refreshIllustrations($images);
        PublicacionContenido::invalidate();
    }

    private function refreshIllustrations(array $images): void
    {
        DB::transaction(function () use ($images): void {
            DB::select('SELECT pg_advisory_xact_lock(20261011)');
            $lesson = Tema::where('clave_leccion', self::LESSON_KEY)->firstOrFail();
            $unit = Unidad::whereKey($lesson->id_unidad)->lockForUpdate()->firstOrFail();
            $scenes = [
                'manana' => ['time' => '08:00', 'alt' => 'Mañana en los Andes: cielo azul claro, sol brillante y neblina fresca en el valle.'],
                'tarde' => ['time' => '17:30', 'alt' => 'Tarde en los Andes: cielo naranja y dorado con el sol bajo y sombras alargadas.'],
                'noche' => ['time' => '21:00', 'alt' => 'Noche en los Andes: cielo oscuro con luna y estrellas y una ventana iluminada.'],
            ];
            foreach ($scenes as $scene => $details) {
                $record = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u2-guided-saludo-'.$scene.'-v1')->orderByDesc('id_actividad')->lockForUpdate()->firstOrFail();
                $config = array_replace($record->configuracion, ['prompt_image' => $images[$scene], 'prompt_image_alt' => $details['alt'], 'context_text' => $details['time']]);
                if ($record->configuracion === $config) {
                    continue;
                }
                if (DB::table('respuestas_actividad')->where('id_actividad', $record->id_actividad)->exists()) {
                    $replacement = $record->replicate();
                    $position = $record->orden_actividad;
                    $record->update(['publicado' => false, 'orden_actividad' => 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad')]);
                    $replacement->configuracion = $config;
                    $replacement->orden_actividad = $position;
                    $replacement->save();
                } else {
                    $record->update(['configuracion' => $config]);
                }
            }
        });
    }

    private function imagePath(string $time): string
    {
        $source = resource_path('images/unidad2/'.$time.($time === 'noche' ? '' : '-v2').'.png');
        $path = 'kichwa/imagenes/'.hash('sha256', hash_file('sha256', $source).':webp-480-q78-v2').'.webp';
        if (! Storage::disk('public')->exists($path)) {
            $image = imagecreatefrompng($source);
            $small = imagescale($image, 480);
            ob_start();
            imagewebp($small, null, 78);
            $bytes = ob_get_clean();
            imagedestroy($image);
            imagedestroy($small);
            if (! Storage::disk('public')->put($path, $bytes)) {
                throw new \RuntimeException('No se pudo guardar la ilustración de '.$time.'.');
            }
        }

        return $path;
    }
}
