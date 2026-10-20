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

class UnidadCuatroNumerosSeeder extends Seeder
{
    private const LESSON_KEY = 'basico-modulo1-unidad4-numbers-v1';

    public function run(): void
    {
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261020)');
            $topic = Tema::where('clave_leccion', self::LESSON_KEY)->firstOrFail();
            $unit = Unidad::whereKey($topic->id_unidad)->lockForUpdate()->firstOrFail();
            if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u4-numbers-match-small-v1')->exists()) {
                return;
            }

            Actividad::where('id_unidad', $unit->id_unidad)->update(['publicado' => false]);
            $order = (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            foreach ($this->exercises() as $exercise) {
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

            $topic->update(['contenido_tema' => "Aprende a contar en kichwa del cero al veinte y a usar los números para hablar de edades y cantidades.\n\nDel cero al diez: illak = 0; shuk = 1; ishkay = 2; kimsa = 3; chusku = 4; pichka = 5; sukta = 6; kanchis = 7; pusak = 8; iskun = 9; chunka = 10.\n\nDel once al veinte se combina chunka con las unidades: chunka shuk = 11; chunka ishkay = 12; chunka kimsa = 13; chunka chusku = 14; chunka pichka = 15; chunka sukta = 16; chunka kanchis = 17; chunka pusak = 18; chunka iskun = 19; ishkay chunka = 20.\n\nCantidades grandes: patsak = 100; waranka = 1.000; chunka waranka = 10.000; patsak waranka = 100.000; hunu = 1.000.000.\n\nEjemplos: Ñuka shuk watatami charini. = Tengo un año. Pichka yura. = Cinco árboles. Kimsa runakuna. = Tres personas."]);
            $unit->update(['titulo_unidad' => 'Números y cantidades',
                'objetivo_unidad' => 'Contar del cero al veinte y usar números para expresar cantidades en kichwa.',
                'publicado' => true]);
        });
        PublicacionContenido::invalidate();
    }

    private function exercises(): array
    {
        $small = [1 => 'shuk', 2 => 'ishkay', 3 => 'kimsa', 4 => 'chusku', 5 => 'pichka',
            6 => 'sukta', 7 => 'kanchis', 8 => 'pusak', 9 => 'iskun', 10 => 'chunka'];
        $large = [100 => 'patsak', 1000 => 'waranka', 10000 => 'chunka waranka',
            100000 => 'patsak waranka', 1000000 => 'hunu'];

        $counts = [
            ['id' => 'apples', 'label' => 'Manzanas', 'number' => 3, 'word' => 'kimsa'],
            ['id' => 'flowers', 'label' => 'Flores', 'number' => 5, 'word' => 'pichka'],
            ['id' => 'llamas', 'label' => 'Llamas', 'number' => 4, 'word' => 'chusku'],
            ['id' => 'trees', 'label' => 'Árboles', 'number' => 6, 'word' => 'sukta'],
            ['id' => 'books', 'label' => 'Libros', 'number' => 10, 'word' => 'chunka'],
            ['id' => 'pencils', 'label' => 'Lápices', 'number' => 7, 'word' => 'kanchis'],
        ];
        $sentences = [
            ['id' => 'trees', 'text' => 'Ñuka charini _____ yura. · Tengo cinco árboles.', 'word' => 'pichka'],
            ['id' => 'llamas', 'text' => 'Wasipi _____ llamakuna kashkan. · En mi casa hay tres llamas.', 'word' => 'kimsa'],
            ['id' => 'days', 'text' => 'Kay punchapi _____ punchakuna charini. · Hoy tengo diez días.', 'word' => 'chunka'],
            ['id' => 'apples', 'text' => 'Mamay charin _____ mishki murukuna. · Mi mamá tiene dos frutas.', 'word' => 'ishkay'],
        ];

        return [
            ['origin' => 'u4-numbers-match-small-v1', 'type' => 'relacionar',
                'prompt' => 'Selecciona cada cifra y después su nombre en kichwa. Completa las diez parejas.',
                'elements' => $this->matchingElements($small), 'zones' => [], 'resource' => null,
                'solution' => ['pares' => $this->matchingPairs($small)],
                'config' => ['title' => '1. Une los números', 'numbers_activity' => 'small',
                    'correct_feedback' => '¡Muy bien! Reconociste los números del uno al diez.',
                    'incorrect_feedback' => 'Revisa las parejas y vuelve a intentarlo. Puedes cambiar cualquier unión.']],
            ['origin' => 'u4-numbers-count-v1', 'type' => 'completar',
                'prompt' => 'Cuenta los objetos de cada tarjeta y escribe el número en kichwa.',
                'elements' => array_map(fn (array $item): array => ['id' => $item['id'], 'texto' => $item['label']], $counts),
                'zones' => [], 'resource' => null,
                'solution' => ['textos' => array_combine(array_column($counts, 'id'), array_map(fn (array $item): array => [$item['word']], $counts))],
                'config' => ['title' => '2. Cuenta lo que ves', 'numbers_activity' => 'count',
                    'correct_feedback' => '¡Excelente! Contaste todos los grupos en kichwa.',
                    'incorrect_feedback' => 'Cuenta cada grupo despacio. Después revisa cómo se escribe el número.']],
            ['origin' => 'u4-numbers-match-large-v1', 'type' => 'relacionar',
                'prompt' => 'Relaciona cada cifra grande con su nombre en kichwa.',
                'elements' => $this->matchingElements($large), 'zones' => [], 'resource' => null,
                'solution' => ['pares' => $this->matchingPairs($large)],
                'config' => ['title' => '3. Cantidades grandes', 'numbers_activity' => 'large',
                    'correct_feedback' => '¡Muy bien! Reconociste centenas, miles y un millón.',
                    'incorrect_feedback' => 'Fíjate en el valor de cada cifra y revisa las palabras de la lección.']],
            ['origin' => 'u4-numbers-sentences-v1', 'type' => 'completar',
                'prompt' => 'Elige del banco de palabras el número que completa cada frase.',
                'elements' => array_map(fn (array $item): array => ['id' => $item['id'], 'texto' => $item['text'],
                    'opciones' => array_values($small)], $sentences),
                'zones' => [], 'resource' => null,
                'solution' => ['textos' => array_combine(array_column($sentences, 'id'), array_map(fn (array $item): array => [$item['word']], $sentences))],
                'config' => ['title' => '4. Números en contexto', 'numbers_activity' => 'sentences',
                    'correct_feedback' => '¡Muy bien! Usaste los números para completar las frases.',
                    'incorrect_feedback' => 'Lee la traducción de cada frase y cambia las palabras que no correspondan.']],
        ];
    }

    private function matchingElements(array $numbers): array
    {
        $elements = [];
        foreach ($numbers as $number => $word) {
            $elements[] = ['id' => 'n-'.$number, 'texto' => number_format($number, 0, ',', '.'), 'grupo' => 'origen'];
        }
        foreach (array_reverse($numbers, true) as $number => $word) {
            $elements[] = ['id' => 'w-'.$number, 'texto' => $word, 'grupo' => 'destino'];
        }

        return $elements;
    }

    private function matchingPairs(array $numbers): array
    {
        return array_map(fn ($number): array => ['origen' => 'n-'.$number, 'destino' => 'w-'.$number], array_keys($numbers));
    }
}
