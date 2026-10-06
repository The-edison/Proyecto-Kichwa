import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import Parser from 'php-parser';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db=new PGlite();
const report=[];
async function ok(label,f){await f();report.push(label);console.log('OK',label);}
async function rejects(sql,code){try{await db.exec(sql);}catch(e){assert.equal(e.code,code,e.message);return;}throw Error('Se aceptó SQL inválido: '+sql);}
const read=n=>fs.readFileSync(path.join(base,n),'utf8');
await ok('Instalación transaccional de las 14 tablas, 5 vistas y reglas',()=>db.exec(read('database/sql/instalar.sql')));
await ok('Seed SQL de niveles y demostración; ejecución doble sin duplicar datos',async()=>{
 await db.exec(read('database/sql/semilla_niveles.sql'));await db.exec(read('database/sql/semilla_demo.sql'));
 const antes=JSON.stringify((await db.query('SELECT (SELECT count(*) FROM niveles) niveles,(SELECT count(*) FROM actividades) actividades,(SELECT count(*) FROM evaluaciones) evaluaciones,(SELECT count(*) FROM preguntas) preguntas')).rows);
 await db.exec(read('database/sql/semilla_niveles.sql'));await db.exec(read('database/sql/semilla_demo.sql'));
 assert.equal(antes,JSON.stringify((await db.query('SELECT (SELECT count(*) FROM niveles) niveles,(SELECT count(*) FROM actividades) actividades,(SELECT count(*) FROM evaluaciones) evaluaciones,(SELECT count(*) FROM preguntas) preguntas')).rows));
});
// Fixture privado y desechable; nunca se incluye en la semilla de producción.
await db.exec("INSERT INTO usuarios(nombre_usuario,correo_usuario,contrasena_usuario,rol_usuario) VALUES ('Prueba','prueba@example.test','HASH_FICTICIO_SOLO_PRUEBA','estudiante'),('Admin','admin@example.test','HASH_FICTICIO_SOLO_PRUEBA','administrador');");
const uid=(await db.query("SELECT id_usuario FROM usuarios WHERE rol_usuario='estudiante'")).rows[0].id_usuario;
const aid=(await db.query("SELECT id_usuario FROM usuarios WHERE rol_usuario='administrador'")).rows[0].id_usuario;
const unidad=(await db.query('SELECT id_unidad FROM unidades LIMIT 1')).rows[0].id_unidad;
const nivel=(await db.query("SELECT id_nivel FROM niveles WHERE nombre_nivel='Básico'")).rows[0].id_nivel;
const actividades=(await db.query('SELECT id_actividad FROM actividades ORDER BY orden_actividad')).rows;
const evals=(await db.query('SELECT id_evaluacion,tipo_evaluacion FROM evaluaciones')).rows;
const ev=evals.find(x=>x.tipo_evaluacion==='unidad').id_evaluacion;
const dx=evals.find(x=>x.tipo_evaluacion==='diagnostica').id_evaluacion;
const pregunta=(await db.query(`SELECT id_pregunta FROM preguntas WHERE id_evaluacion=${ev}`)).rows[0].id_pregunta;
const otra=(await db.query(`SELECT id_pregunta FROM preguntas WHERE id_evaluacion=${dx}`)).rows[0].id_pregunta;
await db.exec(`INSERT INTO usuarios_niveles(id_usuario,id_nivel) VALUES (${uid},${nivel});`);
await ok('Rechaza email duplicado y correo no normalizado',async()=>{
 await rejects("INSERT INTO usuarios(nombre_usuario,correo_usuario,contrasena_usuario) VALUES ('X','prueba@example.test','hash')",'23505');
 await rejects("INSERT INTO usuarios(nombre_usuario,correo_usuario,contrasena_usuario) VALUES ('X','Mayuscula@example.test','hash')",'23514');
});
await ok('Rol estudiante obligatorio para progreso e intentos',async()=>{
 await rejects(`INSERT INTO progreso(id_usuario,id_unidad) VALUES (${aid},${unidad})`,'23514');
 await rejects(`INSERT INTO intentos_evaluacion(id_usuario,id_evaluacion,numero_intento) VALUES (${aid},${ev},1)`,'23514');
});
await ok('Una sola asociación de nivel por estudiante',()=>rejects(`INSERT INTO usuarios_niveles(id_usuario,id_nivel) VALUES (${uid},${nivel})`,'23505'));
await ok('No permite transformar en administrador un estudiante con historial',()=>rejects(`UPDATE usuarios SET rol_usuario='administrador' WHERE id_usuario=${uid}`,'23514'));
await ok('JSON inválido o con forma incorrecta es rechazado',async()=>{
 await rejects(`INSERT INTO respuestas_actividad(id_usuario,id_actividad,respuesta_actividad,acierto_actividad,retroalimentacion_actividad) VALUES (${uid},${actividades[0].id_actividad},'[]',true,'Prueba')`,'23514');
 await rejects(`INSERT INTO respuestas_actividad(id_usuario,id_actividad,respuesta_actividad,acierto_actividad,retroalimentacion_actividad) VALUES (${uid},${actividades[0].id_actividad},'no json',true,'Prueba')`,'22P02');
 assert.equal((await db.query('SELECT count(*) n FROM progreso')).rows[0].n,0);
});
await ok('Práctica repetida cuenta una sola vez y conserva retroalimentación',async()=>{
 for(let i=0;i<2;i++)await db.exec(`INSERT INTO respuestas_actividad(id_usuario,id_actividad,respuesta_actividad,acierto_actividad,retroalimentacion_actividad) VALUES (${uid},${actividades[0].id_actividad},'{"seleccion":["a"]}',true,'Respuesta correcta')`);
 const p=(await db.query(`SELECT * FROM v_progreso WHERE id_usuario=${uid} AND id_unidad=${unidad}`)).rows[0];assert.equal(Number(p.porcentaje_progreso),25);assert.equal(p.actividades_completadas,1);
 await rejects(`INSERT INTO progreso(id_usuario,id_unidad) VALUES (${uid},${unidad})`,'23505');
});
await ok('Protege actividad y respuestas históricas',async()=>{
 await rejects(`UPDATE actividades SET enunciado_actividad='Cambio' WHERE id_actividad=${actividades[0].id_actividad}`,'23514');
 await rejects('UPDATE respuestas_actividad SET acierto_actividad=false','23514');
});
await ok('Progreso llega a 100 al acertar todas las actividades',async()=>{
 for(const a of actividades.slice(1))await db.exec(`INSERT INTO respuestas_actividad(id_usuario,id_actividad,respuesta_actividad,acierto_actividad,retroalimentacion_actividad) VALUES (${uid},${a.id_actividad},'{}',true,'Fixture técnico')`);
 let p=(await db.query(`SELECT * FROM v_progreso WHERE id_usuario=${uid}`)).rows[0];assert.equal(Number(p.porcentaje_progreso),100);assert.equal(p.estado_progreso,'completado');
});
await ok('Unidades no iniciadas cuentan como cero en módulo y nivel',async()=>{
 const modulo=(await db.query(`SELECT id_modulo FROM unidades WHERE id_unidad=${unidad}`)).rows[0].id_modulo;
 await db.exec(`INSERT INTO unidades(id_modulo,titulo_unidad,objetivo_unidad,orden_unidad) VALUES (${modulo},'Vacía','Fixture',2)`);
 let m=(await db.query(`SELECT * FROM v_progreso_modulos WHERE id_usuario=${uid}`)).rows[0];assert.equal(Number(m.porcentaje_progreso_modulo),50);
 let n=(await db.query(`SELECT * FROM v_progreso_niveles WHERE id_usuario=${uid}`)).rows[0];assert.equal(Number(n.porcentaje_progreso_nivel),50);
 const vacia=(await db.query("SELECT id_unidad FROM unidades WHERE titulo_unidad='Vacía'")).rows[0].id_unidad;
 await db.exec(`INSERT INTO progreso(id_usuario,id_unidad) VALUES (${uid},${vacia})`);
 assert.equal(Number((await db.query(`SELECT porcentaje_progreso FROM v_progreso WHERE id_unidad=${vacia}`)).rows[0].porcentaje_progreso),0);
});
await ok('Diagnóstico sin unidad permitido; evaluación de unidad sin unidad rechazada',async()=>{
 await rejects("INSERT INTO evaluaciones(titulo_evaluacion,tipo_evaluacion) VALUES ('Mal','unidad')",'23514');
 await rejects(`INSERT INTO evaluaciones(id_unidad,titulo_evaluacion,tipo_evaluacion) VALUES (${unidad},'Mal','diagnostica')`,'23514');
});
await db.exec(`INSERT INTO intentos_evaluacion(id_usuario,id_evaluacion,numero_intento) VALUES (${uid},${ev},1)`);
const intento=(await db.query(`SELECT id_intento FROM intentos_evaluacion WHERE id_usuario=${uid} AND id_evaluacion=${ev}`)).rows[0].id_intento;
await ok('Intentos únicos y un solo intento abierto por estudiante/evaluación',async()=>{
 await rejects(`INSERT INTO intentos_evaluacion(id_usuario,id_evaluacion,numero_intento) VALUES (${uid},${ev},1)`,'23505');
 await rejects(`INSERT INTO intentos_evaluacion(id_usuario,id_evaluacion,numero_intento) VALUES (${uid},${ev},2)`,'23505');
});
const response=(p,e,score)=>`INSERT INTO respuestas_evaluacion(id_intento,id_pregunta,id_evaluacion,respuesta_evaluacion,puntaje_respuesta_evaluacion) VALUES (${intento},${p},${e},'{"seleccion":["a"]}',${score})`;
await ok('Pregunta e intento de distintas evaluaciones son rechazados',()=>rejects(response(otra,dx,10),'23503'));
await ok('Puntuación negativa o excesiva es rechazada',async()=>{await rejects(response(pregunta,ev,11),'23514');await rejects(response(pregunta,ev,-1),'23514');});
await ok('Respuesta válida guardada y duplicado rechazado',async()=>{await db.exec(response(pregunta,ev,10));await rejects(response(pregunta,ev,10),'23505');});
await ok('No permite editar preguntas ni evaluación después del primer intento',async()=>{
 await rejects(`UPDATE preguntas SET puntaje_pregunta=20 WHERE id_pregunta=${pregunta}`,'23514');
 await rejects(`UPDATE evaluaciones SET titulo_evaluacion='Cambio' WHERE id_evaluacion=${ev}`,'23514');
});
await ok('Semillas repetibles incluso con historial existente',async()=>{await db.exec(read('database/sql/semilla_niveles.sql'));await db.exec(read('database/sql/semilla_demo.sql'));});
await ok('Calificación pendiente NULL y calificación final calculada',async()=>{
 assert.equal((await db.query(`SELECT calificacion_intento FROM v_intentos_evaluacion WHERE id_intento=${intento}`)).rows[0].calificacion_intento,null);
 await db.exec(`UPDATE intentos_evaluacion SET estado_intento='finalizado',fecha_fin_intento=CURRENT_TIMESTAMP WHERE id_intento=${intento}`);
 const r=(await db.query(`SELECT * FROM v_intentos_evaluacion WHERE id_intento=${intento}`)).rows[0];assert.equal(Number(r.calificacion_intento),10);assert.equal(Number(r.porcentaje_calificacion),100);
});
await ok('Intento finalizado y respuestas quedan protegidos',async()=>{
 await rejects(`UPDATE respuestas_evaluacion SET puntaje_respuesta_evaluacion=0 WHERE id_intento=${intento}`,'23514');
 await rejects(`DELETE FROM respuestas_evaluacion WHERE id_intento=${intento}`,'23514');
 await rejects(`UPDATE intentos_evaluacion SET estado_intento='en_curso',fecha_fin_intento=NULL WHERE id_intento=${intento}`,'23514');
});
await ok('Segundo intento válido al cerrar el anterior',()=>db.exec(`INSERT INTO intentos_evaluacion(id_usuario,id_evaluacion,numero_intento) VALUES (${uid},${ev},2)`));
await ok('Protege borrado de usuarios con historial',()=>rejects(`DELETE FROM usuarios WHERE id_usuario=${uid}`,'23001'));
await ok('Columnas y nulabilidad del diccionario coinciden con PostgreSQL',async()=>{
 const schema=JSON.parse(read('documentacion/esquema.json'));
 for(const table of schema){
  const cols=(await db.query("SELECT column_name,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",[table.name])).rows;
  assert.deepEqual(cols.map(c=>c.column_name),table.columns.map(c=>c.name));
  cols.forEach((c,i)=>assert.equal(c.is_nullable,table.columns[i].pk||table.columns[i].extra.includes('NOT NULL')?'NO':'YES'));
 }
});
await ok('Migraciones PHP contienen exactamente el SQL comprobado',async()=>{
 const files=fs.readdirSync(path.join(base,'database/migrations')).sort();
 const sqlfiles=fs.readdirSync(path.join(base,'database/sql')).filter(x=>/^\d\d_/.test(x)).sort();assert.equal(files.length,sqlfiles.length);
 files.forEach((f,i)=>assert.ok(read('database/migrations/'+f).includes(read('database/sql/'+sqlfiles[i]))));
});
let count=0;
await ok('Sintaxis PHP de todos los archivos analizada (php-parser)',async()=>{
 const parser=new Parser({parser:{extractDoc:true,phpVersion:'8.3'},ast:{withPositions:true}});
 function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(p.endsWith('.php')){parser.parseCode(fs.readFileSync(p,'utf8'),p);count++;}}}walk(base);
});
await ok('Desinstalación en orden inverso y reinstalación completas',async()=>{
 await db.exec(read('database/sql/desinstalar.sql'));
 assert.equal((await db.query("SELECT count(*) n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n,0);
 await db.exec(read('database/sql/instalar.sql'));await db.exec(read('database/sql/semilla_niveles.sql'));
});
const version=(await db.query('SELECT version() version')).rows[0].version;
fs.writeFileSync(path.join(base,'pruebas/resultado.json'),JSON.stringify({fecha:'2026-09-30',motor:version,pglite:'0.5.8',php_parser:'3.4.0',archivos_php:count,pruebas:report.length,resultados:report,limites:['No se ejecutó PHP/Artisan ni una instalación completa de Laravel.','No son pruebas de endpoints, React, Sanctum o concurrencia multisesión.','El motor es PostgreSQL embebido mediante PGlite, no el servidor del usuario.']},null,2));
await db.close();console.log('TOTAL',report.length,'PHP',count);
