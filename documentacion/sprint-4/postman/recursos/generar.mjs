import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(root, { recursive: true });
const production = 'https://yachay-kichwa.devs-ueb.tech';
const matrix = [];
const folders = new Map();
const common = `
function check(ok, message) { if (!ok) throw new Error(message); }
function fields(value, keys) { check(value !== null && typeof value === 'object' && !Array.isArray(value), 'Se esperaba objeto'); keys.forEach(k => check(Object.prototype.hasOwnProperty.call(value,k), 'Falta campo: '+k)); }
function list(value) { check(Array.isArray(value), 'Se esperaba arreglo'); }
function page(value) { fields(value,['data','current_page','last_page','per_page','total']); list(value.data); check(Number.isInteger(value.current_page)&&value.current_page>=1,'Página inválida'); check(Number.isInteger(value.total)&&value.total>=0,'Total inválido'); check(value.data.length<=value.per_page,'Límite de paginación'); }
function word(value) { fields(value,['id','kichwa','español']); check(Number.isInteger(value.id)&&value.id>0,'ID inválido'); check(typeof value.kichwa==='string'&&typeof value['español']==='string','Traducción inválida'); }
function published(value) { check(value.published===true,'Contenido no publicado expuesto'); }
function exercise(value) { fields(value,['id','type','prompt','elements','config']); list(value.elements); check(!('solution' in value),'Se expuso la solución'); ['explanation','correct_feedback','incorrect_feedback','word_target','missing_index','reveal_highlight'].forEach(k=>check(!(k in value.config),'Se expuso pista privada: '+k)); }
function profile(value,role) { fields(value,['id','name','email','role','debe_cambiar_contrasena']); check(value.role.code===role,'Rol incorrecto'); ['password','contrasena_usuario','remember_token','google_id'].forEach(k=>check(!(k in value),'Dato privado expuesto: '+k)); }
function save(key,value) { if(value!==null&&value!==undefined) pm.variables.set(key,String(value)); }
`;

function guard({id, mode, auth, requires, pre}) {
    return String.raw`
(function(){
 const id=${JSON.stringify(id)};
 const omit=reason=>{pm.variables.set('pi_omitted',String(Number(pm.variables.get('pi_omitted')||0)+1)); console.warn(id+' OMITIDA: '+reason); pm.execution.skipRequest();};
 if(typeof pm.execution.skipRequest!=='function') throw Error('Actualiza Postman: se requiere pm.execution.skipRequest. No ejecutar con un runtime antiguo.');
 const base=String(pm.environment.get('base_url')||'').replace(/\/$/,'');
 const match=base.match(/^(https?):\/\/(\[[a-fA-F0-9:]+\]|[a-zA-Z0-9.-]+)(:[0-9]{1,5})?$/);
 if(!match){omit('base_url debe ser un origen http(s), sin ruta, credenciales ni parámetros');return;}
 const host=match[2].toLowerCase().replace(/\.$/,'');
 if(match[1]!=='https'&&!['localhost','127.0.0.1','[::1]'].includes(host)){omit('HTTP solo permitido en localhost');return;}
 pm.variables.set('base_url',base);
 if(!pm.variables.get('pi_run_id')) pm.variables.set('pi_run_id',pm.variables.replaceIn('{{$guid}}').replace(/-/g,''));
 ${mode === 'test' ? String.raw`if(pm.environment.get('target_env')!=='testing'||String(pm.environment.get('allow_writes'))!=='true'||String(pm.environment.get('allowed_test_origin')||'').replace(/\/$/,'')!==base||host==='yachay-kichwa.devs-ueb.tech'||host.endsWith('.yachay-kichwa.devs-ueb.tech')){omit('Solo testing: requiere target_env=testing, allow_writes=true y allowed_test_origin=base_url; producción está bloqueada');return;}` : ''}
 ${auth ? `const token=pm.environment.get(${JSON.stringify(auth + '_token')})||pm.variables.get(${JSON.stringify('pi_'+auth+'_token')}); if(!token||String(token).includes('{{')){omit('Falta sesión ${auth}_token; no equivale a prueba aprobada');return;} pm.request.headers.upsert({key:'Authorization',value:'Bearer '+token});` : "pm.request.headers.remove('Authorization');"}
 pm.request.headers.remove('Cookie'); pm.request.headers.remove('Origin'); pm.request.headers.remove('Referer');
 ${requires.map(key => `if(!pm.variables.get(${JSON.stringify(key)})){omit('Falta requisito de ejecución: ${key}');return;}`).join('\n')}
 ${pre || ''}
})();`;
}

