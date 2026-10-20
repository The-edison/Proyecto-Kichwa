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

class UnidadTresPronombresSeeder extends Seeder
{
    public function run(): void
    {
        $images = [];
        foreach (['yo', 'tu', 'nosotros', 'ellos'] as $name) {
            $images[$name] = $this->imagePath($name);
        }
        DB::transaction(function () use ($images): void {
            DB::select('SELECT pg_advisory_xact_lock(20261019)');
            $topic = Tema::where('clave_leccion', 'basico-modulo1-unidad3-pronouns-v1')->firstOrFail();
            $unit = Unidad::whereKey($topic->id_unidad)->lockForUpdate()->firstOrFail();
            if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u3-pronouns-six-pairs-v2')->exists()) {
                return;
            }
            $pronouns = ['nuka' => 'ñuka', 'kan' => 'kan', 'pay' => 'pay', 'nukanchik' => 'ñukanchik', 'kankuna' => 'kankuna', 'paykuna' => 'paykuna'];
            $meanings = ['nuka' => 'Yo', 'kan' => 'Tú', 'pay' => 'Él / ella', 'nukanchik' => 'Nosotros', 'kankuna' => 'Ustedes', 'paykuna' => 'Ellos / ellas'];
            $elements = [];
            $pairs = [];
            foreach ($meanings as $id => $text) {
                $elements[] = ['id' => 'es-'.$id, 'texto' => $text, 'grupo' => 'origen'];
                $pairs[] = ['origen' => 'es-'.$id, 'destino' => $id];
            }
            foreach (['paykuna', 'nuka', 'nukanchik', 'kan', 'pay', 'kankuna'] as $id) {
                $elements[] = ['id' => $id, 'texto' => $pronouns[$id], 'grupo' => 'destino'];
            }
            $bank = [['origin' => 'u3-pronouns-six-pairs-v2', 'type' => 'relacionar', 'prompt' => 'Selecciona cada pronombre en español y su pareja en kichwa. Completa las seis parejas.',
                'elements' => $elements, 'zones' => [], 'resource' => null, 'solution' => ['pares' => $pairs],
                'config' => ['title' => 'Una persona o un grupo', 'correct_feedback' => '¡Muy bien! Reconociste los seis pronombres personales.',
                    'incorrect_feedback' => 'Revisa quién habla, a quién se dirige y si se trata de una persona o un grupo.']]];
            $scenes = [
                ['name' => 'yo', 'answer' => 'nuka', 'choices' => ['kan', 'nuka', 'pay', 'nukanchik'],
                    'context' => 'Elige el pronombre para la persona que habla de sí misma.',
                    'alt' => 'Una mujer con suéter naranja habla mientras apoya su mano en su propio pecho.', 'meaning' => 'yo'],
                ['name' => 'tu', 'answer' => 'kan', 'choices' => ['pay', 'kankuna', 'kan', 'nuka'],
                    'context' => 'Elige el pronombre para la persona a quien se dirige la hablante.',
                    'alt' => 'La mujer de naranja habla con un joven de verde y dirige su mano hacia él.', 'meaning' => 'tú'],
                ['name' => 'nosotros', 'answer' => 'nukanchik', 'choices' => ['paykuna', 'nukanchik', 'kankuna', 'pay'],
                    'context' => 'La hablante se incluye en el grupo. Elige el pronombre para ese grupo.',
                    'alt' => 'Tres amigas juntas. La mujer de naranja del centro habla y se señala, incluida en el grupo.', 'meaning' => 'nosotros'],
                ['name' => 'ellos', 'answer' => 'paykuna', 'choices' => ['nukanchik', 'pay', 'paykuna', 'kankuna'],
                    'context' => 'La hablante habla de otro grupo, sin incluirse ni dirigirse a él.',
                    'alt' => 'La mujer de naranja señala a tres jóvenes que forman un grupo separado de ella.', 'meaning' => 'ellos o ellas'],
            ];
            foreach ($scenes as $scene) {
                $bank[] = ['origin' => 'u3-pronouns-image-'.$scene['name'].'-v2', 'type' => 'seleccion_multiple',
                    'prompt' => 'Observa quién habla y a quién señala. Selecciona el pronombre correcto en kichwa.',
                    'elements' => array_map(fn (string $id): array => ['id' => $id, 'texto' => $pronouns[$id]], $scene['choices']),
                    'zones' => [], 'resource' => null, 'solution' => ['seleccion' => [$scene['answer']]],
                    'config' => ['title' => '¿Qué pronombre corresponde?', 'prompt_image' => $images[$scene['name']], 'prompt_image_alt' => $scene['alt'],
                        'context_text' => $scene['context'], 'presentation' => 'buttons', 'max_selections' => 1, 'exact_selections' => true,
                        'correct_feedback' => '¡Muy bien! '.$pronouns[$scene['answer']].' significa '.$scene['meaning'].'.',
                        'incorrect_feedback' => 'Observa de nuevo quién habla y si señala a una persona o a un grupo.']];
            }
            Actividad::where('id_unidad', $unit->id_unidad)->update(['publicado' => false]);
            $order = (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            foreach ($bank as $exercise) {
                $exercise['config'] += ['managed' => true, 'reviewed' => true, 'difficulty' => 'inicial'];
                EstadoContenido::assertReady($exercise);
                $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
                $record->id_unidad = $unit->id_unidad;
                $record->origen_reactivo = $exercise['origin'];
                $record->orden_actividad = ++$order;
                $record->publicado = true;
                $record->save();
            }
        });
        PublicacionContenido::invalidate();
    }

    private function imagePath(string $name): string
    {
        $source = resource_path('images/unidad3/'.$name.'.png');
        $path = 'kichwa/imagenes/'.hash('sha256', hash_file('sha256', $source).':webp640-q84').'.webp';
        if (! Storage::disk('public')->exists($path)) {
            $image = imagecreatefrompng($source);
            $small = imagescale($image, 640);
            ob_start();
            imagewebp($small, null, 84);
            $bytes = ob_get_clean();
            imagedestroy($image);
            imagedestroy($small);
            if (! Storage::disk('public')->put($path, $bytes)) {
                throw new \RuntimeException('No se pudo guardar la ilustración de '.$name.'.');
            }
        }

        return $path;
    }
}
