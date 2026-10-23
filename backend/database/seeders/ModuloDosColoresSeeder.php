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

class ModuloDosColoresSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261023)');
            $topic = Tema::where('clave_leccion', 'basico-modulo2-unidad1-animals-colors-v1')->firstOrFail();
            $unit = Unidad::whereKey($topic->id_unidad)->lockForUpdate()->firstOrFail();
            $order = (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            foreach ($this->bank() as [$activity, $panel, $title, $prompt, $rows]) {
                $origin = 'm2-u1-colors-'.$activity.'-v1';
                if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)->exists()) {
                    continue;
                }
                $elements = [];
                $solutions = [];
                foreach ($rows as [$id, $text, $options, $solution]) {
                    $elements[] = ['id' => $id, 'texto' => $text, 'opciones' => $options];
                    $solutions[$id] = [$solution];
                }
                $exercise = ['type' => 'completar', 'prompt' => $prompt, 'elements' => $elements, 'zones' => [], 'resource' => null,
                    'solution' => ['textos' => $solutions], 'config' => ['managed' => true, 'reviewed' => true, 'difficulty' => 'inicial',
                        'color_activity' => $activity, 'color_panel' => $panel, 'title' => $title,
                        'correct_feedback' => '¡Muy bien! Completaste este ejercicio de colores.',
                        'incorrect_feedback' => 'Revisa las respuestas marcadas y vuelve a comprobar.']];
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

    private function bank(): array
    {
        $colors = ['yurak', 'yana', 'puka', 'killu', 'ankas', 'waylla', 'paku', 'maywa', 'kishpu', 'waminsi', 'suku'];
        $meanings = ['Su pantalón es negro', 'Mi sombrero es blanco', 'Mi gato es negro'];
        $otherMeanings = ['Sus zapatos son azules', 'Su reboso es rojo', 'Su collar es amarillo'];

        return [
            ['apply', 1, 'Aplica el color', 'Elige una muestra y toca el objeto para pintarlo del color indicado en kichwa.', [
                ['c-cup', 'Puka', ['ankas', 'waylla', 'puka', 'killu', 'yurak', 'yana'], 'puka'],
                ['c-notebook', 'Killu', ['ankas', 'waylla', 'puka', 'killu', 'yurak', 'yana'], 'killu'],
                ['c-bag', 'Ankas', ['ankas', 'waylla', 'puka', 'killu', 'yurak', 'yana'], 'ankas']]],
            ['listen', 1, 'Escucha el color', 'Escucha y selecciona la muestra correspondiente.', [
                ['c-audio-1', 'Audio 1', ['kishpu', 'ankas', 'waylla'], 'waylla'],
                ['c-audio-2', 'Audio 2', ['maywa', 'waminsi', 'killu'], 'waminsi'],
                ['c-audio-3', 'Audio 3', ['yana', 'suku', 'paku'], 'paku']]],
            ['understand', 2, 'Comprende lo que escuchas', 'Escucha cada oración y selecciona su significado.', [
                ['c-understand-pants', 'Audio 1', $meanings, $meanings[0]],
                ['c-understand-hat', 'Audio 2', $meanings, $meanings[1]],
                ['c-understand-cat', 'Audio 3', $meanings, $meanings[2]]]],
            ['interpret', 3, 'Interpreta y colorea', 'Lee o escucha la oración. Elige un color y toca su objeto para pintarlo.', [
                ['c-hat', 'Ñuka muchikuka yurakmi kan', $colors, 'yurak'],
                ['c-cat', 'Ñuka misika yanami kan', $colors, 'yana'],
                ['c-pants', 'Paypak waraka yanami kan', $colors, 'yana'],
                ['c-shawl', 'Paypak llikllaka pukami kan', $colors, 'puka'],
                ['c-necklace', 'Paypak wallkaka killumi kan', $colors, 'killu'],
                ['c-shoes', 'Paypak ushukunaka ankasmi kan', $colors, 'ankas']]],
            ['meaning', 4, 'Selecciona el significado', 'Lee la oración en kichwa y elige su significado en español.', [
                ['c-shawl', 'Paypak llikllaka pukami kan', $otherMeanings, $otherMeanings[1]],
                ['c-necklace', 'Paypak wallkaka killumi kan', $otherMeanings, $otherMeanings[2]],
                ['c-shoes', 'Paypak ushukunaka ankasmi kan', $otherMeanings, $otherMeanings[0]]]],
            ['complete', 4, 'Completa la palabra', 'Observa el objeto. Escribe el color con la terminación -mi.', [
                ['c-hat', 'Ñuka muchikuka _____ kan', [], 'yurakmi'],
                ['c-pants', 'Paypak waraka _____ kan', [], 'yanami'],
                ['c-shawl', 'Paypak llikllaka _____ kan', [], 'pukami']]],
            ['order', 5, 'Ordena las oraciones', 'Toca las palabras en el orden correcto. Puedes quitar una palabra o reiniciar la fila.', [
                ['c-cat', 'Mi gato es negro', ['kan', 'misika', 'Ñuka', 'yanami'], 'Ñuka misika yanami kan'],
                ['c-necklace', 'Su collar es amarillo', ['killumi', 'kan', 'Paypak', 'wallkaka'], 'Paypak wallkaka killumi kan'],
                ['c-shoes', 'Sus zapatos son azules', ['ushukunaka', 'ankasmi', 'kan', 'Paypak'], 'Paypak ushukunaka ankasmi kan']]],
        ];
    }
}
