<?php

namespace Database\Seeders;

use App\Models\Modulo;
use App\Models\Nivel;
use App\Models\Tema;
use App\Models\Unidad;
use App\Services\PublicacionContenido;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class IntermedioMorfemasSeeder extends Seeder
{
    public const LESSON_KEY = 'intermedio-modulo2-unidad1-advanced-morphemes-v1';

    protected const RESOURCE_FILE = 'lessons/intermediate-morphemes.json';

    public function run(): void
    {
        $lesson = json_decode(file_get_contents(resource_path(static::RESOURCE_FILE)), true, 512, JSON_THROW_ON_ERROR);
        DB::transaction(function () use ($lesson): void {
            DB::select('SELECT pg_advisory_xact_lock(20261025)');
            $level = Nivel::where('orden_nivel', 2)->firstOrFail();
            $module = Modulo::where('id_nivel', $level->id_nivel)->where('orden_modulo', $lesson['module'])->lockForUpdate()->first();
            if (! $module) {
                $module = Modulo::create(['id_nivel' => $level->id_nivel, 'orden_modulo' => $lesson['module'],
                    'nombre_modulo' => 'Morfemas avanzados y construcción escrita',
                    'descripcion_modulo' => 'Comprende cómo cambian las palabras y construye expresiones en kichwa.', 'publicado' => true]);
            }
            $module->update(['publicado' => true]);
            $unit = Unidad::where('id_modulo', $module->id_modulo)->where('orden_unidad', $lesson['order'])->lockForUpdate()->first();
            if (! $unit) {
                $unit = Unidad::create(['id_modulo' => $module->id_modulo, 'orden_unidad' => $lesson['order'],
                    'titulo_unidad' => $lesson['title'], 'objetivo_unidad' => $lesson['description'], 'publicado' => true]);
            }
            $unit->update(['titulo_unidad' => $lesson['title'], 'objetivo_unidad' => $lesson['description'], 'publicado' => true,
                'configuracion' => array_replace($unit->configuracion ?? [], ['learning_mode' => 'guided', 'guided_lesson' => $lesson['key']])]);
            $body = [$lesson['description'], $lesson['note']];
            foreach ($lesson['sections'] as $section) {
                $body[] = $section['title']."\n".$section['position']."\n".$section['explanation']."\n".$section['instruction'];
                foreach ($section['forms'] as $form) {
                    $body[] = $form['base'].' = '.$form['baseMeaning']."\n".$form['word'].' = '.$form['meaning'];
                }
                foreach ($section['dialogues'] ?? [] as $dialogue) {
                    $body[] = $dialogue['title']."\n".$dialogue['context'];
                    foreach ($dialogue['turns'] as $turn) {
                        $body[] = $turn['speaker'].': '.$turn['text']."\n".$turn['meaning'];
                    }
                }
                $example = $section['example'];
                $body[] = trim($example['before'].' '.$example['focus'].' '.$example['after'])."\n".$example['meaning'];
                $body[] = $section['reminder'];
            }
            foreach ($lesson['destinations'] ?? [] as $destination) {
                $body[] = $destination['present']."\n".$destination['presentMeaning']."\n".$destination['future'].' '.$destination['followUp']."\n".$destination['futureMeaning'].' '.$destination['followUpMeaning'];
            }
            $topic = Tema::firstOrNew(['clave_leccion' => static::LESSON_KEY]);
            $topic->fill(['id_unidad' => $unit->id_unidad, 'tipo_tema' => 'gramatica', 'titulo_tema' => $lesson['title'],
                'contenido_tema' => implode("\n\n", $body), 'publicado' => true]);
            if (! $topic->exists) {
                $topic->orden_tema = 1 + (int) Tema::where('id_unidad', $unit->id_unidad)->max('orden_tema');
            }
            $topic->save();
        });
        PublicacionContenido::invalidate();
    }
}
