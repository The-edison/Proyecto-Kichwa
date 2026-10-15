<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('testimonials', function (Blueprint $table) {
            $table->string('language', 2)->default('es');
            $table->dropUnique(['usuario_id']);
            $table->unique(['usuario_id', 'language']);
        });
    }

    public function down(): void
    {
        if (DB::table('testimonials')->where('language', 'qu')->exists()) {
            throw new RuntimeException('No se puede revertir sin perder opiniones escritas en kichwa.');
        }

        Schema::table('testimonials', function (Blueprint $table) {
            $table->dropUnique(['usuario_id', 'language']);
            $table->dropColumn('language');
            $table->unique('usuario_id');
        });
    }
};
