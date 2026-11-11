import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { randomUUID, createHash } from 'node:crypto';

// Comprobación HTTP independiente. El informe NO se presenta como resultado de Postman Runner.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const collection=JSON.parse(readFileSync(resolve(root,'Yachay-Sprint4.postman_collection.json'),'utf8'));
const inicio=new Date().toISOString();
const collectionHash=createHash('sha256').update(readFileSync(resolve(root,'Yachay-Sprint4.postman_collection.json'))).digest('hex');
const env=Object.fromEntries(JSON.parse(readFileSync(resolve(root,'Yachay-Produccion.postman_environment.json'),'utf8')).values.map(v=>[v.key,v.value]));
if(env.base_url!=='https://yachay-kichwa.devs-ueb.tech'||env.allow_writes!=='false')throw Error('Este comprobador solo permite el origen de producción predefinido y allow_writes=false.');
const store=new Map();
const replace=value=>value.replace(/\{\{([^}]+)\}\}/g,(_,key)=>key==='$guid'?randomUUID():store.get(key)??env[key]??'{{'+key+'}}');
const variables={get:key=>store.get(key),set:(key,value)=>store.set(key,String(value)),unset:key=>store.delete(key),replaceIn:replace};
const results=[];
for(const folder of collection.item.slice(0,2))for(const item of folder.item){
    if(item.request.method!=='GET')throw Error('Se bloqueó un método distinto de GET.');
    const headers=new Headers({Accept:'application/json'});
    let skipped=false;
    const tests=[];
    const pm={environment:{get:key=>env[key]},variables,execution:{skipRequest:()=>{skipped=true;}},request:{headers:{upsert:({key,value})=>headers.set(key,value),remove:key=>headers.delete(key)}},test:(name,callback)=>{try{callback();tests.push({nombre:name,correcto:true});}catch(error){tests.push({nombre:name,correcto:false,error:error.message});}}};
    const id=item.name.split(' · ')[0];
    new Script(item.event[0].script.exec.join('\n')).runInNewContext({pm,console});
    if(skipped){results.push({id,estado:'omitida',motivo:'Requisito no disponible'});continue;}
    const url=replace(item.request.url);
    if(!url.startsWith(env.base_url+'/api/')||url.includes('{{'))throw Error('URL no permitida o no resuelta.');
    const started=Date.now();
    try{
        const response=await fetch(url,{method:'GET',headers,redirect:'manual',signal:AbortSignal.timeout(15000)});
        const body=await response.text();
        pm.response={code:response.status,headers:response.headers,json:()=>JSON.parse(body),text:()=>body};
        new Script(item.event[1].script.exec.join('\n')).runInNewContext({pm});
        results.push({id,metodo:'GET',http:response.status,duracion_ms:Date.now()-started,cabeceras:{content_type:response.headers.get('Content-Type'),nosniff:response.headers.get('X-Content-Type-Options'),cache_control:response.headers.get('Cache-Control')},estado:tests.every(t=>t.correcto)?'aprobada':'fallida',verificaciones:tests});
    }catch(error){results.push({id,estado:'fallida',duracion_ms:Date.now()-started,error:error.message});}
    await new Promise(resolve=>setTimeout(resolve,250));
}
const report={herramienta:'Node.js fetch + scripts de aserción de la colección (NO Postman Runner)',inicio_utc:inicio,fin_utc:new Date().toISOString(),sha256_coleccion:collectionHash,origen:env.base_url,alcance:'Solo carpetas 01 y 02; GET público/anónimo; sin cookies, tokens o cuerpos de respuesta guardados',total:results.length,aprobadas:results.filter(r=>r.estado==='aprobada').length,fallidas:results.filter(r=>r.estado==='fallida').length,omitidas:results.filter(r=>r.estado==='omitida').length,aserciones:results.flatMap(r=>r.verificaciones||[]).length,resultados:results};
writeFileSync(resolve(root,'comprobacion-publica-http.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({total:report.total,aprobadas:report.aprobadas,fallidas:report.fallidas,omitidas:report.omitidas}));
if(report.fallidas)process.exitCode=1;
