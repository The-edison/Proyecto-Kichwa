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

class ModuloUnoEvaluacionSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261021)');
            $level = Nivel::where('orden_nivel', 1)->firstOrFail();
            $module = Modulo::where('id_nivel', $level->id_nivel)->where('orden_modulo', 1)->firstOrFail();
            if (EvaluacionKichwa::where('id_modulo', $module->id_modulo)->where('configuracion->bank_key', 'modulo1-final-v1')->exists()) {
                return;
            }
            $units = Unidad::where('id_modulo', $module->id_modulo)->whereBetween('orden_unidad', [1, 5])->orderBy('orden_unidad')->get();
            if ($units->count() !== 5) {
                throw new \RuntimeException('Crea las cinco unidades del módulo 1 antes de cargar su prueba final.');
            }
            $evaluation = EvaluacionKichwa::create(['id_modulo' => $module->id_modulo, 'id_unidad' => null, 'id_tema' => null,
                'titulo_evaluacion' => 'Prueba final del módulo 1', 'tipo_evaluacion' => 'modulo', 'publicado' => false,
                'configuracion' => ['managed' => true, 'final' => true, 'question_count' => 15, 'pass_percentage' => 80,
                    'bank_key' => 'modulo1-final-v1', 'prerequisite_units' => $units->modelKeys()]]);
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
                $question->origen_reactivo = 'modulo1-final-v1-'.($index + 1);
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
            [1, 'Una compañera quiere anotar únicamente las vocales del kichwa. ¿Qué lista debe escribir?',
                ['a, e, i, o, u', 'a, i, u', 'a, i, o', 'e, i, u'], [1],
                'Las tres vocales del kichwa son a, i y u.'],
            [1, 'En una ficha aparecen ch, ll y sh. Aunque se escriben con dos letras cada una, ¿cuántas consonantes representan en la lista de la lección?',
                ['Seis consonantes', 'Dos consonantes', 'Tres consonantes', 'Nueve consonantes'], [2],
                'Ch, ll y sh cuentan como tres consonantes: una por cada grupo.'],
            [1, 'Quieres preparar dos etiquetas: una para una casa y otra para un corazón. Marca las DOS palabras que necesitas.',
                ['sisa', 'wasi', 'yura', 'shunku', 'purina'], [1, 3],
                'Wasi significa casa y shunku significa corazón.'],
            [2, 'Llegas a visitar a una amiga a las cuatro de la tarde. ¿Cómo la saludas en kichwa?',
                ['Alli tuta', 'Kayakaman', 'Alli chishi', 'Alli puncha'], [2],
                'Alli chishi se usa para saludar por la tarde.'],
            [2, 'Te preguntan «Maymanta kanki» y tú eres de Ambato. ¿Qué respuesta corresponde?',
                ['Ambatomanta kani', 'Allilla kani', 'Kayakaman', 'Yupaychani'], [0],
                'Maymanta kanki pregunta de dónde eres. Ambatomanta kani expresa que eres de Ambato.'],
            [2, 'Una persona te presta un lápiz y quieres darle las gracias. ¿Qué expresión eliges?',
                ['Imanalla kanki', 'Kishpichiway', 'Alli tuta', 'Yupaychani'], [3],
                'Yupaychani significa gracias.'],
            [3, 'Vas a hablar de ti junto con tus dos compañeros. ¿Qué pronombre incluye a todos ustedes, también a ti?',
                ['Paykuna', 'Ñukanchik', 'Kankuna', 'Pay'], [1],
                'Ñukanchik significa nosotros e incluye a la persona que habla.'],
            [3, 'María no participa en la conversación. Tú le cuentas a otra persona lo que María hace. ¿Qué pronombre usarías para referirte a ella?',
                ['Kan', 'Ñuka', 'Pay', 'Kankuna'], [2],
                'Pay significa él o ella y sirve para hablar de otra persona.'],
            [3, 'En una conversación entre dos personas, una habla y la otra escucha. Marca las DOS palabras para decir «yo» y «tú».',
                ['Pay', 'Ñuka', 'Paykuna', 'Kan', 'Ñukanchik'], [1, 3],
                'Ñuka significa yo y kan significa tú.'],
            [4, 'Tienes seis libros y recibes otros cuatro. ¿Cómo dices en kichwa la cantidad total de libros?',
                ['Pichka', 'Ishkay', 'Kanchis', 'Chunka'], [3],
                'Seis más cuatro son diez. Diez se dice chunka.'],
            [4, 'En una lista de asistentes se lee «chunka kanchis». ¿Qué número debes escribir al lado?',
                ['7', '17', '20', '70'], [1],
                'Chunka kanchis significa diecisiete: diez más siete.'],
            [4, 'Un cartel anuncia «hunu» visitas. ¿Qué cantidad indica?',
                ['100', '1.000', '100.000', '1.000.000'], [3],
                'Hunu significa un millón.'],
            [5, 'Hoy es lunes, awaki. Tu clase será dos días después. ¿Qué día corresponde?',
                ['Awkarik', 'Chillay', 'Chaska', 'Inti'], [1],
                'Dos días después del lunes es miércoles. Miércoles se dice chillay.'],
            [5, 'Quieres marcar el último mes del año en un calendario kichwa. ¿Qué nombre buscas?',
                ['Kulla', 'Raymi', 'Kapak', 'Panchi'], [2],
                'Kapak corresponde a diciembre, el último mes del año.'],
            [5, 'Una invitación comienza con «Kulla killapi…». ¿Qué información te está dando?',
                ['Que algo sucede en enero', 'Que algo sucedió ayer', 'Que algo sucede el domingo', 'Que algo sucederá mañana'], [0],
                'Kulla killapi significa en enero. En el calendario, killa significa mes.'],
        ];
    }
}
