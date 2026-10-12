<?php

namespace Database\Seeders;

use App\Models\Actividad;
use App\Models\EvaluacionKichwa;
use App\Models\Modulo;
use App\Models\Pregunta;
use App\Models\Tema;
use App\Models\Unidad;
use App\Services\EstadoContenido;
use App\Services\KichwaResource;
use App\Services\PublicacionContenido;
use App\Services\SecuenciaUnidad;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class UnidadUnoDefinitivaSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(UnidadUnoSeeder::class);
        $images = $this->images();
        DB::transaction(function () use ($images): void {
            DB::select('SELECT pg_advisory_xact_lock(20261011)');
            if (Tema::where('clave_leccion', 'basico-modulo1-unidad1-especificacion-v2')->exists()) {
                return;
            }
            $previous = Tema::where('clave_leccion', 'basico-modulo1-unidad1-leccion1')->firstOrFail();
            $unit = Unidad::whereKey($previous->id_unidad)->lockForUpdate()->firstOrFail();
            Actividad::where('id_unidad', $unit->id_unidad)->update(['publicado' => false]);
            EvaluacionKichwa::where('id_unidad', $unit->id_unidad)->update(['publicado' => false]);
            Tema::where('id_unidad', $unit->id_unidad)->update(['publicado' => false]);
            $intro = Tema::create(['id_unidad' => $unit->id_unidad, 'clave_leccion' => 'basico-modulo1-unidad1-especificacion-v2', 'tipo_tema' => 'vocabulario', 'titulo_tema' => 'Conociendo el Kichwa',
                'contenido_tema' => "El Kichwa utiliza tres vocales: A, I, U.\nLas quince consonantes principales son CH, H, K, L, LL, M, N, Ñ, P, R, S, SH, T, W, Y. TS se menciona como complemento para vocabulario antiguo.\n\nSisa = flor · Wasi = casa · Shunku = corazón · Purina = caminar.\n\nPractica las siete actividades. Al acertarlas se desbloquea una prueba de seis preguntas. Necesitas cinco aciertos para aprobar.\nLlama = oveja permanece en revisión docente y no se califica.",
                'orden_tema' => 1 + (int) Tema::where('id_unidad', $unit->id_unidad)->max('orden_tema'), 'publicado' => true]);
            $bank = $this->bank($images);
            $ids = [];
            foreach ($bank as $index => $exercise) {
                EstadoContenido::assertReady($exercise);
                $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
                $record->id_unidad = $unit->id_unidad;
                $record->origen_reactivo = 'u1-definitiva-a'.($index + 1);
                $record->orden_actividad = 1 + (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
                $record->publicado = true;
                $record->save();
                $ids[] = $record->id_actividad;
            }
            $evaluation = EvaluacionKichwa::create(['id_unidad' => $unit->id_unidad, 'id_tema' => $intro->id_tema, 'tipo_evaluacion' => 'unidad', 'titulo_evaluacion' => 'Prueba de la Unidad 1', 'publicado' => false,
                'configuracion' => ['managed' => true, 'final' => true, 'sequence_mode' => true, 'fixed_order' => true, 'question_count' => 6, 'required_correct' => 5, 'pass_percentage' => 80, 'prerequisite_activities' => $ids]]);
            foreach ([0, 1, 2, 4, 5, 6] as $position => $index) {
                $exercise = $bank[$index];
                unset($exercise['config']['context_meaning']);
                $exercise['config']['title'] = 'Pregunta '.($position + 1);
                $question = new Pregunta(KichwaResource::attributes('questions', $exercise));
                $question->id_evaluacion = $evaluation->id_evaluacion;
                $question->puntaje_pregunta = 1;
                $question->orden_pregunta = $position + 1;
                $question->publicado = true;
                $question->origen_reactivo = 'u1-definitiva-q'.($position + 1);
                $question->save();
            }
            SecuenciaUnidad::assertReady($evaluation);
            $evaluation->update(['publicado' => true]);
            $unit->update(['publicado' => true, 'configuracion' => array_replace($unit->configuracion ?? [], ['learning_mode' => 'sequence'])]);
            Modulo::whereKey($unit->id_modulo)->update(['publicado' => true]);
        });
        PublicacionContenido::invalidate();
    }

    private function images(): array
    {
        $images = [];
        foreach (['flor', 'corazon', 'casa'] as $name) {
            $source = resource_path('images/unidad1/'.$name.'.png');
            $path = 'kichwa/imagenes/'.hash_file('sha256', $source).'.webp';
            if (! Storage::disk('public')->exists($path)) {
                $image = imagecreatefrompng($source);
                $small = imagescale($image, 640, 640);
                imagedestroy($image);
                ob_start();
                imagewebp($small, null, 85);
                $bytes = ob_get_clean();
                imagedestroy($small);
                if (! Storage::disk('public')->put($path, $bytes)) {
                    throw new \RuntimeException('No se pueden guardar las ilustraciones en el almacenamiento persistente.');
                }
            }
            $images[$name] = $path;
        }

        return $images;
    }

    private function bank(array $images): array
    {
        $base = ['zones' => [], 'resource' => null, 'config' => ['managed' => true, 'reviewed' => true, 'difficulty' => 'inicial']];
        $make = function (string $title, string $type, string $prompt, array $elements, array $solution, array $config) use ($base): array {
            return array_replace($base, ['type' => $type, 'prompt' => $prompt, 'elements' => $elements, 'solution' => $solution, 'config' => array_replace($base['config'], ['title' => $title], $config)]);
        };
        $options = fn (array $texts) => array_map(fn ($text, $i) => ['id' => 'e'.$i, 'texto' => $text], $texts, array_keys($texts));
        $pairs = [];
        $elements = [];
        foreach (['Sisa', 'Wasi', 'Shunku', 'Purina'] as $i => $word) {
            $elements[] = ['id' => 'k'.$i, 'texto' => $word, 'grupo' => 'origen'];
            $pairs[] = ['origen' => 'k'.$i, 'destino' => 's'.$i];
        }
        foreach ([2 => 'Corazón', 3 => 'Caminar', 0 => 'Flor', 1 => 'Casa'] as $i => $meaning) {
            $elements[] = ['id' => 's'.$i, 'texto' => $meaning, 'grupo' => 'destino'];
        }

        return [
            $make('Identifica las vocales', 'seleccion_multiple', 'Selecciona las tres vocales utilizadas en el Kichwa.', $options(['A', 'E', 'I', 'O', 'U', 'K']), ['seleccion' => ['e0', 'e2', 'e4']], ['presentation' => 'buttons', 'max_selections' => 3, 'exact_selections' => true, 'explanation' => 'En Kichwa se utilizan A, I y U.']),
            $make('Reconoce consonantes', 'seleccion_multiple', '¿Con qué combinación comienza SHUNKU?', $options(['CH', 'SH', 'LL']), ['seleccion' => ['e1']], ['presentation' => 'buttons', 'max_selections' => 1, 'exact_selections' => true, 'context_text' => 'SHUNKU', 'context_meaning' => 'corazón', 'reveal_highlight' => 'SH', 'explanation' => 'SHUNKU significa corazón y comienza con SH.']),
            $make('Completa la palabra', 'completar', 'Completa la palabra Kichwa que significa casa.', [['id' => 'palabra', 'texto' => 'WA_I', 'opciones' => ['S', 'M', 'N']]], ['textos' => ['palabra' => ['S']]], ['presentation' => 'letter', 'word_target' => 'WASI', 'missing_index' => 2, 'explanation' => 'La letra que falta es S: WASI significa casa.']),
            $make('Elige la imagen correcta', 'seleccion_multiple', '¿Qué imagen representa SISA?', [['id' => 'v1', 'texto' => 'Flor', 'imagen' => $images['flor']], ['id' => 'v2', 'texto' => 'Corazón', 'imagen' => $images['corazon']], ['id' => 'v3', 'texto' => 'Casa', 'imagen' => $images['casa']]], ['seleccion' => ['v1']], ['presentation' => 'visual', 'requires_images' => true, 'max_selections' => 1, 'exact_selections' => true, 'explanation' => 'SISA significa flor.']),
            $make('Relaciona las palabras', 'relacionar', 'Une cada palabra con su significado en español.', $elements, ['pares' => $pairs], ['explanation' => 'Sisa–Flor; Wasi–Casa; Shunku–Corazón; Purina–Caminar.']),
            $make('Construye una palabra', 'ordenar', 'Ordena las letras para escribir «flor» en Kichwa.', [['id' => 'a', 'texto' => 'A'], ['id' => 's2', 'texto' => 'S'], ['id' => 's1', 'texto' => 'S'], ['id' => 'i', 'texto' => 'I']], ['orden' => ['s1', 'i', 's2', 'a']], ['presentation' => 'tiles', 'word_target' => 'SISA', 'explanation' => 'SISA significa flor. Las dos fichas S son intercambiables.']),
            $make('Escribe lo aprendido','completar','¿Cómo se dice «Casa» en Kichwa?',[['id' => 'palabra', 'texto' => 'Tu respuesta']],['textos' => ['palabra' => ['WASI']]],['presentation' => 'writing', 'explanation' => 'La respuesta esperada es WASI. Se aceptan mayúsculas, minúsculas y espacios externos.']),
        ];
    }
}
