<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION public.kichwa_normalizar(text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$
    SELECT lower(regexp_replace(normalize($1, NFD), U&'[\0300-\036f]', '', 'g'))
$$;
SQL
        );

        $this->rebuildSearchIndexes();
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION public.kichwa_normalizar(text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$
    SELECT lower(regexp_replace(normalize($1, NFD), U&'[\0300-\036f]', '', 'g'))
$$;
SQL
        );

        $this->rebuildSearchIndexes();
    }

    private function rebuildSearchIndexes(): void
    {
        DB::statement('REINDEX INDEX public.diccionario_kichwa_busqueda_gin');
        DB::statement('REINDEX INDEX public.diccionario_espanol_busqueda_gin');
    }
};
