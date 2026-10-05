<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GlossaryTerm extends Model
{
    protected $table = 'glossary';
    protected $fillable = ['spanish', 'kichwa', 'meaning', 'example_spanish', 'example_kichwa', 'is_published'];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
        ];
    }
}
