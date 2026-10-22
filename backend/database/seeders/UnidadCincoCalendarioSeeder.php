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

class UnidadCincoCalendarioSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            DB::select('SELECT pg_advisory_xact_lock(20261020)');
            $topic = Tema::where('clave_leccion', 'basico-modulo1-unidad5-calendar-v1')->firstOrFail();
            $unit = Unidad::whereKey($topic->id_unidad)->lockForUpdate()->firstOrFail();
            if (Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'u5-calendar-tiles-january-v3')->exists()) {
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
            $lesson = collect($topics)->firstWhere('key', 'calendar');
            $topic->update(['contenido_tema' => UnidadesTematicasGuiadasSeeder::topicBody($lesson)]);
            $unit->update(['objetivo_unidad' => $lesson['description']]);
        });
        PublicacionContenido::invalidate();
    }

    private function exercises(): array
    {
        return [
            ['origin' => 'u5-calendar-tiles-january-v3', 'type' => 'ordenar',
                'prompt' => 'Traduce «En enero me iré a casa» tocando las fichas en orden.',
                'elements' => [['id' => 'risha', 'texto' => 'risha'], ['id' => 'killapi', 'texto' => 'killapi'],
                    ['id' => 'wasiman', 'texto' => 'wasiman'], ['id' => 'kulla', 'texto' => 'Kulla']],
                'zones' => [], 'resource' => null, 'solution' => ['orden' => ['kulla', 'killapi', 'wasiman', 'risha']],
                'config' => ['title' => '1. Ordena la expresión', 'interactive_activity' => 'tiles',
                    'context_meaning' => 'En enero me iré a casa', 'presentation' => 'tiles',
                    'correct_feedback' => '¡Correcto! Formaste la expresión del mes de enero.',
                    'incorrect_feedback' => 'Empieza por Kulla, el nombre de enero.']],
            ['origin' => 'u5-calendar-tiles-wednesday-v3', 'type' => 'ordenar',
                'prompt' => 'Forma la oración del miércoles tocando las fichas en orden.',
                'elements' => [['id' => 'risha', 'texto' => 'risha'], ['id' => 'pukllanaman', 'texto' => 'pukllanaman'],
                    ['id' => 'chillay', 'texto' => 'Chillay'], ['id' => 'punchapi', 'texto' => 'punchapi']],
                'zones' => [], 'resource' => null, 'solution' => ['orden' => ['chillay', 'punchapi', 'pukllanaman', 'risha']],
                'config' => ['title' => '2. Forma la expresión', 'interactive_activity' => 'tiles',
                    'context_meaning' => 'El miércoles iré a jugar', 'presentation' => 'tiles',
                    'correct_feedback' => '¡Muy bien! Formaste la oración del miércoles.',
                    'incorrect_feedback' => 'Empieza por Chillay, el nombre del miércoles.']],
            ['origin' => 'u5-calendar-choice-sunday-v3', 'type' => 'completar',
                'prompt' => 'Elige el día que completa la expresión.',
                'elements' => [['id' => 'day', 'texto' => '_____ punchami sawarikrin · El domingo se va a casar',
                    'opciones' => ['Awaki', 'Chillay', 'Wacha', 'Inti']]],
                'zones' => [], 'resource' => null, 'solution' => ['textos' => ['day' => ['Inti']]],
                'config' => ['title' => '3. Elige el día', 'interactive_activity' => 'choice',
                    'correct_feedback' => '¡Exacto! Inti es domingo.',
                    'incorrect_feedback' => 'Revisa los nombres de los días en la lección.']],
            ['origin' => 'u5-calendar-choice-december-v3', 'type' => 'completar',
                'prompt' => 'Elige el mes que completa la expresión.',
                'elements' => [['id' => 'month', 'texto' => '_____ killapi aylluwan raymita rurasha · En diciembre celebro con mi familia',
                    'opciones' => ['Kulla', 'Raymi', 'Sasi', 'Kapak']]],
                'zones' => [], 'resource' => null, 'solution' => ['textos' => ['month' => ['Kapak']]],
                'config' => ['title' => '4. Elige el mes', 'interactive_activity' => 'choice',
                    'correct_feedback' => '¡Correcto! Kapak es diciembre.',
                    'incorrect_feedback' => 'Diciembre es el último mes del calendario.']],
            ['origin' => 'u5-calendar-writing-thursday-v3', 'type' => 'completar',
                'prompt' => 'Escribe en kichwa el día que falta.',
                'elements' => [['id' => 'day', 'texto' => '_____ punchapi Quituman risha · El jueves me iré a Quito']],
                'zones' => [], 'resource' => null, 'solution' => ['textos' => ['day' => ['Kullka']]],
                'config' => ['title' => '5. Escribe el día', 'interactive_activity' => 'writing',
                    'presentation' => 'writing',
                    'correct_feedback' => '¡Bien! Kullka es jueves.',
                    'incorrect_feedback' => 'Busca cómo se escribe jueves en la lección.']],
            ['origin' => 'u5-calendar-writing-season-v3', 'type' => 'completar',
                'prompt' => 'Escribe en kichwa la estación que falta.',
                'elements' => [['id' => 'season', 'texto' => '_____ Raymi pachapika ñuka turiwan tushunaman risha · En la época de la siembra me iré a bailar con mi hermano']],
                'zones' => [], 'resource' => null, 'solution' => ['textos' => ['season' => ['Inti']]],
                'config' => ['title' => '6. Escribe la estación', 'interactive_activity' => 'writing',
                    'presentation' => 'writing',
                    'correct_feedback' => '¡Correcto! Inti Raymi es la época de siembra y cosecha.',
                    'incorrect_feedback' => 'Busca el nombre de la época de siembra y cosecha.']],
        ];
    }
}
