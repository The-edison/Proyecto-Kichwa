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

class IntermedioDialogosEjerciciosSeeder extends Seeder
{
    public function run(): void
    {
        $exercises = json_decode(file_get_contents(resource_path('lessons/intermediate-dialogues-exercises.json')), true, 512, JSON_THROW_ON_ERROR);
        DB::transaction(function () use ($exercises): void {
            DB::select('SELECT pg_advisory_xact_lock(20261108)');
            $topic = Tema::where('clave_leccion', IntermedioDialogosSeeder::LESSON_KEY)->firstOrFail();
            $unit = Unidad::whereKey($topic->id_unidad)->lockForUpdate()->firstOrFail();
            $order = (int) Actividad::where('id_unidad', $unit->id_unidad)->max('orden_actividad');
            foreach ($exercises as $index => $exercise) {
                $version = match ($index) {
                    4, 5 => 4,
                    6 => 3,
                    7 => 2,
                    default => 1,
                };
                $origin = 'intermedio-m2-u4-actividad-'.($index + 1).'-v'.$version;
                if (($exercise['published'] ?? true) === false) {
                    Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'like', 'intermedio-m2-u4-actividad-'.($index + 1).'-v%')->update(['publicado' => false]);

                    continue;
                }
                EstadoContenido::assertReady($exercise);
                $existing = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', $origin)->first();
                if ($existing) {
                    $attributes = KichwaResource::attributes('exercises', $exercise);
                    $attributes['publicado'] = true;
                    $attributes['configuracion'] = array_replace($existing->configuracion ?? [], $attributes['configuracion']);
                    $existing->update($attributes);

                    continue;
                }
                $record = new Actividad(KichwaResource::attributes('exercises', $exercise));
                $record->id_unidad = $unit->id_unidad;
                $record->origen_reactivo = $origin;
                $record->orden_actividad = ++$order;
                if ($version > 1) {
                    $previous = Actividad::where('id_unidad', $unit->id_unidad)->where('origen_reactivo', 'intermedio-m2-u4-actividad-'.($index + 1).'-v'.($version - 1))->first();
                    if ($previous) {
                        $record->orden_actividad = $previous->orden_actividad;
                        $previous->update(['publicado' => false, 'orden_actividad' => $order]);
                    }
                }
                $record->publicado = true;
                $record->save();
            }

            $records = Actividad::where('id_unidad', $unit->id_unidad)->orderBy('orden_actividad')->get();
            $origins = ['intermedio-m2-u4-actividad-1-v1', 'intermedio-m2-u4-actividad-2-v1',
                'intermedio-m2-u4-actividad-4-v1', 'intermedio-m2-u4-actividad-5-v4',
                'intermedio-m2-u4-actividad-6-v4', 'intermedio-m2-u4-actividad-8-v2'];
            $ordered = [];
            foreach ($origins as $origin) {
                $record = $records->firstWhere('origen_reactivo', $origin);
                if ($record) {
                    $ordered[$record->id_actividad] = $record;
                }
            }
            foreach ($records as $record) {
                $ordered[$record->id_actividad] ??= $record;
            }
            $position = 1 + (int) $records->max('orden_actividad');
            foreach ($ordered as $record) {
                $record->update(['orden_actividad' => $position++]);
            }
            foreach (array_values($ordered) as $index => $record) {
                $record->update(['orden_actividad' => $index + 1]);
            }
        });
        PublicacionContenido::invalidate();
    }
}
