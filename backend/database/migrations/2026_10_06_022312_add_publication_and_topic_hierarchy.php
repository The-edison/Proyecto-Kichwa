<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['modulos', 'unidades', 'temas'] as $table) {
            Schema::table($table, fn (Blueprint $t) => $t->boolean('publicado')->default(false));
            DB::table($table)->update(['publicado' => true]);
        }
        Schema::table('temas', fn (Blueprint $t) => $t->unique(['id_tema', 'id_unidad'], 'temas_identidad_unidad_unique'));
        Schema::table('actividades', function (Blueprint $t): void {
            $t->bigInteger('id_tema')->nullable();
            $t->foreign(['id_tema', 'id_unidad'], 'actividad_tema_unidad_fk')->references(['id_tema', 'id_unidad'])->on('temas')->restrictOnDelete();
            $t->index(['id_tema', 'orden_actividad']);
        });
        DB::statement('CREATE INDEX modulos_publicacion_nivel_idx ON modulos (id_nivel,publicado,orden_modulo)');
        DB::statement('CREATE INDEX unidades_publicacion_modulo_idx ON unidades (id_modulo,publicado,orden_unidad)');
        DB::statement('CREATE INDEX temas_publicacion_unidad_idx ON temas (id_unidad,publicado,orden_tema)');
        DB::statement('CREATE INDEX evaluaciones_unidad_idx ON evaluaciones (id_unidad)');
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE VIEW v_progreso AS
SELECT p.*, COALESCE(a.total_actividades,0) AS total_actividades,
       COALESCE(r.actividades_completadas,0) AS actividades_completadas,
       CASE WHEN COALESCE(a.total_actividades,0)=0 THEN 0::numeric
         ELSE round(100.0*COALESCE(r.actividades_completadas,0)/a.total_actividades,2) END AS porcentaje_progreso,
       CASE WHEN COALESCE(a.total_actividades,0)>0 AND COALESCE(r.actividades_completadas,0)=a.total_actividades
         THEN 'completado' ELSE 'en_curso' END::varchar(30) AS estado_progreso
FROM progreso p
LEFT JOIN (SELECT id_unidad,count(*) AS total_actividades FROM actividades a WHERE a.id_tema IS NULL OR EXISTS (SELECT 1 FROM temas t WHERE t.id_tema=a.id_tema AND t.publicado) GROUP BY id_unidad) a USING(id_unidad)
LEFT JOIN (SELECT r.id_usuario,a.id_unidad,count(DISTINCT r.id_actividad) AS actividades_completadas
 FROM respuestas_actividad r JOIN actividades a USING(id_actividad) WHERE r.acierto_actividad AND (a.id_tema IS NULL OR EXISTS (SELECT 1 FROM temas t WHERE t.id_tema=a.id_tema AND t.publicado)) GROUP BY r.id_usuario,a.id_unidad) r
 ON r.id_usuario=p.id_usuario AND r.id_unidad=p.id_unidad;

-- Incluye unidades aún no iniciadas con 0; no promedia sólo lo que el estudiante comenzó.
CREATE OR REPLACE VIEW v_progreso_modulos AS
SELECT un.id_usuario,m.id_modulo,m.id_nivel,
 COALESCE(round(avg(COALESCE(p.porcentaje_progreso,0)),2),0) AS porcentaje_progreso_modulo
FROM usuarios_niveles un JOIN modulos m ON m.id_nivel=un.id_nivel AND m.publicado
LEFT JOIN unidades u ON u.id_modulo=m.id_modulo AND u.publicado
LEFT JOIN v_progreso p ON p.id_usuario=un.id_usuario AND p.id_unidad=u.id_unidad
GROUP BY un.id_usuario,m.id_modulo,m.id_nivel;

CREATE OR REPLACE VIEW v_progreso_niveles AS
SELECT un.id_usuario,un.id_nivel,
 COALESCE(round(avg(COALESCE(p.porcentaje_progreso,0)) FILTER (WHERE u.id_unidad IS NOT NULL),2),0) AS porcentaje_progreso_nivel
