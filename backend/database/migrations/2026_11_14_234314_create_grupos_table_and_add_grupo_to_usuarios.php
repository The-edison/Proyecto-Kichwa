<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('grupos', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100);
            $table->string('codigo', 9)->unique();
            $table->boolean('activo')->default(true);
            $table->foreignId('admin_id')->constrained('usuarios', 'id_usuario')->restrictOnDelete();
            $table->index(['admin_id', 'id']);
            $table->timestamps();
        });
        Schema::table('usuarios', function (Blueprint $table) {
            $table->foreignId('grupo_id')->nullable()->constrained('grupos')->nullOnDelete();
            $table->index('grupo_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            $table->dropConstrainedForeignId('grupo_id');
        });
        Schema::dropIfExists('grupos');
    }
};
