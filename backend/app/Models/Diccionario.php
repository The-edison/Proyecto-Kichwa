<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Diccionario extends Model
{
    protected $table = 'diccionario';

    protected $primaryKey = 'id_diccionario';

    public $timestamps = false;

    protected $fillable = ['palabra_kichwa_diccionario', 'palabra_espanol_diccionario'];

    protected function casts(): array
    {
        return [];
    }
}
