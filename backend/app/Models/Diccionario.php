<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Diccionario extends Model
{
    protected $table = 'diccionario';

    public $timestamps = false;

    protected $fillable = ['kichwa', 'español'];

    protected function casts(): array
    {
        return [];
    }
}
