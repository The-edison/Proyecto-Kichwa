<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('cedula', 10)->nullable()->change();
            $table->string('password')->nullable()->change();
            $table->string('google_id')->nullable()->unique();
        });
    }

    public function down(): void
    {
        if (DB::table('users')->whereNull('cedula')->orWhereNull('password')->exists()) {
            throw new RuntimeException('No se puede revertir mientras existan cuentas sin cédula o contraseña.');
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['google_id']);
            $table->dropColumn('google_id');
            $table->string('cedula', 10)->nullable(false)->change();
            $table->string('password')->nullable(false)->change();
        });
    }
};