FROM usuarios_niveles un LEFT JOIN modulos m ON m.id_nivel=un.id_nivel AND m.publicado
LEFT JOIN unidades u ON u.id_modulo=m.id_modulo AND u.publicado
LEFT JOIN v_progreso p ON p.id_usuario=un.id_usuario AND p.id_unidad=u.id_unidad
GROUP BY un.id_usuario,un.id_nivel;
SQL
        );
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE VIEW v_progreso AS
SELECT p.*, COALESCE(a.total_actividades,0) AS total_actividades,
       COALESCE(r.actividades_completadas,0) AS actividades_completadas,
       CASE WHEN COALESCE(a.total_actividades,0)=0 THEN 0::numeric
         ELSE round(100.0*COALESCE(r.actividades_completadas,0)/a.total_actividades,2) END AS porcentaje_progreso,
       CASE WHEN COALESCE(a.total_actividades,0)>0 AND COALESCE(r.actividades_completadas,0)=a.total_actividades
         THEN 'completado' ELSE 'en_curso' END::varchar(30) AS estado_progreso
FROM progreso p
LEFT JOIN (SELECT id_unidad,count(*) AS total_actividades FROM actividades GROUP BY id_unidad) a USING(id_unidad)
LEFT JOIN (SELECT r.id_usuario,a.id_unidad,count(DISTINCT r.id_actividad) AS actividades_completadas
 FROM respuestas_actividad r JOIN actividades a USING(id_actividad) WHERE r.acierto_actividad GROUP BY r.id_usuario,a.id_unidad) r
 ON r.id_usuario=p.id_usuario AND r.id_unidad=p.id_unidad;

-- Incluye unidades aún no iniciadas con 0; no promedia sólo lo que el estudiante comenzó.
CREATE OR REPLACE VIEW v_progreso_modulos AS
SELECT un.id_usuario,m.id_modulo,m.id_nivel,
 COALESCE(round(avg(COALESCE(p.porcentaje_progreso,0)),2),0) AS porcentaje_progreso_modulo
FROM usuarios_niveles un JOIN modulos m ON m.id_nivel=un.id_nivel
LEFT JOIN unidades u ON u.id_modulo=m.id_modulo
LEFT JOIN v_progreso p ON p.id_usuario=un.id_usuario AND p.id_unidad=u.id_unidad
GROUP BY un.id_usuario,m.id_modulo,m.id_nivel;

CREATE OR REPLACE VIEW v_progreso_niveles AS
SELECT un.id_usuario,un.id_nivel,
 COALESCE(round(avg(COALESCE(p.porcentaje_progreso,0)) FILTER (WHERE u.id_unidad IS NOT NULL),2),0) AS porcentaje_progreso_nivel
FROM usuarios_niveles un LEFT JOIN modulos m ON m.id_nivel=un.id_nivel
LEFT JOIN unidades u ON u.id_modulo=m.id_modulo
LEFT JOIN v_progreso p ON p.id_usuario=un.id_usuario AND p.id_unidad=u.id_unidad
GROUP BY un.id_usuario,un.id_nivel;
SQL
        );
        Schema::table('actividades', function (Blueprint $t): void {
            $t->dropForeign('actividad_tema_unidad_fk');
            $t->dropIndex(['id_tema', 'orden_actividad']);
            $t->dropColumn('id_tema');
        });
        Schema::table('temas', fn (Blueprint $t) => $t->dropUnique('temas_identidad_unidad_unique'));
        foreach (['modulos', 'unidades', 'temas'] as $table) {
            DB::statement("DROP INDEX {$table}_publicacion_".(['modulos' => 'nivel', 'unidades' => 'modulo', 'temas' => 'unidad'][$table]).'_idx');
            Schema::table($table, fn (Blueprint $t) => $t->dropColumn('publicado'));
        }
        DB::statement('DROP INDEX evaluaciones_unidad_idx');
    }
};
