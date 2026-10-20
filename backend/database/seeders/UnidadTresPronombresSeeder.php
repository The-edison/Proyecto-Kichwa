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
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261019)');
            $topic = Tema::where('clave_leccion', 'basico-modulo1-unidad3-pronouns-v1')->firstOrFail();
            $unit = Unidad::whereKey($topic->id_unidad)->lockForUpdate()->firstOrFail();
            if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u3-pronouns-persons-v3')->exists()) {
                return;
            }
            $image = $this->imagePath();
            Actividad::where('id_unidad', $unit->id_unidad)->update(['publicado' => false]);
            $order = (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            foreach ($this->exercises($image) as $exercise) {
                $origin = $exercise['origin'];
                unset($exercise['origin']);
                $exercise['config'] += ['managed' => true, 'reviewed' => true, 'difficulty' => 'inicial'];
                EstadoContenido::assertReady($exercise);
                $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
                $record->id_unidad = $unit->id_unidad;
                $record->origen_reactivo = $origin;
                $record->orden_actividad = ++$order;
                $record->publicado = true;
                $record->save();
            }
        });
        PublicacionContenido::invalidate();
    }

    private function exercises(string $image): array
    {
        $singular = ['Ñuka', 'Kan', 'Pay'];
        $plural = ['Ñukanchik', 'Kankuna', 'Paykuna'];
        $meanings = ['Yo como', 'Tú juegas', 'Él duerme'];
        $rows = [
            'persons' => [
                ['yo', 'Yo', $singular, 'Ñuka'],
                ['tu', 'Tú', $singular, 'Kan'],
                ['el', 'Él', $singular, 'Pay'],
            ],
            'groups' => [
                ['nosotros', 'Nosotros', $plural, 'Ñukanchik'],
                ['ustedes', 'Ustedes', $plural, 'Kankuna'],
                ['ellos', 'Ellos', $plural, 'Paykuna'],
            ],
            'listening' => [
                ['audio1', 'Audio 1', $meanings, 'Yo como'],
                ['audio2', 'Audio 2', $meanings, 'Tú juegas'],
                ['audio3', 'Audio 3', $meanings, 'Él duerme'],
            ],
            'complete' => [
                ['trabajamos', 'Nosotros trabajamos · _____ llankanchik', ['Paykuna', 'Ñukanchik', 'Kankuna'], 'Ñukanchik'],
                ['no-trabajan', 'Ustedes no trabajan · _____ mana llankankichik', ['Paykuna', 'Ñukanchik', 'Kankuna'], 'Kankuna'],
                ['vigilan', 'Ellos vigilan · _____ chapankuna', ['Paykuna', 'Ñukanchik', 'Kankuna'], 'Paykuna'],
            ],
            'order' => [
                ['comer', 'Yo como', ['mikuni', 'Ñuka'], 'Ñuka mikuni'],
                ['no-trabajan', 'Ustedes no trabajan', ['llankankichik', 'Kankuna', 'mana'], 'Kankuna mana llankankichik'],
                ['vigilan', 'Ellos vigilan', ['chapankuna', 'Paykuna'], 'Paykuna chapankuna'],
            ],
            'listening-pronouns' => [
                ['audio1', 'Audio 1', $singular, 'Ñuka'],
                ['audio2', 'Audio 2', $singular, 'Kan'],
                ['audio3', 'Audio 3', $singular, 'Pay'],
            ],
        ];
        $titles = ['persons' => 'Reconoce quién habla', 'groups' => 'Distingue los grupos',
            'listening' => 'Escucha la oración', 'complete' => 'Completa el pronombre',
            'order' => 'Construye las oraciones', 'listening-pronouns' => 'Escucha y elige el pronombre'];
        $prompts = ['persons' => 'Observa y elige el pronombre en kichwa.', 'groups' => 'Observa a quién se refiere cada grupo.',
            'listening' => 'Escucha y selecciona el significado.', 'complete' => 'Selecciona el pronombre que falta.',
            'order' => 'Toca las palabras en el orden correcto.', 'listening-pronouns' => 'Escucha e identifica quién realiza la acción.'];
        $bank = [];
        foreach ($rows as $activity => $items) {
            $elements = [];
            $solutions = [];
            foreach ($items as [$id, $text, $options, $solution]) {
                $element = ['id' => $id, 'texto' => $text, 'opciones' => $options];
                if (! str_starts_with($activity, 'listening')) {
                    $element['imagen'] = $image;
                }
                $elements[] = $element;
                $solutions[$id] = [$solution];
            }
            $bank[] = ['origin' => 'u3-pronouns-'.$activity.'-v3', 'type' => 'completar',
                'prompt' => $prompts[$activity], 'elements' => $elements, 'zones' => [], 'resource' => null,
                'solution' => ['textos' => $solutions],
                'config' => ['title' => $titles[$activity], 'pronouns_activity' => $activity,
                    'correct_feedback' => '¡Muy bien! Completaste las tres respuestas de este ejercicio.',
                    'incorrect_feedback' => 'Revisa las tres respuestas y vuelve a intentarlo. Puedes cambiar tus elecciones.']];
        }

        return $bank;
    }

    private function imagePath(): string
    {
        $source = resource_path('images/unidad3/escenas-v3.png');
        $path = 'kichwa/imagenes/'.hash('sha256', hash_file('sha256', $source).':webp1536-q88').'.webp';
        if (! Storage::disk('public')->exists($path)) {
            $image = imagecreatefrompng($source);
            $small = imagescale($image, 1536);
            ob_start();
            imagewebp($small, null, 88);
            $bytes = ob_get_clean();
            imagedestroy($image);
            imagedestroy($small);
            if (! Storage::disk('public')->put($path, $bytes)) {
                throw new \RuntimeException('No se pudieron guardar las ilustraciones de pronombres.');
            }
        }

        return $path;
    }
}
