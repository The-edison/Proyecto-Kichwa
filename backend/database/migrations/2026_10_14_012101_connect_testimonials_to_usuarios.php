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
        Schema::table('testimonials', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->change();
            $table->foreignId('usuario_id')->nullable()->unique()->constrained('usuarios', 'id_usuario')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::table('testimonials')->whereNull('user_id')->exists()) {
            throw new RuntimeException('No se puede revertir sin perder opiniones de estudiantes.');
        }

        Schema::table('testimonials', function (Blueprint $table) {
            $table->dropConstrainedForeignId('usuario_id');
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
        });
    }
};
