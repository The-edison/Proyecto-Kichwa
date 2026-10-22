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
            if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u4-numbers-match-small-v3')->exists()) {
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

            $topics = json_decode(file_get_contents(resource_path('lessons/guided-topics.json')), true, 512, JSON_THROW_ON_ERROR);
            $lesson = collect($topics)->firstWhere('key', 'numbers');
            $topic->update(['contenido_tema' => UnidadesTematicasGuiadasSeeder::topicBody($lesson)]);
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
            ['id' => 'leaves', 'label' => 'Hojas', 'word' => 'ishkay'],
            ['id' => 'women', 'label' => 'Mujeres', 'word' => 'kimsa'],
            ['id' => 'bulls', 'label' => 'Toros', 'word' => 'chusku'],
            ['id' => 'children', 'label' => 'Niños', 'word' => 'pichka'],
            ['id' => 'plants', 'label' => 'Plantas', 'word' => 'kanchis'],
            ['id' => 'cows', 'label' => 'Vacas', 'word' => 'chunka'],
        ];
        $sentences = [
            ['id' => 'sweet', 'text' => 'Ñuka _____ mishkita mikuni · Yo como un dulce', 'word' => 'shuk'],
            ['id' => 'leaves', 'text' => 'Payka _____ pankata apamun · Él trae dos hojas', 'word' => 'ishkay'],
            ['id' => 'women', 'text' => '_____ warmikuna tushunkuna · Tres mujeres bailan', 'word' => 'kimsa'],
            ['id' => 'children', 'text' => '_____ wawakuna pukllankuna · Cinco niños juegan', 'word' => 'pichka'],
        ];

        return [
            ['origin' => 'u4-numbers-match-small-v3', 'type' => 'relacionar',
                'prompt' => 'Selecciona cada cifra y después su nombre en kichwa. Completa las diez parejas.',
                'elements' => $this->matchingElements($small), 'zones' => [], 'resource' => null,
                'solution' => ['pares' => $this->matchingPairs($small)],
                'config' => ['title' => '1. Une los números', 'numbers_activity' => 'small',
                    'correct_feedback' => '¡Muy bien! Reconociste los números del uno al diez.',
                    'incorrect_feedback' => 'Revisa las parejas y vuelve a intentarlo. Puedes cambiar cualquier unión.']],
            ['origin' => 'u4-numbers-count-v3', 'type' => 'completar',
                'prompt' => 'Cuenta los objetos de cada tarjeta y escribe el número en kichwa.',
                'elements' => array_map(fn (array $item): array => ['id' => $item['id'], 'texto' => $item['label']], $counts),
                'zones' => [], 'resource' => null,
                'solution' => ['textos' => array_combine(array_column($counts, 'id'), array_map(fn (array $item): array => [$item['word']], $counts))],
                'config' => ['title' => '2. Cuenta lo que ves', 'numbers_activity' => 'count',
                    'correct_feedback' => '¡Excelente! Contaste todos los grupos en kichwa.',
                    'incorrect_feedback' => 'Cuenta cada grupo despacio. Después revisa cómo se escribe el número.']],
            ['origin' => 'u4-numbers-match-large-v3', 'type' => 'relacionar',
                'prompt' => 'Relaciona cada cifra grande con su nombre en kichwa.',
                'elements' => $this->matchingElements($large), 'zones' => [], 'resource' => null,
                'solution' => ['pares' => $this->matchingPairs($large)],
                'config' => ['title' => '3. Cantidades grandes', 'numbers_activity' => 'large',
                    'correct_feedback' => '¡Muy bien! Reconociste centenas, miles y un millón.',
                    'incorrect_feedback' => 'Fíjate en el valor de cada cifra y revisa las palabras de la lección.']],
            ['origin' => 'u4-numbers-sentences-v3', 'type' => 'completar',
                'prompt' => 'Elige del banco de palabras el número que completa cada frase.',
                'elements' => array_map(fn (array $item): array => ['id' => $item['id'], 'texto' => $item['text'],
                    'opciones' => array_values($small)], $sentences),
                'zones' => [], 'resource' => null,
                'solution' => ['textos' => array_combine(array_column($sentences, 'id'), array_map(fn (array $item): array => [$item['word']], $sentences))],
                'config' => ['title' => '4. Números en contexto', 'numbers_activity' => 'sentences',
                    'correct_feedback' => '¡Muy bien! Usaste los números para completar las frases.',
                    'incorrect_feedback' => 'Lee la traducción de cada frase y cambia las palabras que no correspondan.']],
            ['origin' => 'u4-numbers-tiles-v3', 'type' => 'ordenar',
                'prompt' => 'Forma en kichwa el número diecisiete tocando las fichas en orden.',
                'elements' => [['id' => 'kanchis', 'texto' => 'kanchis'], ['id' => 'chunka', 'texto' => 'chunka']],
                'zones' => [], 'resource' => null, 'solution' => ['orden' => ['chunka', 'kanchis']],
                'config' => ['title' => '5. Forma el número', 'interactive_activity' => 'tiles',
                    'context_meaning' => 'Diecisiete · 17', 'presentation' => 'tiles',
                    'correct_feedback' => '¡Correcto! Chunka kanchis significa diecisiete.',
                    'incorrect_feedback' => 'Para formar diecisiete, empieza por chunka (diez).']],
            ['origin' => 'u4-numbers-choice-v3', 'type' => 'completar',
                'prompt' => 'Elige la palabra que completa la cantidad.',
                'elements' => [['id' => 'quantity', 'texto' => '_____ wawakuna pukllankuna · Cinco niños juegan',
                    'opciones' => ['kimsa', 'pichka', 'sukta', 'kanchis']]],
                'zones' => [], 'resource' => null, 'solution' => ['textos' => ['quantity' => ['pichka']]],
                'config' => ['title' => '6. Elige la cantidad', 'interactive_activity' => 'choice',
                    'correct_feedback' => '¡Así es! Pichka wawakuna pukllankuna significa cinco niños juegan.',
                    'incorrect_feedback' => 'Cuenta hasta cinco y busca su nombre en kichwa.']],
            ['origin' => 'u4-numbers-writing-v3', 'type' => 'completar',
                'prompt' => 'Escribe la palabra que falta en kichwa.',
                'elements' => [['id' => 'number', 'texto' => 'Chunka _____ · 12']],
                'zones' => [], 'resource' => null, 'solution' => ['textos' => ['number' => ['ishkay']]],
                'config' => ['title' => '7. Escribe el número', 'interactive_activity' => 'writing',
                    'presentation' => 'writing',
                    'correct_feedback' => '¡Bien! Chunka ishkay significa doce.',
                    'incorrect_feedback' => 'Doce se forma con chunka (diez) y el nombre del número dos.']],
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
