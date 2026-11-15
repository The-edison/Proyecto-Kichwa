<?php

namespace App\Console\Commands;

use App\Models\Testimonial;
use App\Services\ComentariosDestacados;
use App\Services\PuntajeComentario;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ActualizarComentariosDestacados extends Command
{
    protected $signature = 'comentarios:actualizar-destacados';

    protected $description = 'Recalcula opiniones existentes y regenera la selección automática semanal';

    public function handle(PuntajeComentario $scorer, ComentariosDestacados $featured): int
    {
        $updated = 0;
        foreach (Testimonial::select(['id', 'body'])->lazyById(200) as $testimonial) {
            $body = $scorer->sanitize($testimonial->body);
            $updated += DB::table('testimonials')->where('id', $testimonial->id)->where('body', $testimonial->body)
                ->update(['body' => $body, ...$scorer->calculate($body)]);
        }
        $selected = $featured->refresh()->count();
        $this->info("Opiniones recalculadas: {$updated}. Comentarios destacados: {$selected}.");

        return self::SUCCESS;
    }
}
