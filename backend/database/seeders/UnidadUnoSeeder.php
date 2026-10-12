<?php

namespace Database\Seeders;

use App\Models\EvaluacionKichwa;
use App\Models\Modulo;
use App\Models\Nivel;
use App\Models\Pregunta;
use App\Models\Tema;
use App\Models\Unidad;
use App\Services\KichwaResource;
use App\Services\PublicacionContenido;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UnidadUnoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261011)');
            $level = Nivel::where('orden_nivel', 1)->firstOrFail();
            $module = Modulo::where('id_nivel', $level->id_nivel)->where('nombre_modulo', 'ilike', '%primeros contactos%')->first();
            if (! $module) {
                $module = Modulo::create(['id_nivel' => $level->id_nivel, 'nombre_modulo' => 'Primeros contactos con el Kichwa', 'descripcion_modulo' => 'Primeros contactos con el Kichwa.', 'orden_modulo' => 1 + (int) Modulo::where('id_nivel', $level->id_nivel)->max('orden_modulo'), 'publicado' => false]);
            }
            $unit = Unidad::where('id_modulo', $module->id_modulo)->orderBy('orden_unidad')->first();
            if (! $unit) {
                $unit = Unidad::create(['id_modulo' => $module->id_modulo, 'titulo_unidad' => 'Conociendo el Kichwa', 'objetivo_unidad' => 'Reconocer vocales, consonantes y primeras palabras.', 'orden_unidad' => 1, 'publicado' => false]);
            }
            if ($unit->id_unidad === 4 && $unit->titulo_unidad !== 'Conociendo el Kichwa') {
                $unit->update(['titulo_unidad' => 'Conociendo el Kichwa']);
            }
            $titles = ['Descubre las vocales', 'Reconoce las consonantes', 'Aprende tus primeras palabras', 'Desafío final de la Unidad 1'];
            $bodies = ['El Kichwa tiene tres vocales: A, I, U. Identifícalas y reconócelas en las palabras Sisa, Wasi, Shunku y Purina.',
                'Las 15 consonantes principales son CH, H, K, L, LL, M, N, Ñ, P, R, S, SH, T, W, Y. TS es contenido complementario de palabras originarias o antiguas.',
                "Sisa — Flor\nWasi — Casa\nShunku — Corazón\nPurina — Caminar\n\nPendiente de validación docente: Llama — Oveja. Esta equivalencia no forma parte de la calificación.",
                'Domina las tres lecciones con al menos 80 %. El desafío selecciona diez preguntas. Con 80 % obtienes una estrella, con 90 % dos y con 100 % tres.'];
            $bank = $this->bank();
            foreach ($titles as $index => $title) {
                $key = 'basico-modulo1-unidad1-leccion'.($index + 1);
                if (Tema::where('clave_leccion', $key)->exists()) {
                    continue;
                }
                $topic = Tema::create(['clave_leccion' => $key, 'id_unidad' => $unit->id_unidad, 'tipo_tema' => 'vocabulario', 'titulo_tema' => $title, 'contenido_tema' => $bodies[$index], 'orden_tema' => 1 + (int) Tema::where('id_unidad', $unit->id_unidad)->max('orden_tema'), 'publicado' => false]);
                $evaluation = EvaluacionKichwa::create(['id_unidad' => $unit->id_unidad, 'id_tema' => $topic->id_tema, 'titulo_evaluacion' => $title, 'tipo_evaluacion' => 'unidad', 'publicado' => false, 'configuracion' => ['managed' => true, 'question_count' => 10, 'pass_percentage' => 80, 'final' => $index === 3]]);
                $items = $index === 3 ? array_merge(...$bank) : $bank[$index];
                foreach ($items as $position => $item) {
                    $question = new Pregunta(KichwaResource::attributes('questions', $item + ['evaluation_id' => $evaluation->id_evaluacion, 'score' => 1, 'sort_order' => $position + 1, 'published' => false]));
                    $question->origen_reactivo = $item['origin'];
                    $question->save();
                }
                if ($index === 0 || $index === 2) {
                    $pending = $bank[$index][0];
                    $pending['config']['requires_audio'] = $index === 0;
                    $pending['config']['requires_images'] = $index === 2;
                    $pending['prompt'] = $index === 0 ? 'Escucha el audio y selecciona la vocal.' : 'Selecciona la imagen de una flor.';
                    Pregunta::create(KichwaResource::attributes('questions', $pending + ['evaluation_id' => $evaluation->id_evaluacion, 'score' => 1, 'sort_order' => count($items) + 1, 'published' => false]));
                }
            }
        });
        PublicacionContenido::invalidate();
    }

    private function bank(): array
    {
        $banks = [[], [], []];
        $add = function (int $lesson, string $type, string $prompt, array $elements, array $solution, string $explanation, int $max = 1) use (&$banks): void {
            $banks[$lesson][] = ['origin' => 'u1-l'.($lesson + 1).'-r'.(count($banks[$lesson]) + 1), 'type' => $type, 'prompt' => $prompt, 'elements' => $elements, 'zones' => [], 'resource' => null, 'solution' => $solution,
                'config' => ['managed' => true, 'reviewed' => false, 'max_selections' => $max, 'explanation' => $explanation, 'difficulty' => 'inicial']];
        };
        $select = function (int $lesson, string $prompt, array $choices, array $correct, string $explanation) use ($add): void {
            $elements = [];
            foreach ($choices as $i => $text) {
                $elements[] = ['id' => 'e'.$i, 'texto' => $text];
            }
            $add($lesson, 'seleccion_multiple', $prompt, $elements, ['seleccion' => array_map(fn ($i) => 'e'.$i, $correct)], $explanation, count($correct));
        };
        foreach (['A', 'I', 'U'] as $vowel) {
            $select(0, 'Selecciona la vocal '.$vowel.'.', [$vowel, 'E', 'O'], [0], 'Las vocales del Kichwa son A, I, U.');
        }
        $select(0, 'Selecciona las tres vocales del Kichwa.', ['A', 'E', 'I', 'O', 'U'], [0, 2, 4], 'Las vocales son A, I, U.');
        $select(0, '¿Cuántas vocales tiene el Kichwa?', ['Tres', 'Cinco', 'Dos'], [0], 'El documento presenta tres vocales.');
        foreach ([['S_sa', 'i'], ['Was_', 'i'], ['Sh_nku', 'u'], ['P_rina', 'u'], ['W_si', 'a']] as [$word,$answer]) {
            $add(0, 'completar', 'Completa la vocal que falta.', [['id' => 'palabra', 'texto' => $word, 'opciones' => ['a', 'i', 'u']]], ['textos' => ['palabra' => [$answer]]], 'Repasa: Sisa, Wasi, Shunku, Purina.');
        }
        foreach (['CH', 'LL', 'Ñ', 'SH', 'W'] as $letter) {
            $select(1, 'Identifica la consonante '.$letter.'.', [$letter, 'A', 'I', 'U'], [0], $letter.' pertenece a las 15 consonantes principales.');
        }
        $select(1, '¿Cuántas consonantes principales presenta esta unidad?', ['15', '17', '3'], [0], 'Se presentan 15 consonantes principales y TS como complemento.');
        $select(1, 'Selecciona la consonante inicial de Wasi.', ['W', 'S', 'Y'], [0], 'Wasi comienza con W.');
        $select(1, 'Selecciona la consonante inicial de Shunku.', ['SH', 'S', 'CH'], [0], 'Shunku comienza con SH.');
        foreach (['Sisa', 'Wasi'] as $word) {
            $letters = preg_split('//u', mb_strtolower($word), -1, PREG_SPLIT_NO_EMPTY);
            $elements = [];
            foreach ($letters as $i => $letter) {
                $elements[] = ['id' => 'l'.$i, 'texto' => $letter];
            }
            $order = array_column($elements, 'id');
            $add(1, 'ordenar', 'Ordena las letras para formar '.$word.'.', array_reverse($elements), ['orden' => $order], 'La palabra es '.$word.'.');
        }
        $words = ['Sisa' => 'Flor', 'Wasi' => 'Casa', 'Shunku' => 'Corazón', 'Purina' => 'Caminar'];
        foreach ($words as $word => $meaning) {
            $select(2, '¿Qué significa '.$word.'?', array_values($words), [array_search($meaning, array_values($words), true)], $word.' significa '.$meaning.'.');
        }
        foreach ($words as $word => $meaning) {
            $add(2, 'completar', 'Escribe en español el significado de '.$word.'.', [['id' => 'traduccion', 'texto' => $word]], ['textos' => ['traduccion' => [$meaning]]], $word.' significa '.$meaning.'.');
        }
        $add(2, 'completar', 'Completa la palabra Kichwa que significa casa.', [['id' => 'palabra', 'texto' => 'Wa__']], ['textos' => ['palabra' => ['si']]], 'Wasi significa casa.');
        $elements = [];
        $pairs = [];
        foreach (array_keys($words) as $i => $word) {
            $elements[] = ['id' => 'k'.$i, 'texto' => $word, 'grupo' => 'origen'];
            $elements[] = ['id' => 's'.$i, 'texto' => $words[$word], 'grupo' => 'destino'];
            $pairs[] = ['origen' => 'k'.$i, 'destino' => 's'.$i];
        }
        $add(2, 'relacionar', 'Relaciona cada palabra con su significado.', $elements, ['pares' => $pairs], 'Sisa: flor; Wasi: casa; Shunku: corazón; Purina: caminar.');

        return $banks;
    }
}
