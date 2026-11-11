import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const workspace=resolve(root,'../../..');
const collection=JSON.parse(readFileSync(resolve(root,'Yachay-Sprint4.postman_collection.json'),'utf8'));
const cases=JSON.parse(readFileSync(resolve(root,'recursos/casos.json'),'utf8'));
const items=collection.item.flatMap(folder=>folder.item);
const routes=JSON.parse(execFileSync('php',['artisan','route:list','--path=api','--json'],{cwd:resolve(workspace,'backend'),encoding:'utf8',maxBuffer:2e6}));
assert.equal(collection.info.schema,'https://schema.getpostman.com/json/collection/v2.1.0/collection.json');
assert.equal(items.length,cases.length);
assert.equal(new Set(items.map(item=>item.name.split(' · ')[0])).size,items.length);
let guardChecks=0;
for(const [index,item] of items.entries()){
    const entry=cases[index];
    assert.equal(entry.id,'PI-'+String(index+1).padStart(2,'0'));
    assert.equal(item.request.auth.type,'noauth');
    assert.equal(item.protocolProfileBehavior.disableCookies,true);
    assert.equal(item.protocolProfileBehavior.followRedirects,false);
    assert.equal(item.response.length,0,'No deben almacenarse respuestas prefabricadas');
    const pathname=entry.ruta.split('?')[0].slice(1);
    assert(routes.some(route=>route.method.split('|').includes(entry.metodo)&&new RegExp('^'+route.uri.replace(/\{[^}]+\}/g,'[^/]+')+'$').test(pathname)),`${entry.id}: ruta o método inexistente`);
    for(const event of item.event)new Script(event.script.exec.join('\n'),{filename:entry.id+'-'+event.listen});
    if(item.request.body)JSON.parse(item.request.body.raw.replace(/\{\{[^}]+\}\}/g,'1'));
    const pre=item.event.find(e=>e.listen==='prerequest').script.exec.join('\n');
    function attempt(env){
        let skipped=false;
        const store=new Map();
        const vars={get:key=>store.has(key)?store.get(key):key.endsWith('_token')?undefined:'1',set:(key,value)=>store.set(key,value),unset:key=>store.delete(key),replaceIn:()=> '12345678-1234-1234-1234-123456789abc'};
        const headers=new Map();
        const pm={environment:{get:key=>env[key]},variables:vars,execution:{skipRequest:()=>{skipped=true;}},request:{headers:{upsert:({key,value})=>headers.set(key,value),remove:key=>headers.delete(key)}}};
        new Script(pre).runInNewContext({pm,console:{warn(){}},Date,Math});
        return {skipped,headers};
    }
    if(entry.entorno==='solo testing'){
        for(const base of ['https://yachay-kichwa.devs-ueb.tech','https://sub.yachay-kichwa.devs-ueb.tech','https://YACHAY-KICHWA.DEVS-UEB.TECH.']){
            assert(attempt({base_url:base,target_env:'testing',allow_writes:'true',allowed_test_origin:base}).skipped,entry.id+' no bloquea producción');guardChecks++;
        }
        assert(attempt({base_url:'http://127.0.0.1:8000',target_env:'testing',allow_writes:'false'}).skipped);guardChecks++;
        const env={base_url:'http://127.0.0.1:8000',target_env:'testing',allow_writes:'true',allowed_test_origin:'http://127.0.0.1:8000',student_token:'SESSION_PLACEHOLDER',admin_token:'SESSION_PLACEHOLDER',other_student_token:'SESSION_PLACEHOLDER',student_identifier:'fixture@example.invalid',student_password:'DUMMY_NOT_A_REAL_PASSWORD',admin_identifier:'fixture@example.invalid',admin_password:'DUMMY_NOT_A_REAL_PASSWORD'};
        assert(!attempt(env).skipped,entry.id+' no permite entorno aislado configurado');guardChecks++;
    }else if(entry.sesion==='anónima'){
        const result=attempt({base_url:'https://yachay-kichwa.devs-ueb.tech'});assert(!result.skipped);assert(!result.headers.has('Authorization'));guardChecks++;
    }else{
        assert(attempt({base_url:'https://yachay-kichwa.devs-ueb.tech'}).skipped);guardChecks++;
    }
}
for(const name of ['Yachay-Produccion','Yachay-Testing']){
    const env=JSON.parse(readFileSync(resolve(root,name+'.postman_environment.json'),'utf8'));
    for(const value of env.values)if(value.key.endsWith('_token')||value.key.endsWith('_password')||value.key.endsWith('_identifier'))assert.equal(value.value,'');
    assert.equal(env.values.find(v=>v.key==='allow_writes').value,'false');
}
const excludedReason=uri=>{
    if(uri.includes('google'))return 'Manual: OAuth depende de Google, cookies de sesión, CSRF y X-Tab-Session; no se simula ni se desactiva.';
    if(uri.includes('logout'))return 'Manual con cuenta desechable: revoca TODOS los tokens del usuario.';
    if(uri.includes('verification-notification'))return 'Manual con correo de pruebas: puede enviar mensajes reales.';
    if(uri.includes('learning-results')||uri.includes('students'))return 'Manual con cuentas aisladas: datos personales o bloqueo de cuentas; no se operan usuarios existentes.';
    if(uri.includes('/version'))return 'Ruta registrada; automatización positiva de versiones en exercises. Otras versiones requieren fixtures/bancos específicos.';
    if(uri.includes('/move'))return 'Ruta registrada; niveles/evaluaciones no admiten move (405); no es reordenación implementada.';
    if(uri.includes('/dependencies'))return 'Dependencias cubiertas por catálogo administrativo; revisar precondición de recurso existente.';
    if(uri.includes('/media')||uri.includes('/avatars'))return 'Descarga binaria positiva requiere archivo de prueba existente; casos negativos incluidos sin subir archivos.';
    return 'No automatizada en este paquete: consultar la sección de límites del LEEME; no se afirma cobertura total de variantes.';
};
const coverage=[];
for(const route of routes)for(const method of route.method.split('|').filter(m=>m!=='HEAD')){
    const matcher=new RegExp('^'+route.uri.replace(/\{[^}]+\}/g,'[^/]+')+'$');
    const ids=cases.filter(c=>c.metodo===method&&matcher.test(c.ruta.split('?')[0].slice(1))).map(c=>c.id);
    coverage.push({metodo:method,ruta:'/'+route.uri,controlador:route.action,middleware:route.middleware.join('; '),casos:ids.join('; '),alcance:ids.length?'Tiene casos definidos; NO implica ejecución ni cobertura de todas las variantes':excludedReason(route.uri)});
}
const csv=rows=> '\uFEFF'+[Object.keys(rows[0]),...rows.map(Object.values)].map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\n')+'\n';
writeFileSync(resolve(root,'cobertura-rutas.csv'),csv(coverage));
const report={tipo:'validación estática; no equivale a ejecución de la API',commitAnalizado:execFileSync('git',['rev-parse','HEAD'],{cwd:workspace,encoding:'utf8'}).trim(),casos:items.length,rutasVerificadas:items.length,scriptsCompilados:items.length*2,verificacionesDeBloqueo:guardChecks,metodosYRutasLaravel:coverage.length,metodosYRutasConCasos:coverage.filter(c=>c.casos).length,resultado:'correcto'};
writeFileSync(resolve(root,'validacion-estatica.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
