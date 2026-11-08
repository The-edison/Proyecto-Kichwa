<?php

namespace Database\Seeders;

use App\Models\EvaluacionKichwa;
use App\Models\Modulo;
use App\Models\Nivel;
use App\Models\Pregunta;
use App\Models\Unidad;
use App\Services\EstadoContenido;
use App\Services\KichwaResource;
use App\Services\PublicacionContenido;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ModuloDosEvaluacionSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261108)');
            $level = Nivel::where('orden_nivel', 1)->firstOrFail();
            $module = Modulo::where('id_nivel', $level->id_nivel)->where('orden_modulo', 2)->firstOrFail();
            if (EvaluacionKichwa::where('id_modulo', $module->id_modulo)->where('configuracion->bank_key', 'basico-modulo2-final-v1')->exists()) {
                return;
            }
            $units = Unidad::where('id_modulo', $module->id_modulo)->whereBetween('orden_unidad', [1, 4])->orderBy('orden_unidad')->get();
            if ($units->count() !== 4) {
                throw new \RuntimeException('Crea las cuatro unidades del módulo 2 básico antes de cargar su lección final.');
            }
            $evaluation = EvaluacionKichwa::create(['id_modulo' => $module->id_modulo, 'id_unidad' => null, 'id_tema' => null,
                'titulo_evaluacion' => 'Lección final · Vocabulario y gramática básica', 'tipo_evaluacion' => 'modulo', 'publicado' => false,
                'configuracion' => ['managed' => true, 'final' => true, 'question_count' => 16, 'pass_percentage' => 80,
                    'bank_key' => 'basico-modulo2-final-v1', 'prerequisite_units' => $units->modelKeys()]]);
            foreach ($this->questions() as $index => [$unit, $prompt, $options, $correct, $explanation]) {
                $choices = [];
                foreach ($options as $position => $option) {
                    $choices[] = ['id' => 'opcion-'.($position + 1), 'texto' => $option];
                }
                $data = ['type' => 'seleccion_multiple', 'prompt' => $prompt, 'elements' => $choices, 'zones' => [], 'resource' => null,
                    'solution' => ['seleccion' => array_map(fn (int $position): string => 'opcion-'.($position + 1), $correct)],
                    'config' => ['managed' => true, 'reviewed' => true, 'max_selections' => count($correct), 'exact_selections' => true,
                        'title' => 'Unidad '.$unit.' · '.$units[$unit - 1]->titulo_unidad,
                        'correct_feedback' => 'Correcto. '.$explanation, 'incorrect_feedback' => 'Repasa esta idea: '.$explanation]];
                EstadoContenido::assertReady($data);
                $question = new Pregunta(KichwaResource::attributes('questions', $data));
                $question->id_evaluacion = $evaluation->id_evaluacion;
                $question->origen_reactivo = 'basico-modulo2-final-v1-'.($index + 1);
                $question->puntaje_pregunta = 1;
                $question->orden_pregunta = $index + 1;
                $question->publicado = true;
                $question->save();
            }
            $evaluation->update(['publicado' => true]);
        });
        PublicacionContenido::invalidate();
    }

    private function questions(): array
    {
        return [
            [1, 'Ves un perro y un gato. ¿Qué DOS palabras necesitas para nombrarlos?',
                ['allku', 'misi', 'kuy', 'kinti'], [0, 1], 'Allku significa perro y misi significa gato.'],
            [1, 'Un dibujo muestra una mariposa. ¿Qué palabra corresponde?',
                ['hampatu', 'taruka', 'pilpintu', 'urpi'], [2], 'Pilpintu significa mariposa.'],
            [1, 'Quieres describir un objeto rojo. ¿Qué color eliges?',
                ['yana', 'yurak', 'waylla', 'puka'], [3], 'Puka significa rojo.'],
            [1, 'Lee «Ñuka misika yanami kan». ¿De qué color es el gato?',
                ['Blanco', 'Negro', 'Azul', 'Verde'], [1], 'Yana significa negro.'],
            [2, 'Para señalar tu oreja, ¿qué palabra usas?',
                ['rinri', 'shimi', 'uma', 'maki'], [0], 'Rinri significa oreja.'],
            [2, 'Necesitas nombrar una mano y un dedo. Marca las DOS palabras correctas.',
                ['rikra', 'maki', 'ruka', 'sillu'], [1, 2], 'Maki significa mano y ruka significa dedo.'],
            [2, '¿Qué parte del cuerpo significa «kunkuri»?',
                ['Espalda', 'Rodilla', 'Barriga', 'Pie'], [1], 'Kunkuri significa rodilla.'],
            [2, 'Lee «Chakitami nanan». ¿Qué parte del cuerpo duele?',
                ['La cabeza', 'La boca', 'El pie', 'La mano'], [2], 'Chaki significa pie.'],
            [3, 'Buscas agua para beber. ¿Qué palabra nombra el agua?',
                ['allpa', 'wayra', 'yaku', 'tamya'], [2], 'Yaku significa agua.'],
            [3, 'Ves un árbol junto a una casa. Marca las DOS palabras que los nombran.',
                ['wasi', 'yura', 'punku', 'tuku'], [0, 1], 'Wasi significa casa y yura significa árbol.'],
            [3, 'Hablas del cielo y dices «killa». ¿A qué se refiere?',
                ['Al mes', 'A la luna', 'Al sol', 'A la lluvia'], [1], 'Cuando se habla del cielo, killa significa luna.'],
            [3, 'En un calendario aparece «killa». ¿Qué significa en ese contexto?',
                ['Mes', 'Luna', 'Montaña', 'Viento'], [0], 'En el calendario, killa significa mes.'],
            [4, '¿Cuál de estas palabras significa «caminar»?',
                ['mikuna', 'purina', 'upyana', 'pichana'], [1], 'Purina significa caminar.'],
            [4, 'Quieres decir «escribir» y «escuchar». Marca los DOS verbos correctos.',
                ['killkana', 'rikuna', 'uyana', 'yanuna'], [0, 2], 'Killkana significa escribir y uyana significa escuchar.'],
            [4, 'Si quitas -na de «killkana», ¿qué raíz queda?',
                ['killka', 'killkana', 'killa', 'kana'], [0], 'La raíz de killkana es killka.'],
            [4, 'Lee «Ñuka mikuni». ¿Qué acción realiza quien habla?',
                ['Camina', 'Duerme', 'Come', 'Escribe'], [2], 'Ñuka mikuni significa yo como.'],
        ];
    }
}
