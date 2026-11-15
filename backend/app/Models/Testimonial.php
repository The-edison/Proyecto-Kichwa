<?php

namespace App\Models;

use App\Services\PuntajeComentario;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Testimonial extends Model
{
    protected $fillable = ['user_id', 'usuario_id', 'language', 'body'];

    protected function casts(): array
    {
        return ['puntaje' => 'integer', 'excluido' => 'boolean'];
    }

    protected static function booted(): void
    {
        static::saving(function (Testimonial $testimonial): void {
            $scorer = app(PuntajeComentario::class);
            $testimonial->body = $scorer->sanitize($testimonial->body);
            $testimonial->forceFill($scorer->calculate($testimonial->body));
        });
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
