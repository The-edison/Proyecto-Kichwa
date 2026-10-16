<?php

namespace Database\Seeders;

use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\Modulo;
use App\Models\Tema;
use App\Models\Unidad;
use App\Services\EstadoContenido;
use App\Services\KichwaResource;
use App\Services\PublicacionContenido;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class UnidadUnoGuiadaSeeder extends Seeder
{
    public const LESSON_KEY = 'basico-modulo1-unidad1-guiada-v3';

    public function run(): void
    {
        $this->call(UnidadUnoSeeder::class);
        $source = resource_path('images/unidad1/casa-andina-v3.png');
        $imagePath = 'kichwa/imagenes/'.hash_file('sha256', $source).'.webp';
        if (! Storage::disk('public')->exists($imagePath)) {
            $image = imagecreatefrompng($source);
            $small = imagescale($image, 640);
            ob_start();
            imagewebp($small, null, 88);
            $bytes = ob_get_clean();
            imagedestroy($image);
            imagedestroy($small);
            if (! Storage::disk('public')->put($imagePath, $bytes)) {
                throw new \RuntimeException('No se pudo guardar la ilustración de la casa andina.');
            }
        }
        DB::transaction(function () use ($imagePath): void {
            DB::select('SELECT pg_advisory_xact_lock(20261011)');
            if (Tema::where('clave_leccion', self::LESSON_KEY)->exists()) {
                return;
            }
            $previous = Tema::where('clave_leccion', 'basico-modulo1-unidad1-leccion1')->firstOrFail();
            $unit = Unidad::whereKey($previous->id_unidad)->lockForUpdate()->firstOrFail();
            Actividad::where('id_unidad', $unit->id_unidad)->update(['publicado' => false]);
            EvaluacionKichwa::where('id_unidad', $unit->id_unidad)->update(['publicado' => false]);
            Tema::where('id_unidad', $unit->id_unidad)->update(['publicado' => false]);
            Tema::create(['id_unidad' => $unit->id_unidad, 'clave_leccion' => self::LESSON_KEY, 'tipo_tema' => 'vocabulario',
                'titulo_tema' => 'La escritura del kichwa',
                'contenido_tema' => "En las palabras de esta unidad usarás las vocales a, i y u.\n\na, i, u. Ejemplo: wasi = casa. En esta palabra aparecen a, i.\n\nch, h, k, l, ll, m, n, ñ, p, r, s, sh, t, w, y. Ch, ll y sh se escriben con dos letras. También verás ts en tsalik y tsuntsu.\n\nsisa = flor · llama = oveja · wasi = casa · shunku = corazón · purina = caminar.\n\nSi escuchas «sisa» y ves s_sa, escribe i. Lee la palabra completa después de responder.",
                'orden_tema' => 1 + (int) Tema::where('id_unidad', $unit->id_unidad)->max('orden_tema'), 'publicado' => true]);
            $bank = [
                ['type' => 'seleccion_multiple', 'prompt' => 'Observa la imagen. Selecciona su nombre en kichwa.',
                    'elements' => [['id' => 'shunku', 'texto' => 'shunku'], ['id' => 'sisa', 'texto' => 'sisa'], ['id' => 'wasi', 'texto' => 'wasi'], ['id' => 'llama', 'texto' => 'llama']],
                    'solution' => ['seleccion' => ['wasi']], 'resource' => null,
                    'config' => ['title' => '¿Qué palabra corresponde?', 'prompt_image' => $imagePath, 'presentation' => 'buttons', 'max_selections' => 1, 'exact_selections' => true,
                        'correct_feedback' => '¡Muy bien! Wasi significa casa.', 'incorrect_feedback' => 'Observa la casa y vuelve a intentarlo.']],
                ['type' => 'relacionar', 'prompt' => 'Selecciona una palabra en español y luego su pareja en kichwa.',
                    'elements' => [
                        ['id' => 'flor', 'texto' => 'Flor', 'grupo' => 'origen'], ['id' => 'oveja', 'texto' => 'Oveja', 'grupo' => 'origen'],
                        ['id' => 'corazon', 'texto' => 'Corazón', 'grupo' => 'origen'], ['id' => 'caminar', 'texto' => 'Caminar', 'grupo' => 'origen'],
                        ['id' => 'purina', 'texto' => 'purina', 'grupo' => 'destino'], ['id' => 'shunku', 'texto' => 'shunku', 'grupo' => 'destino'],
                        ['id' => 'sisa', 'texto' => 'sisa', 'grupo' => 'destino'], ['id' => 'llama', 'texto' => 'llama', 'grupo' => 'destino']],
                    'solution' => ['pares' => [['origen' => 'flor', 'destino' => 'sisa'], ['origen' => 'oveja', 'destino' => 'llama'], ['origen' => 'corazon', 'destino' => 'shunku'], ['origen' => 'caminar', 'destino' => 'purina']]],
                    'resource' => null, 'config' => ['title' => 'Palabras en dos idiomas', 'correct_feedback' => '¡Excelente! Relacionaste las cuatro palabras correctamente.', 'incorrect_feedback' => 'Hay parejas por revisar. Cambia las que necesites y comprueba de nuevo.']],
            ];
            foreach ($bank as $index => $exercise) {
                $exercise['zones'] = [];
                $exercise['config'] += ['managed' => true, 'reviewed' => true, 'difficulty' => 'inicial'];
                EstadoContenido::assertReady($exercise);
                $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
                $record->id_unidad = $unit->id_unidad;
                $record->origen_reactivo = 'u1-guided-v3-'.($index + 1);
                $record->orden_actividad = 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
                $record->publicado = true;
                $record->save();
            }
            $unit->update(['publicado' => true, 'configuracion' => array_replace($unit->configuracion ?? [], ['learning_mode' => 'guided'])]);
            Modulo::whereKey($unit->id_modulo)->update(['publicado' => true]);
        });
        PublicacionContenido::invalidate();
        $this->call(UnidadUnoImagenesSeeder::class);
        $this->call(UnidadUnoAudioSeeder::class);
    }
}
