<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('unidades', function (Blueprint $table): void {
            $table->jsonb('configuracion')->default(DB::raw("'{}'::jsonb"));
        });
    }

    public function down(): void
    {
        if (DB::table('unidades')->where('configuracion->learning_mode', 'sequence')->exists()) {
            throw new RuntimeException('Conservar las secuencias activas: recuperar una copia o aplicar una migración correctiva.');
        }
        Schema::table('unidades', function (Blueprint $table): void {
            $table->dropColumn('configuracion');
        });
    }
};