function add(folder, title, path, {method='GET', status=200, mode='safe', auth=null, requires=[], body, test='', criterion='', pre='', json=true, validation=[], source='backend/routes/api.php', capture=null}={}) {
    const id='PI-'+String(matrix.length+1).padStart(2,'0');
    if(!folders.has(folder)) folders.set(folder,[]);
    const expectedFields=[...test.matchAll(/fields\([^,]+,\[([^\]]+)\]/g)].map(match=>match[1].replaceAll("'",'')).join('; ');
    const acceptance=criterion || `HTTP ${status}; ${json?'JSON válido':'cuerpo vacío'}${expectedFields?'; campos: '+expectedFields:''}${test.includes('page(data)')?'; paginación data/current_page/last_page/per_page/total':''}${test.includes('word(')||test.includes('forEach(word)')?'; entradas id/kichwa/español':''}${test.includes('published(')?'; published=true':''}${test.includes('exercise(')||test.includes('forEach(exercise)')?'; ejercicios sin solution ni pistas privadas':''}${validation.length?'; errors para '+validation.join(', '):''}.`;
    const tests=common+`
pm.test(${JSON.stringify(id+' · HTTP '+status)},()=>check(pm.response.code===${status},'Esperado ${status}, recibido '+pm.response.code));
${json ? `pm.test(${JSON.stringify(id+' · Formato JSON')},()=>{check(/application\\/(?:[a-z.+-]*\\+)?json/i.test(pm.response.headers.get('Content-Type')||''),'Content-Type no es JSON'); pm.response.json();});
if(pm.response.code===${status}) {const data=pm.response.json();
pm.test(${JSON.stringify(id+' · Criterio de aceptación')},()=>{${status>=400?"fields(data,['message']); check(typeof data.message==='string','Mensaje inválido');":''}${validation.length?`fields(data,['errors']); ${JSON.stringify(validation)}.forEach(k=>check(Array.isArray(data.errors[k]),'Falta error de validación: '+k));`:''}${test}});
${capture || ''}
}` : `pm.test(${JSON.stringify(id+' · Sin cuerpo')},()=>check(pm.response.text()==='','Se esperaba cuerpo vacío'));`}
${status>=200&&status<300&&json?`if(pm.response.code===${status}) pm.test(${JSON.stringify(id+' · Cabeceras de seguridad')},()=>{check((pm.response.headers.get('X-Content-Type-Options')||'').split(',').some(v=>v.trim().toLowerCase()==='nosniff'),'Falta nosniff');check(/no-store/i.test(pm.response.headers.get('Cache-Control')||''),'Falta no-store para JSON API');});`:''}
`;
    const req={name:`${id} · ${title}`,description:`Funcionalidad: ${title}\n\nCriterio de aceptación: ${acceptance}\n\nClasificación: ${mode==='safe'?'LECTURA / PRODUCCIÓN':'SOLO TESTING (puede modificar datos o sesión)'}\nAutenticación: ${auth || 'ninguna; no se envían cookies ni bearer'}.\nFuente: ${source}.\nRequisitos: ${requires.join(', ')||'ninguno'}.\nUna omisión por falta de sesión o datos NO es un resultado aprobado.`,request:{method,auth:{type:'noauth'},header:[{key:'Accept',value:'application/json'},...(body!==undefined?[{key:'Content-Type',value:'application/json'}]:[])],url:`{{base_url}}/api${path}`},event:[{listen:'prerequest',script:{type:'text/javascript',exec:guard({id,mode,auth,requires,pre}).split('\n')}},{listen:'test',script:{type:'text/javascript',exec:tests.split('\n')}}],protocolProfileBehavior:{disableCookies:true,followRedirects:false},response:[]};
    req.request.description=req.description;
    if(body!==undefined)req.request.body={mode:'raw',raw:typeof body==='string'?body:JSON.stringify(body,null,2),options:{raw:{language:'json'}}};
    folders.get(folder).push(req);
    matrix.push({id,funcionalidad:title,metodo:method,ruta:'/api'+path,entorno:mode==='safe'?'producción: lectura':'solo testing',sesion:auth||'anónima',criterio:acceptance,fuente:source});
    return id;
}

