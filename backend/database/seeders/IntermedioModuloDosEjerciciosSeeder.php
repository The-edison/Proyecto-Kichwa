<?php

namespace Database\Seeders;

use App\Models\Modulo;
use App\Models\Tema;
use App\Models\Unidad;
use Illuminate\Database\Seeder;

class IntermedioModuloDosEjerciciosSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(NivelSeeder::class);

        foreach ([
            [IntermedioMorfemasSeeder::class, IntermedioMorfemasEjerciciosSeeder::class, 'advanced-morphemes'],
            [IntermedioTiemposSeeder::class, IntermedioTiemposEjerciciosSeeder::class, 'time-morphemes'],
            [IntermedioAnalisisVerbalSeeder::class, IntermedioAnalisisVerbalEjerciciosSeeder::class, 'verbal-analysis'],
            [IntermedioDialogosSeeder::class, IntermedioDialogosEjerciciosSeeder::class, 'short-dialogues'],
        ] as [$lesson, $exercises, $key]) {
            if (! Tema::where('clave_leccion', $lesson::LESSON_KEY)->exists()) {
                $this->call($lesson);
            }

            $topic = Tema::where('clave_leccion', $lesson::LESSON_KEY)->firstOrFail();
            $unit = Unidad::findOrFail($topic->id_unidad);
            $unit->update(['publicado' => true, 'configuracion' => array_replace($unit->configuracion ?? [], ['learning_mode' => 'guided', 'guided_lesson' => $key])]);
            Modulo::whereKey($unit->id_modulo)->update(['publicado' => true]);
            $this->call($exercises);
        }
    }
}
