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

class ModuloDosCuerpoSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261024)');
            $topic = Tema::where('clave_leccion', 'basico-modulo2-unidad2-body-v1')->firstOrFail();
            $unit = Unidad::whereKey($topic->id_unidad)->lockForUpdate()->firstOrFail();
            if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'm2-u2-body-locate-v1')->exists()) {
                return;
            }
            $images = ['map' => $this->image('cuerpo-mapa-v1'), 'details' => $this->image('cuerpo-detalles-v1')];
            Actividad::where('id_unidad', $unit->id_unidad)->update(['publicado' => false]);
            $order = (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            foreach ($this->bank() as [$activity, $panel, $title, $prompt, $rows]) {
                $elements = [];
                $solutions = [];
                foreach ($rows as [$id, $text, $options, $solution]) {
                    $elements[] = ['id' => $id, 'texto' => $text, 'opciones' => $options, 'imagen' => $images[$activity === 'locate' ? 'map' : 'details']];
                    $solutions[$id] = [$solution];
                }
                $exercise = ['type' => 'completar', 'prompt' => $prompt, 'elements' => $elements, 'zones' => [], 'resource' => null,
                    'solution' => ['textos' => $solutions], 'config' => ['managed' => true, 'reviewed' => true, 'difficulty' => 'inicial',
                        'body_activity' => $activity, 'body_panel' => $panel, 'title' => $title,
                        'correct_feedback' => '¡Muy bien! Reconociste las partes del cuerpo.',
                        'incorrect_feedback' => 'Revisa las respuestas marcadas y vuelve a comprobar.']];
                EstadoContenido::assertReady($exercise);
                $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
                $record->id_unidad = $unit->id_unidad;
                $record->origen_reactivo = 'm2-u2-body-'.$activity.'-v1';
                $record->orden_actividad = ++$order;
                $record->publicado = true;
                $record->save();
            }
        });
        PublicacionContenido::invalidate();
    }

    private function image(string $name): string
    {
        $source = resource_path('images/modulo2/'.$name.'.png');
        $path = 'kichwa/imagenes/'.hash('sha256', hash_file('sha256', $source).':body-webp-v1').'.webp';
        if (! Storage::disk('public')->exists($path)) {
            $image = imagecreatefrompng($source);
            ob_start();
            imagewebp($image, null, 90);
            $bytes = ob_get_clean();
            imagedestroy($image);
            if (! Storage::disk('public')->put($path, $bytes)) {
                throw new \RuntimeException('No se pudieron guardar las imágenes del cuerpo.');
            }
        }

        return $path;
    }

    private function bank(): array
    {
        $body = ['Washa', 'Maki', 'Uma', 'Sillu', 'Chaki', 'Kunka', 'Wiksa', 'Ruka', 'Kunkuri', 'Rikra'];
        $details = ['Hallu', 'Ñawi', 'Chaki washa', 'Kiru', 'Rinri', 'Shimi'];
        $zones = ['Washa', 'Kunkuri', 'Wiksa'];
        $meanings = ['A mí me duele la cabeza', 'Mi papá tiene mucha barriga', 'Me duele el pie', 'Me duele la garganta'];

        return [
            ['locate', 1, 'Ubica las partes del cuerpo', 'Arrastra cada palabra hasta su zona. También puedes tocar una palabra y después una zona.', [
                ['b-uma', 'Zona 1', $body, 'Uma'], ['b-kunka', 'Zona 2', $body, 'Kunka'],
                ['b-rikra', 'Zona 3', $body, 'Rikra'], ['b-maki', 'Zona 4', $body, 'Maki'],
                ['b-wiksa', 'Zona 5', $body, 'Wiksa'], ['b-kunkuri', 'Zona 6', $body, 'Kunkuri'],
                ['b-chaki', 'Zona 7', $body, 'Chaki'], ['b-washa', 'Zona 8', $body, 'Washa'],
                ['b-ruka', 'Zona 9', $body, 'Ruka'], ['b-sillu', 'Zona 10', $body, 'Sillu']]],
            ['details', 2, 'Identifica los detalles', 'Arrastra cada etiqueta a su imagen. También puedes tocar la palabra y después su imagen.', [
                ['b-nawi', 'Imagen 1', $details, 'Ñawi'], ['b-rinri', 'Imagen 2', $details, 'Rinri'],
                ['b-shimi', 'Imagen 3', $details, 'Shimi'], ['b-kiru', 'Imagen 4', $details, 'Kiru'],
                ['b-hallu', 'Imagen 5', $details, 'Hallu'], ['b-chaki-washa', 'Imagen 6', $details, 'Chaki washa']]],
            ['recognize', 2, 'Reconoce la zona señalada', 'Observa la parte resaltada y selecciona su nombre en kichwa.', [
                ['b-kunkuri', 'Zona 1', $zones, 'Kunkuri'], ['b-wiksa', 'Zona 2', $zones, 'Wiksa'], ['b-washa', 'Zona 3', $zones, 'Washa']]],
            ['listen', 3, 'Escucha y escribe', 'Escucha la palabra y escríbela en kichwa. Puedes repetir cada audio.', [
                ['b-audio-1', 'Audio 1', [], 'rinri'], ['b-audio-2', 'Audio 2', [], 'maki'], ['b-audio-3', 'Audio 3', [], 'chaki washa']]],
            ['understand', 3, 'Comprende las oraciones', 'Lee o escucha la oración y selecciona su significado.', [
                ['b-sentence-head', 'Ñukatami umata nanan', $meanings, $meanings[0]],
                ['b-sentence-belly', 'Ñuka yayaka wiksa sapami', $meanings, $meanings[1]],
                ['b-sentence-foot', 'Chakitami nanan', $meanings, $meanings[2]],
                ['b-sentence-throat', 'Kunkatami nanan', $meanings, $meanings[3]]]],
            ['order', 4, 'Construye las oraciones', 'Toca las palabras en el orden correcto. Puedes quitar una palabra o reiniciar la fila.', [
                ['b-sentence-head', $meanings[0], ['nanan', 'Ñukatami', 'umata'], 'Ñukatami umata nanan'],
                ['b-sentence-belly', $meanings[1], ['sapami', 'Ñuka', 'wiksa', 'yayaka'], 'Ñuka yayaka wiksa sapami'],
                ['b-sentence-foot', $meanings[2], ['nanan', 'Chakitami'], 'Chakitami nanan'],
                ['b-sentence-throat', $meanings[3], ['nanan', 'Kunkatami'], 'Kunkatami nanan']]],
        ];
    }
}