const pub='01 · PRODUCCIÓN · Consultas públicas';
add(pub,'Configuración pública','/config',{test:"fields(data,['google']); fields(data.google,['enabled']); check(typeof data.google.enabled==='boolean','enabled debe ser booleano'); check(Object.keys(data.google).length===1,'Configuración OAuth privada expuesta');",criterion:'200; google.enabled booleano; no expone client_id ni client_secret.'});
add(pub,'Privacidad y configuración de sesión','/privacy',{test:"fields(data,['contact','session','google_enabled','password_breach_check','gmail_smtp','password_reset_minutes']); fields(data.session,['cookie','lifetime_minutes','expires_on_close','secure','http_only','same_site']); check(typeof data.session.http_only==='boolean','http_only inválido'); check(Number.isInteger(data.password_reset_minutes),'Caducidad inválida');",criterion:'200; contacto y metadatos públicos de sesión; tipos definidos por PrivacyController.'});
add(pub,'Diccionario paginado','/diccionario?page=1',{test:'page(data); data.data.forEach(word);',capture:"if(data.data.length){const first=data.data[0];save('pi_term_encoded',encodeURIComponent(first.kichwa.slice(0,100)));save('pi_spanish_encoded',encodeURIComponent(first['español'].slice(0,80)));save('pi_dictionary_id',first.id);}"});
add(pub,'Filtro tradicional por término existente','/diccionario?q={{pi_term_encoded}}',{requires:['pi_term_encoded'],test:"page(data); data.data.forEach(word); check(data.total>0,'No recuperó el término descubierto');"});
add(pub,'Búsqueda kichwa a español','/diccionario/buscar?direccion=kichwa-es&q={{pi_term_encoded}}',{requires:['pi_term_encoded'],test:"page(data); data.data.forEach(word); check(data.total>0,'No recuperó el término descubierto');"});
add(pub,'Búsqueda español a kichwa','/diccionario/buscar?direccion=es-kichwa&q={{pi_spanish_encoded}}',{requires:['pi_spanish_encoded'],test:"page(data);data.data.forEach(word);check(data.total>0,'No recuperó la definición descubierta');"});
add(pub,'Búsqueda inicial limitada a cinco entradas','/diccionario/buscar?direccion=kichwa-es',{test:"page(data); data.data.forEach(word); check(data.per_page===5&&data.data.length<=5,'No respeta límite inicial');"});
add(pub,'Búsqueda sin coincidencias','/diccionario/buscar?direccion=kichwa-es&q=zzzzPI{{pi_run_id}}',{test:"page(data); check(data.total===0&&data.data.length===0,'Se esperaban cero coincidencias');"});
add(pub,'Dirección inválida rechazada','/diccionario/buscar?direccion=invalida&q=wasi',{status:422,validation:['direccion']});
add(pub,'Página inválida rechazada','/diccionario/buscar?direccion=kichwa-es&page=0',{status:422,validation:['page']});
add(pub,'Consulta excesivamente larga rechazada','/diccionario/buscar?direccion=kichwa-es&q='+ 'a'.repeat(101),{status:422,validation:['q']});
add(pub,'Consulta con tipo incorrecto rechazada','/diccionario?q[]=wasi',{status:422,validation:['q']});
for(const language of ['es','qu'])add(pub,'Opiniones públicas: '+language,'/testimonials?language='+language,{test:`list(data); check(data.length<=6,'Más de seis opiniones'); data.forEach(v=>{fields(v,['id','name','body','language','created_at']);check(v.language==='${language}','Idioma incorrecto');check(!('email' in v)&&!('usuario_id' in v),'Identificador privado expuesto');});`});
add(pub,'Ruta de archivo no permitida','/media/archivo-no-permitido.txt',{status:404});
add(pub,'Nombre de avatar no permitido','/avatars/no-valido.txt',{status:404});

const guest='02 · PRODUCCIÓN · Restricciones sin sesión';
for(const [name,path] of [['Perfil privado','/auth/me'],['Niveles de estudiante','/levels'],['Navegación privada','/learning-navigation'],['Contenidos protegidos','/units/1/contents'],['Panel de administración','/admin/overview'],['Catálogo administrativo','/admin/levels'],['Informe de dominio','/mastery']])add(guest,name+' sin sesión',path,{status:401,criterion:'401 y JSON con message; sin cookies ni bearer. No debe redirigir al formulario de acceso.'});

