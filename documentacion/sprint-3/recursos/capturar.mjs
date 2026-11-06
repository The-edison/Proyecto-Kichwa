import { mkdirSync, writeFileSync } from 'node:fs';
const out = new URL('../capturas/', import.meta.url);
mkdirSync(out, { recursive: true });
const target = await (await fetch('http://127.0.0.1:9237/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let id = 0; const pending = new Map(); const requests = []; const errors = [];
ws.onmessage = event => {
    const data = JSON.parse(event.data);
    if (data.id) { const task = pending.get(data.id); if (task) { pending.delete(data.id); data.error ? task.reject(Error(JSON.stringify(data.error))) : task.resolve(data.result); } }
    if (data.method === 'Network.responseReceived' && data.params.response.url.includes('/api/')) requests.push({ url: data.params.response.url, status: data.params.response.status });
    if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.text);
};
function command(method, params = {}) { return new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params })); }); }
async function evaluate(expression) { const r = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.text); return r.result.value; }
async function waitFor(expression) { for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await new Promise(resolve => setTimeout(resolve, 100)); } throw Error('No se cumplió: ' + expression); }
await command('Page.enable'); await command('Runtime.enable'); await command('Network.enable');
await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
const screens = [];
async function capture(path, file, ready, title) {
    await command('Page.navigate', { url: 'http://127.0.0.1:5173' + path });
    await waitFor(ready);
    await evaluate('document.fonts.ready.then(() => true)');
    await new Promise(resolve => setTimeout(resolve, 600));
    const clip = path.startsWith('/diccionario') ? undefined : await evaluate('(() => { const r=document.querySelector(".auth-panel").getBoundingClientRect(); return {x:Math.max(0,r.x-12),y:Math.max(0,r.y-12),width:r.width+24,height:r.height+24,scale:1}; })()');
    const screenshot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, ...(clip ? {clip} : {}) });
    writeFileSync(new URL(file, out), Buffer.from(screenshot.data, 'base64'));
    screens.push({ archivo: file, titulo: title, ruta: path, fecha: new Date().toISOString(), encuadre:clip ?? 'viewport 1440x1000', alcance: 'Interfaz pública real; consultas GET; PostgreSQL en solo lectura; sesión y caché efímeras en memoria.', texto_visible: await evaluate('document.body.innerText') });
}
await capture('/iniciar-sesion','01-iniciar-sesion.png','Boolean(document.querySelector("input[type=password]"))','Formulario de inicio de sesión de Yachay');
await capture('/registro','02-registro.png','Boolean(document.querySelector("input[name=first_name]")) || document.body.innerText.includes("Crear cuenta")','Formulario de registro de estudiantes');
await capture('/recuperar-contrasena','03-recuperacion.png','Boolean(document.querySelector("input[type=email]"))','Solicitud de recuperación de contraseña');
await capture('/diccionario?q=yaku','04-diccionario.png','document.querySelector(".dictionary-entry") !== null','Consulta de equivalencias de yaku en el diccionario');
await evaluate('document.querySelector(".dictionary-language-bar > button").click()');
await evaluate('(() => { const input = document.querySelector("#dictionary-text"); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set.call(input,"agua"); input.dispatchEvent(new Event("input",{bubbles:true})); })()');
await waitFor('document.querySelector("#dictionary-text").value === "agua" && document.querySelector(".dictionary-output").getAttribute("aria-busy") === "false" && document.querySelector(".dictionary-entry") !== null');
await new Promise(resolve => setTimeout(resolve, 600));
writeFileSync(new URL('05-diccionario-inverso.png', out), Buffer.from((await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data, 'base64'));
screens.push({ archivo: '05-diccionario-inverso.png', ruta: '/diccionario', consulta: 'agua', direccion: 'es-kichwa', fecha: new Date().toISOString(), texto_visible: await evaluate('document.body.innerText') });
writeFileSync(new URL('../registros/capturas.json', out), JSON.stringify({ screens, requests, errors, metodo: 'Microsoft Edge headless; CDP; aplicación real sin respuestas simuladas; servidor efímero rechaza POST/PATCH/DELETE y configura PostgreSQL default_transaction_read_only=on.' }, null, 2));
await command('Page.close'); ws.close();
console.log(JSON.stringify({ capturas: screens.length, consultas_api: requests.length, errores: errors }));
