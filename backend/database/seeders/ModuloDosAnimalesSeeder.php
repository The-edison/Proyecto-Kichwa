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

class ModuloDosAnimalesSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261022)');
            $topic = Tema::where('clave_leccion', 'basico-modulo2-unidad1-animals-colors-v1')->firstOrFail();
            $unit = Unidad::whereKey($topic->id_unidad)->lockForUpdate()->firstOrFail();
            Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'm2-u1-wild-write-v1')
                ->where('publicado', true)->update(['publicado' => false]);
            if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'm2-u1-domestic-understand-complete-v1')->exists()) {
                return;
            }
            $images = ['domestic' => $this->image('domesticos-v1'), 'wild' => $this->image('salvajes-v1')];
            Actividad::where('id_unidad', $unit->id_unidad)->whereNull('configuracion->color_activity')->update(['publicado' => false]);
            $order = (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            foreach ($this->bank() as [$group, $activity, $title, $prompt, $rows]) {
                $origin = 'm2-u1-'.$group.'-'.$activity.'-v1';
                $existing = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)->first();
                if ($existing) {
                    $existing->update(['publicado' => true, 'orden_actividad' => ++$order]);

                    continue;
                }
                $elements = [];
                $solutions = [];
                foreach ($rows as [$id, $text, $options, $solution]) {
                    $elements[] = ['id' => $id, 'texto' => $text, 'opciones' => $options, 'imagen' => $images[$group]];
                    $solutions[$id] = [$solution];
                }
                $exercise = ['type' => 'completar', 'prompt' => $prompt, 'elements' => $elements, 'zones' => [], 'resource' => null,
                    'solution' => ['textos' => $solutions], 'config' => ['managed' => true, 'reviewed' => true, 'difficulty' => 'inicial',
                        'animal_group' => $group, 'animal_activity' => $activity, 'title' => $title,
                        'correct_feedback' => '¡Muy bien! Completaste correctamente este panel.',
                        'incorrect_feedback' => 'Revisa las respuestas marcadas y vuelve a comprobar.']];
                EstadoContenido::assertReady($exercise);
                $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
                $record->id_unidad = $unit->id_unidad;
                $record->origen_reactivo = $origin;
                $record->orden_actividad = ++$order;
                $record->publicado = true;
                $record->save();
            }
            foreach (Actividad::where('id_unidad', $unit->id_unidad)->where('publicado', true)->whereNotNull('configuracion->color_activity')->orderBy('orden_actividad')->get() as $colorExercise) {
                $colorExercise->update(['orden_actividad' => ++$order]);
            }
        });
        PublicacionContenido::invalidate();
    }

    private function image(string $name): string
    {
        $source = resource_path('images/modulo2/'.$name.'.png');
        $path = 'kichwa/imagenes/'.hash('sha256', hash_file('sha256', $source).':animals-webp-v1').'.webp';
        if (! Storage::disk('public')->exists($path)) {
            $image = imagecreatefrompng($source);
            ob_start();
            imagewebp($image, null, 90);
            $bytes = ob_get_clean();
            imagedestroy($image);
            if (! Storage::disk('public')->put($path, $bytes)) {
                throw new \RuntimeException('No se pudieron guardar las ilustraciones de animales.');
            }
        }

        return $path;
    }

    private function bank(): array
    {
        $domestic = ['Allku', 'Misi', 'Atalpa', 'Llama', 'Kuy', 'Wakra'];
        $wild = ['Urpi', 'Chukuri', 'Taruka', 'Chucha', 'Yutu', 'Ukucha'];
        $meanings = ['Mi mamá tiene un perro', 'Yo me compré un hermoso gato', 'José compró una oveja'];
        $missing = ['misita', 'llamatami', 'allkutami'];

        return [
            ['domestic', 'identify', 'Identifica al animal', 'Observa y selecciona su nombre en kichwa.', [
                ['d-dog', 'Animal 1', $domestic, 'Allku'], ['d-cat', 'Animal 2', $domestic, 'Misi'],
                ['d-hen', 'Animal 3', $domestic, 'Atalpa'], ['d-sheep', 'Animal 4', $domestic, 'Llama'],
                ['d-cuy', 'Animal 5', $domestic, 'Kuy'], ['d-cow', 'Animal 6', $domestic, 'Wakra']]],
            ['domestic', 'listen', 'Escucha y reconoce', 'Escucha la palabra y elige el animal. Puedes repetir cada audio.', [
                ['d-audio-1', 'Audio 1', ['Cerdo', 'Conejo', 'Caballo', 'Burro'], 'Cerdo'],
                ['d-audio-2', 'Audio 2', ['Cerdo', 'Conejo', 'Caballo', 'Burro'], 'Conejo'],
                ['d-audio-3', 'Audio 3', ['Cerdo', 'Conejo', 'Caballo', 'Burro'], 'Caballo'],
                ['d-audio-4', 'Audio 4', ['Cerdo', 'Conejo', 'Caballo', 'Burro'], 'Burro']]],
            ['domestic', 'understand-complete', 'Escucha, comprende y completa', 'Escucha cada oración. Elige su significado y la palabra que falta en kichwa.', [
                ['d-sentence-1', 'Ñuka mamaka shuk allkutami charin', $meanings, $meanings[0]],
                ['d-mama', 'Ñuka mamaka shuk _____ charin', $missing, 'allkutami'],
                ['d-sentence-2', 'Ñukami shuk sumak misita rantirkani', $meanings, $meanings[1]],
                ['d-boy', 'Ñukami shuk sumak _____ rantirkani', $missing, 'misita'],
                ['d-sentence-3', 'Joseka shuk llamatami rantirka', $meanings, $meanings[2]],
                ['d-jose', 'Joseka shuk _____ rantirka', $missing, 'llamatami']]],
            ['domestic', 'order', 'Construye las oraciones', 'Toca las palabras en el orden correcto. Puedes quitar una palabra o reiniciar la fila.', [
                ['d-mama', $meanings[0], ['charin', 'Ñuka', 'allkutami', 'mamaka', 'shuk'], 'Ñuka mamaka shuk allkutami charin'],
                ['d-boy', $meanings[1], ['misita', 'rantirkani', 'Ñukami', 'sumak', 'shuk'], 'Ñukami shuk sumak misita rantirkani'],
                ['d-jose', $meanings[2], ['llamatami', 'Joseka', 'rantirka', 'shuk'], 'Joseka shuk llamatami rantirka']]],
            ['wild', 'identify', 'Reconoce al animal', 'Observa y elige su nombre en kichwa.', [
                ['w-deer', 'Animal 1', $wild, 'Taruka'], ['w-mouse', 'Animal 2', $wild, 'Ukucha'],
                ['w-partridge', 'Animal 3', $wild, 'Yutu'], ['w-dove', 'Animal 4', $wild, 'Urpi'],
                ['w-weasel', 'Animal 5', $wild, 'Chukuri'], ['w-opossum', 'Animal 6', $wild, 'Chucha']]],
            ['wild', 'listen', 'Escucha y selecciona', 'Escucha la palabra y elige el animal. Puedes repetir cada audio.', [
                ['w-audio-1', 'Audio 1', ['Mariposa', 'Rana', 'Colibrí'], 'Mariposa'],
                ['w-audio-2', 'Audio 2', ['Mariposa', 'Rana', 'Colibrí'], 'Rana'],
                ['w-audio-3', 'Audio 3', ['Mariposa', 'Rana', 'Colibrí'], 'Colibrí']]],
            ['wild', 'labels', 'Coloca las etiquetas', 'Arrastra cada nombre a su imagen. También puedes tocar un nombre y después su imagen.', [
                ['w-beetle', 'Escarabajo', ['Ullawanta', 'Katsu', 'Kushulli'], 'Katsu'],
                ['w-monkey', 'Mono', ['Ullawanta', 'Katsu', 'Kushulli'], 'Kushulli'],
                ['w-vulture', 'Gallinazo', ['Ullawanta', 'Katsu', 'Kushulli'], 'Ullawanta']]],
            ['wild', 'order', 'Construye las oraciones', 'Ordena las palabras según su significado.', [
                ['w-wolf', 'Ayer vi un lobo.', ['rikurkani', 'shuk', 'Kayna', 'Atukta', 'punchami'], 'Kayna punchami shuk Atukta rikurkani'],
                ['w-chimborazo', 'En el Chimborazo hay muchos venados.', ['Tarukakuna', 'tyan', 'Chimborazopimi', 'ashka'], 'Chimborazopimi ashka Tarukakuna tyan'],
                ['w-cotopaxi', 'En el Cotopaxi hay muchos gavilanes.', ['tyan', 'Ankakuna', 'ashka', 'Cotopaxipimi'], 'Cotopaxipimi ashka Ankakuna tyan']]],
        ];
    }
}