const student='03 · PRODUCCIÓN · Lecturas con sesión de estudiante (opcional)';
add(student,'Perfil de estudiante','/auth/me',{auth:'student',test:"profile(data,'student');"});
add(student,'Niveles publicados','/levels',{auth:'student',test:"list(data);data.forEach(v=>{fields(v,['id','name','code','available','published']);published(v);});"});
add(student,'Descubrir jerarquía publicada sin inscripciones','/learning-navigation',{auth:'student',test:"list(data);data.forEach(l=>{fields(l,['id','name','available','modules']);list(l.modules);l.modules.forEach(m=>{fields(m,['id','title','units']);list(m.units);});});",capture:"const l=data.find(l=>l.modules.some(m=>m.units.length));if(l){const m=l.modules.find(m=>m.units.length);save('pi_level_id',l.id);save('pi_module_id',m.id);save('pi_unit_id',m.units[0].id);}"});
add(student,'Detalle de módulo publicado','/modules/{{pi_module_id}}',{auth:'student',requires:['pi_module_id'],test:"fields(data,['id','level_id','title','published','final_evaluation']);published(data);if(data.final_evaluation!==null)fields(data.final_evaluation,['id','title','unlocked']);"});
add(student,'Unidades publicadas del módulo','/modules/{{pi_module_id}}/units?page=1',{auth:'student',requires:['pi_module_id'],test:"page(data);data.data.forEach(v=>{fields(v,['id','module_id','title','percentage']);published(v);check(v.percentage>=0&&v.percentage<=100,'Porcentaje inválido');});"});
add(student,'Contenidos publicados del módulo','/modules/{{pi_module_id}}/contents?page=1',{auth:'student',requires:['pi_module_id'],test:"page(data);data.data.forEach(v=>{fields(v,['id','unit_id','kind','title','lesson_key','unit_title']);published(v);});",capture:"if(data.data.length){save('pi_topic_id',data.data[0].id);save('pi_topic_unit_id',data.data[0].unit_id);}"});
add(student,'Detalle de unidad publicada','/units/{{pi_unit_id}}',{auth:'student',requires:['pi_unit_id'],test:"fields(data,['id','module_id','title','config','level_id','percentage']);published(data);",capture:"if(data.config.learning_mode==='guided')save('pi_guided_id',data.id); if(data.config.learning_mode==='sequence')save('pi_sequence_id',data.id);"});
add(student,'Lección publicada con cuerpo','/units/{{pi_topic_unit_id}}/topics/{{pi_topic_id}}',{auth:'student',requires:['pi_topic_unit_id','pi_topic_id'],test:"fields(data,['id','unit_id','title','body','kind']);published(data);check(typeof data.body==='string','Cuerpo inválido');"});
add(student,'Ejercicios públicos sin soluciones','/units/{{pi_unit_id}}/exercises?page=1',{auth:'student',requires:['pi_unit_id'],test:'page(data);data.data.forEach(v=>{exercise(v);published(v);});'});
add(student,'Secuencia guiada sin soluciones','/units/{{pi_guided_id}}/guided',{auth:'student',requires:['pi_guided_id'],test:"fields(data,['exercises','total','completed_count']);list(data.exercises);check(data.total===data.exercises.length,'Total inconsistente');data.exercises.forEach(exercise);"});
add(student,'Secuencia de unidad configurada para sequence','/units/{{pi_sequence_id}}/sequence',{auth:'student',requires:['pi_sequence_id'],test:"fields(data,['exercises','total','completed_count','unlocked']);list(data.exercises);data.exercises.forEach(exercise);"});
add(student,'Evaluaciones publicadas del nivel','/levels/{{pi_level_id}}/evaluations',{auth:'student',requires:['pi_level_id'],test:"page(data);data.data.forEach(v=>{fields(v,['id','title','type']);published(v);});",capture:"if(data.data.length)save('pi_evaluation_id',data.data[0].id);"});
add(student,'Detalle de evaluación sin respuestas','/evaluations/{{pi_evaluation_id}}',{auth:'student',requires:['pi_evaluation_id'],test:"fields(data,['id','title','history','questions','module_final']);list(data.questions);data.questions.forEach(exercise);"});
add(student,'Dominio y progreso calculado sin inscripción','/mastery',{auth:'student',test:"fields(data,['learning_report','lessons','xp','medals','mastered_topics','completed_units']);check(typeof data.xp==='number'&&data.xp>=0,'XP inválido');['lessons','medals','mastered_topics','completed_units'].forEach(k=>list(data[k]));"});
add(student,'Elegibilidad de opiniones','/testimonials/eligibility',{auth:'student',test:"fields(data,['has_commented','can_comment','testimonial']);check(typeof data.can_comment==='boolean','Elegibilidad inválida');"});
add(student,'Estudiante no puede consultar administración','/admin/overview',{auth:'student',status:403});
add(student,'Unidad inexistente','/units/999999999999999999',{auth:'student',status:404});
add(student,'Identificador no numérico','/units/no-numerico',{auth:'student',status:404});
add(student,'Página negativa de ejercicios','/units/{{pi_unit_id}}/exercises?page=-1',{auth:'student',requires:['pi_unit_id'],status:422,validation:['page']});

const admin='04 · PRODUCCIÓN · Lecturas administrativas (opcional)';
add(admin,'Perfil de administrador','/auth/me',{auth:'admin',test:"profile(data,'admin');"});
add(admin,'Resumen administrativo','/admin/overview',{auth:'admin',test:"fields(data,['students','contents','exercises','diccionario']);Object.values(data).forEach(v=>check(Number.isInteger(v)&&v>=0,'Contador inválido'));"});
for(const resource of ['levels','modules','units','contents','exercises','evaluations','questions','diccionario']){
    add(admin,'Listado administrativo de '+resource,`/admin/${resource}?page=1&per_page=1`,{auth:'admin',test:'page(data);check(data.data.length<=1,"No respeta per_page");',capture:`if(data.data.length)save('pi_admin_${resource}_id',data.data[0].id);`});
    add(admin,'Detalle administrativo de '+resource,`/admin/${resource}/{{pi_admin_${resource}_id}}`,{auth:'admin',requires:[`pi_admin_${resource}_id`],test:"fields(data,['id']);"});
    if(resource!=='diccionario')add(admin,'Dependencias de '+resource,`/admin/${resource}/{{pi_admin_${resource}_id}}/dependencies`,{auth:'admin',requires:[`pi_admin_${resource}_id`],test:"fields(data,['dependencies']);"});
}
add(admin,'Catálogo de imágenes','/admin/media?kind=imagen',{auth:'admin',test:"fields(data,['data','current_page','last_page']);list(data.data);data.data.forEach(v=>fields(v,['path','name']));"});
add(admin,'Administrador no puede acceder como estudiante','/levels',{auth:'admin',status:403});

