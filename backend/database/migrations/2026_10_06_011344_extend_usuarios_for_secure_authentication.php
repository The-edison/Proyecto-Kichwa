<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared("ALTER TABLE usuarios ALTER COLUMN contrasena_usuario DROP NOT NULL;
        ALTER TABLE usuarios ADD COLUMN google_id varchar(255) UNIQUE;
        ALTER TABLE usuarios ADD COLUMN email_verified_at timestamptz;
        ALTER TABLE usuarios ADD COLUMN debe_cambiar_contrasena boolean NOT NULL DEFAULT false;
        ALTER TABLE usuarios ADD CONSTRAINT usuario_identidad CHECK (contrasena_usuario IS NOT NULL OR google_id IS NOT NULL);
        ALTER TABLE usuarios ADD CONSTRAINT usuario_cedula CHECK (cedula_usuario IS NULL OR cedula_usuario ~ '^[0-9]{10}$');");
    }

    public function down(): void
    {
        if (DB::table('usuarios')->whereNull('contrasena_usuario')->exists()) {
            throw new RuntimeException('No se puede revertir mientras existan cuentas sin contraseña.');
        }
        DB::unprepared('ALTER TABLE usuarios DROP CONSTRAINT usuario_identidad;
        ALTER TABLE usuarios DROP CONSTRAINT usuario_cedula;
        ALTER TABLE usuarios DROP COLUMN google_id;
        ALTER TABLE usuarios DROP COLUMN email_verified_at;
        ALTER TABLE usuarios DROP COLUMN debe_cambiar_contrasena;
        ALTER TABLE usuarios ALTER COLUMN contrasena_usuario SET NOT NULL;');
    }
};
