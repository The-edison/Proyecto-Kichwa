<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS unaccent');
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        DB::unprepared(<<<'SQL'
CREATE FUNCTION public.kichwa_normalizar(text) RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$ SELECT lower(public.unaccent('public.unaccent', $1)) $$;
CREATE INDEX diccionario_kichwa_busqueda_gin ON diccionario USING gin (public.kichwa_normalizar(palabra_kichwa_diccionario) gin_trgm_ops);
CREATE INDEX diccionario_espanol_busqueda_gin ON diccionario USING gin (public.kichwa_normalizar(palabra_espanol_diccionario) gin_trgm_ops);
SQL
        );
        Schema::table('diccionario', function (Blueprint $t): void {
            $t->text('sinonimos_diccionario')->nullable();
            $t->text('notas_diccionario')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('diccionario', fn (Blueprint $t) => $t->dropColumn(['sinonimos_diccionario', 'notas_diccionario']));
        DB::statement('DROP INDEX diccionario_kichwa_busqueda_gin');
        DB::statement('DROP INDEX diccionario_espanol_busqueda_gin');
        DB::statement('DROP FUNCTION public.kichwa_normalizar(text)');
    }
};