const negative='05 · SOLO TESTING · Validaciones y autenticación';
for(const role of ['student','admin'])add(negative,'Inicio de sesión válido de cuenta dedicada: '+role,'/auth/login',{method:'POST',mode:'test',body:{identifier:'{{pi_login_identifier}}',password:'{{pi_login_password}}'},pre:`const identifier=pm.environment.get('${role}_identifier');const password=pm.environment.get('${role}_password');if(!identifier||!password){omit('Credenciales opcionales de cuenta dedicada sin configurar');return;}pm.variables.set('pi_login_identifier',identifier);pm.variables.set('pi_login_password',password);`,test:`fields(data,['user','token']);profile(data.user,'${role}');check(typeof data.token==='string'&&data.token.length>0,'Falta token Sanctum');`,capture:`pm.variables.set('pi_${role}_token',data.token);`});
for(const [title,path,validation] of [['Acceso sin datos','/auth/login',['identifier','password']],['Registro incompleto','/auth/register',['first_name','last_name','email','password']],['Recuperación sin correo','/auth/forgot-password',['email']],['Restablecimiento incompleto','/auth/reset-password',['email','token','password']]])add(negative,title,path,{method:'POST',mode:'test',status:422,body:{},validation});
for(const [title,path,auth,validation] of [['Cambio de contraseña incompleto','/auth/change-password','student',['current_password','password']],['Avatar inválido','/auth/avatar','student',['preset']],['Opinión vacía','/testimonials','student',['body']],['Carga sin archivo','/admin/uploads','admin',['kind','file']],['Importación CSV sin archivo','/admin/diccionario/import','admin',['file']],['Vista previa sin ejercicio','/admin/preview','admin',['exercise','answer']]])add(negative,title,path,{method:'POST',mode:'test',auth,status:422,body:{},validation});
add(negative,'Escritura administrativa sin sesión','/admin/levels',{method:'POST',mode:'test',status:401,body:{}});
add(negative,'Estudiante no puede crear niveles','/admin/levels',{method:'POST',mode:'test',auth:'student',status:403,body:{name:'No debe crearse',description:'No debe crearse'}});
for(const resource of ['levels','modules','units','contents','exercises','evaluations','questions','diccionario'])add(negative,'Validación de creación: '+resource,'/admin/'+resource,{method:'POST',mode:'test',auth:'admin',status:422,body:{},test:"fields(data,['errors']);check(Object.keys(data.errors).length>0,'Se esperaban errores de validación');"});

