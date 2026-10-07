<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('diccionario', function (Blueprint $table): void {
            $table->renameColumn('id_diccionario', 'id');
            $table->renameColumn('palabra_kichwa_diccionario', 'kichwa');
            $table->renameColumn('palabra_espanol_diccionario', 'español');
            $table->dropColumn(['sinonimos_diccionario', 'notas_diccionario']);
        });

        DB::statement('ALTER TABLE diccionario RENAME CONSTRAINT diccionario_palabra_kichwa_diccionario_palabra_espanol_dicc_key TO diccionario_kichwa_espanol_unique');

        if (Schema::hasTable('glossary')) {
            DB::statement('INSERT INTO diccionario (kichwa, "español") SELECT kichwa, spanish FROM glossary ON CONFLICT (kichwa, "español") DO NOTHING');
            Schema::drop('glossary');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new RuntimeException('Esta migración elimina metadatos y unifica las entradas. Para recuperar el esquema anterior y sus datos se requiere una copia de seguridad.');
    }
};