const mutations='06 · SOLO TESTING · Jerarquía temporal, corrección e intentos';
const config={managed:true,reviewed:true,max_selections:1,exact_selections:true};
const selection={type:'seleccion_multiple',prompt:'Prueba de integración: selecciona wasi.',elements:[{id:'a',texto:'wasi'},{id:'b',texto:'yaku'}],zones:[],solution:{seleccion:['a']},config,published:true};
const cases=[
 ['levels',{name:'PI {{pi_run_id}}',description:'Fixture aislado de integración',published:true}],
 ['modules',{level_id:'{{pi_fixture_levels}}',title:'PI módulo {{pi_run_id}}',description:'Fixture aislado',published:true}],
 ['units',{module_id:'{{pi_fixture_modules}}',title:'PI unidad {{pi_run_id}}',description:'Fixture aislado',published:true,config:{learning_mode:'guided'}}],
 ['contents',{unit_id:'{{pi_fixture_units}}',kind:'grammar',title:'PI lección {{pi_run_id}}',body:'Contenido de integración',published:true}],
 ['exercises',{unit_id:'{{pi_fixture_units}}',...selection}],
 ['evaluations',{unit_id:'{{pi_fixture_units}}',type:'unidad',title:'PI evaluación {{pi_run_id}}',published:false,config:{managed:true,reviewed:true,question_count:1,pass_percentage:80,fixed_order:true}}],
 ['questions',{evaluation_id:'{{pi_fixture_evaluations}}',...selection,score:1}]
];
for(const [resource,body] of cases){
 const parents={modules:'levels',units:'modules',contents:'units',exercises:'units',evaluations:'units',questions:'evaluations'};
 const requires=parents[resource]?[`pi_fixture_${parents[resource]}`]:[];
 add(mutations,'Crear fixture de '+resource,'/admin/'+resource,{method:'POST',mode:'test',auth:'admin',requires,body,status:201,test:"fields(data,['id']);check(Number.isInteger(data.id)&&data.id>0,'ID inválido');",pre:`pm.variables.unset('pi_fixture_${resource}');`,capture:`save('pi_fixture_${resource}',data.id);`});
 add(mutations,'Leer fixture de '+resource,`/admin/${resource}/{{pi_fixture_${resource}}}`,{mode:'test',auth:'admin',requires:[`pi_fixture_${resource}`],test:"fields(data,['id']);"});
 add(mutations,'Actualizar fixture de '+resource,`/admin/${resource}/{{pi_fixture_${resource}}}`,{method:'PATCH',mode:'test',auth:'admin',requires:[`pi_fixture_${resource}`],body:resource==='levels'?{description:'Fixture actualizado'}:resource==='exercises'||resource==='questions'?{prompt:'Prueba de integración actualizada: selecciona wasi.'}:resource==='contents'?{body:'Contenido actualizado de integración'}:{title:'PI actualizado {{pi_run_id}}'},test:"fields(data,['id']);"});
 if(['modules','units','contents','exercises','questions'].includes(resource))add(mutations,'Mover hacia arriba fixture de '+resource,`/admin/${resource}/{{pi_fixture_${resource}}}/move`,{method:'PATCH',mode:'test',auth:'admin',requires:[`pi_fixture_${resource}`],body:{direction:'up'},test:"fields(data,['data']);list(data.data);check(data.data.length>=1&&data.data.length<=2,'Movimiento inválido');"});
}
add(mutations,'Rechazar eliminación de nivel con dependencias','/admin/levels/{{pi_fixture_levels}}',{method:'DELETE',mode:'test',auth:'admin',requires:['pi_fixture_levels','pi_fixture_modules'],status:409,test:"fields(data,['dependencies']);"});
add(mutations,'Rechazar contenido de otro padre','/units/{{pi_fixture_units}}/topics/{{pi_topic_id}}',{mode:'test',auth:'student',requires:['pi_fixture_units','pi_topic_id'],status:404});
add(mutations,'Inscripción implícita al consultar módulos','/levels/{{pi_fixture_levels}}/modules',{mode:'test',auth:'student',requires:['pi_fixture_levels'],test:'page(data);'});
add(mutations,'Progreso implícito al consultar temas','/units/{{pi_fixture_units}}/contents',{mode:'test',auth:'student',requires:['pi_fixture_units'],test:'page(data);'});
add(mutations,'Progreso global (puede crear matrículas)','/progress',{mode:'test',auth:'student',test:"list(data);data.forEach(v=>fields(v,['level','completed_activities','total_activities','percentage','evaluation_results']));"});
add(mutations,'Progreso del nivel (puede crear matrícula)','/progress/levels/{{pi_fixture_levels}}',{mode:'test',auth:'student',requires:['pi_fixture_levels'],test:"fields(data,['level','percentage','evaluation_results']);"});
add(mutations,'Resultado guiado incompleto rechazado','/units/{{pi_fixture_units}}/guided/result',{method:'POST',mode:'test',auth:'student',requires:['pi_fixture_units'],body:{response_ids:[]},status:422,validation:['response_ids']});
const practice={practice_attempt_id:'{{pi_practice_uuid}}',submission_id:'{{pi_submission_uuid}}',answer:{seleccion:['a']}};
add(mutations,'Respuesta incorrecta controlada','/exercises/{{pi_fixture_exercises}}/answer',{method:'POST',mode:'test',auth:'student',requires:['pi_fixture_exercises'],pre:"pm.variables.set('pi_practice_uuid',pm.variables.replaceIn('{{$guid}}'));pm.variables.set('pi_submission_uuid',pm.variables.replaceIn('{{$guid}}'));",body:{answer:{seleccion:['b']}},test:"fields(data,['response_id','is_correct','feedback']);check(data.is_correct===false,'Aceptó respuesta incorrecta');"});
add(mutations,'Respuesta correcta controlada','/exercises/{{pi_fixture_exercises}}/answer',{method:'POST',mode:'test',auth:'student',requires:['pi_fixture_exercises','pi_practice_uuid','pi_submission_uuid'],body:practice,test:"fields(data,['response_id','is_correct','xp_earned','xp_total']);check(data.is_correct===true,'Rechazó respuesta correcta');",capture:"save('pi_response_id',data.response_id);"});
add(mutations,'Reenvío idempotente de respuesta','/exercises/{{pi_fixture_exercises}}/answer',{method:'POST',mode:'test',auth:'student',requires:['pi_fixture_exercises','pi_response_id','pi_practice_uuid','pi_submission_uuid'],body:practice,test:"check(String(data.response_id)===pm.variables.get('pi_response_id'),'Duplicó el envío');check(data.is_correct===true,'Cambió el acierto');"});
add(mutations,'Reenvío con contenido distinto rechazado','/exercises/{{pi_fixture_exercises}}/answer',{method:'POST',mode:'test',auth:'student',requires:['pi_fixture_exercises','pi_response_id','pi_practice_uuid','pi_submission_uuid'],body:{...practice,answer:{seleccion:['b']}},status:409});
add(mutations,'Resultado final de unidad guiada','/units/{{pi_fixture_units}}/guided/result',{method:'POST',mode:'test',auth:'student',requires:['pi_fixture_units','pi_response_id'],body:{response_ids:['{{pi_response_id}}'],practice_attempt_id:'{{pi_practice_uuid}}'},test:"fields(data,['score','max_score','correct_count','total_items','next_unit_id']);check(data.correct_count===1&&data.total_items===1,'Resultado incoherente');"});
add(mutations,'Publicar evaluación completa','/admin/evaluations/{{pi_fixture_evaluations}}',{method:'PATCH',mode:'test',auth:'admin',requires:['pi_fixture_evaluations','pi_fixture_questions'],body:{published:true},test:'published(data);'});
add(mutations,'Vista previa administrativa de evaluación','/admin/evaluations/{{pi_fixture_evaluations}}/preview',{mode:'test',auth:'admin',requires:['pi_fixture_evaluations','pi_fixture_questions'],test:"fields(data,['questions']);check(data.questions.length===1,'Número incorrecto');data.questions.forEach(exercise);"});
add(mutations,'Corregir vista previa sin crear intento','/admin/evaluations/{{pi_fixture_evaluations}}/preview',{method:'POST',mode:'test',auth:'admin',requires:['pi_fixture_evaluations','pi_fixture_questions'],body:{answers:[{question_id:'{{pi_fixture_questions}}',answer:{seleccion:['a']}}]},test:"fields(data,['score','results']);check(data.score===100,'Puntaje incorrecto');"});
add(mutations,'Iniciar intento aislado','/evaluations/{{pi_fixture_evaluations}}/attempts',{method:'POST',mode:'test',auth:'student',requires:['pi_fixture_evaluations'],body:{},pre:"pm.variables.unset('pi_attempt_id');",test:"fields(data,['attempt_id','state','questions','answers','result']);check(data.state==='en_curso','Estado incorrecto');check(data.questions.length===1,'Número incorrecto');data.questions.forEach(exercise);",capture:"save('pi_attempt_id',data.attempt_id);"});
add(mutations,'Reanudar intento propio','/attempts/{{pi_attempt_id}}',{mode:'test',auth:'student',requires:['pi_attempt_id'],test:"fields(data,['attempt_id','state','questions','answers']);check(String(data.attempt_id)===pm.variables.get('pi_attempt_id'),'Intento incorrecto');"});
add(mutations,'Guardar borrador del intento','/attempts/{{pi_attempt_id}}',{method:'PATCH',mode:'test',auth:'student',requires:['pi_attempt_id','pi_fixture_questions'],body:'{"answers":{"{{pi_fixture_questions}}":{"seleccion":["a"]}}}',test:"check(data.saved===true,'No guardó borrador');"});
add(mutations,'Pareja de tipo no compatible rechazada','/attempts/{{pi_attempt_id}}/pair',{method:'POST',mode:'test',auth:'student',requires:['pi_attempt_id','pi_fixture_questions'],body:{question_id:'{{pi_fixture_questions}}',origin:'a',destination:'b'},status:422});
add(mutations,'Finalizar evaluación controlada','/evaluations/{{pi_fixture_evaluations}}/submit',{method:'POST',mode:'test',auth:'student',requires:['pi_attempt_id','pi_fixture_evaluations','pi_fixture_questions'],body:{attempt_id:'{{pi_attempt_id}}',answers:[{question_id:'{{pi_fixture_questions}}',answer:{seleccion:['a']}}]},test:"fields(data,['score','correct_count','total_questions','results']);check(data.score===100&&data.correct_count===1,'Puntaje incorrecto');"});
add(mutations,'Otro estudiante no accede al intento','/attempts/{{pi_attempt_id}}',{mode:'test',auth:'other_student',requires:['pi_attempt_id'],status:404});
add(mutations,'Intento finalizado no admite borrador','/attempts/{{pi_attempt_id}}',{method:'PATCH',mode:'test',auth:'student',requires:['pi_attempt_id'],body:{answers:{}},status:409});
add(mutations,'Nueva versión de ejercicio con historial','/admin/exercises/{{pi_fixture_exercises}}/version',{method:'POST',mode:'test',auth:'admin',requires:['pi_fixture_exercises'],body:{},status:201,test:"fields(data,['id','published']);check(data.published===false,'Versión publicada sin revisión');",capture:"save('pi_disposable_version',data.id);"});
add(mutations,'Eliminar versión sin respuestas','/admin/exercises/{{pi_disposable_version}}',{method:'DELETE',mode:'test',auth:'admin',requires:['pi_disposable_version'],status:204,json:false});
add(mutations,'Ejercicio con historial no puede borrarse','/admin/exercises/{{pi_fixture_exercises}}',{method:'DELETE',mode:'test',auth:'admin',requires:['pi_fixture_exercises','pi_response_id'],status:409,test:"fields(data,['dependencies']);"});
add(mutations,'Iniciar segundo intento para abandonarlo','/evaluations/{{pi_fixture_evaluations}}/attempts',{method:'POST',mode:'test',auth:'student',requires:['pi_fixture_evaluations'],body:{},pre:"pm.variables.unset('pi_abandon_id');",test:"check(data.state==='en_curso','Estado incorrecto');",capture:"save('pi_abandon_id',data.attempt_id);"});
add(mutations,'Abandonar intento propio','/attempts/{{pi_abandon_id}}',{method:'DELETE',mode:'test',auth:'student',requires:['pi_abandon_id'],status:204,json:false});
add(mutations,'Revisar banco con historial rechazado','/admin/evaluations/{{pi_fixture_evaluations}}/review-bank',{method:'POST',mode:'test',auth:'admin',requires:['pi_fixture_evaluations','pi_attempt_id'],body:{confirmed:true},status:409});
add(mutations,'Sincronización de evaluación no final rechazada','/admin/evaluations/{{pi_fixture_evaluations}}/synchronize-bank',{method:'POST',mode:'test',auth:'admin',requires:['pi_fixture_evaluations'],body:{},status:422});
add(mutations,'Vista previa de selección correcta','/admin/preview',{method:'POST',mode:'test',auth:'admin',body:{exercise:selection,answer:{seleccion:['a']}},test:"fields(data,['is_correct','feedback']);check(data.is_correct===true,'Corrección incorrecta');"});
add(mutations,'Vista previa de selección incorrecta','/admin/preview',{method:'POST',mode:'test',auth:'admin',body:{exercise:selection,answer:{seleccion:['b']}},test:"check(data.is_correct===false,'Corrección incorrecta');"});
for(const resource of ['evaluations','units','modules','levels'])add(mutations,'Ocultar fixture de '+resource+' al finalizar',`/admin/${resource}/{{pi_fixture_${resource}}}`,{method:'PATCH',mode:'test',auth:'admin',requires:[`pi_fixture_${resource}`],body:{published:false},test:"check(data.published===false,'Fixture sigue publicado');"});

const cleanup='07 · SOLO TESTING · CRUD desechable sin historial';
add(cleanup,'Crear nivel desechable','/admin/levels',{method:'POST',mode:'test',auth:'admin',body:{name:'PI borrable {{pi_run_id}}',description:'Se elimina al final de este grupo',published:false},status:201,pre:"pm.variables.unset('pi_delete_level');",test:"fields(data,['id']);",capture:"save('pi_delete_level',data.id);"});
add(cleanup,'Dependencias vacías del nivel desechable','/admin/levels/{{pi_delete_level}}/dependencies',{mode:'test',auth:'admin',requires:['pi_delete_level'],test:"fields(data,['dependencies']);check(Object.values(data.dependencies).every(v=>v===0),'Dependencias inesperadas');"});
add(cleanup,'Eliminar exclusivamente el nivel recién creado','/admin/levels/{{pi_delete_level}}',{method:'DELETE',mode:'test',auth:'admin',requires:['pi_delete_level'],status:204,json:false});
add(cleanup,'Confirmar eliminación del nivel desechable','/admin/levels/{{pi_delete_level}}',{mode:'test',auth:'admin',requires:['pi_delete_level'],status:404});

const collection={info:{name:'Yachay · Sprint 4 · 4.5.3.3 · Integración API REST',description:'Colección basada en rutas, controladores y middleware reales. Grupos 01–04: solo lectura de negocio. Grupos 05–07: SOLO TESTING, bloqueados en producción. Algunas rutas GET crean matrículas/progreso: están en 06. Sin secretos ni respuestas simuladas almacenadas. Casos omitidos no equivalen a aprobados. Ejecutar con Postman actualizado, 1 iteración, 250 ms de demora, cookies desactivadas. Leer LEEME.md y matriz-pruebas.csv.',schema:'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'},auth:{type:'noauth'},item:[...folders].map(([name,item])=>({name,item})),variable:[]};
const env=(testing=false)=>({name:testing?'Yachay · SOLO TESTING (configurar origen)':'Yachay · Producción · Solo lectura',values:Object.entries({base_url:testing?'http://127.0.0.1:8000':production,target_env:testing?'testing':'production',allow_writes:'false',allowed_test_origin:'',student_token:'',admin_token:'',other_student_token:'',student_identifier:'',student_password:'',admin_identifier:'',admin_password:''}).map(([key,value])=>({key,value,type:key.endsWith('_token')||key.endsWith('_password')?'secret':'default',enabled:true})),_postman_variable_scope:'environment'});
writeFileSync(resolve(root,'Yachay-Sprint4.postman_collection.json'),JSON.stringify(collection,null,2)+'\n');
writeFileSync(resolve(root,'Yachay-Produccion.postman_environment.json'),JSON.stringify(env(),null,2)+'\n');
writeFileSync(resolve(root,'Yachay-Testing.postman_environment.json'),JSON.stringify(env(true),null,2)+'\n');
writeFileSync(resolve(root,'matriz-pruebas.csv'),'\uFEFF'+[Object.keys(matrix[0]),...matrix.map(row=>Object.values(row))].map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\n')+'\n');
writeFileSync(resolve(root,'recursos/casos.json'),JSON.stringify(matrix,null,2)+'\n');
console.log(JSON.stringify({pruebas:matrix.length,publicasSinSesion:matrix.filter(r=>r.entorno.startsWith('producción')&&r.sesion==='anónima').length,testing:matrix.filter(r=>r.entorno==='solo testing').length}));
