"""Validación de los entregables; no ejecuta operaciones de la aplicación."""
import hashlib
import json
import re
import subprocess
import zipfile
from datetime import datetime, timezone, timedelta
from pathlib import Path
from xml.etree import ElementTree as E

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT/'documentacion/sprint-3'
read = lambda name: json.loads((OUT/'registros'/name).read_text(encoding='utf-8-sig'))
original=read('original-sin-cambios.json')
validation=read('validacion-documento.json')
assert original['sha256_original_actual']==validation['fuente_sha256']
fragments=read('fragmentos.json')
md=(OUT/'Sprint-3.md').read_text(encoding='utf-8')
assert not re.search(r'\{\{fragmento:',md)
assert len(re.findall(r'^### 4\.4\.4\.\d+ ',md,re.M))==10
assert len(re.findall(r'^Fragmento F\d+\.',md,re.M))==13
images=re.findall(r'^!\[[^\]]+\]\(([^)]+)\)',md,re.M)
assert len(images)==5
for image in images: assert (OUT/image).is_file()
for f in fragments.values():
    source=(ROOT/f['archivo']).read_text(encoding='utf-8').splitlines()
    raw='\n'.join(source[f['inicio']-1:f['fin']])
    assert hashlib.sha256(raw.encode()).hexdigest()==f['sha256_literal']
    assert f['codigo'] in md
sources=read('fuentes.json')
for s in sources: assert hashlib.sha256((ROOT/s['archivo']).read_bytes()).hexdigest()==s['sha256']
assert not subprocess.check_output(['git','diff','--name-only'],cwd=ROOT,text=True).strip()
for file in OUT.rglob('*.md'):
    text=file.read_text(encoding='utf-8')
    assert '\ufffd' not in text and 'Ã³' not in text and 'Â«' not in text,file
docx=OUT/'TESIS 2.3 - Sprint 3 revisado.docx'
assert hashlib.sha256(docx.read_bytes()).hexdigest()==validation['resultado_sha256']
with zipfile.ZipFile(docx) as z:
    assert z.testzip() is None
    xml_parts=[name for name in z.namelist() if name.endswith('.xml') or name.endswith('.rels')]
    for part in xml_parts: E.fromstring(z.read(part))
    rels=E.fromstring(z.read('word/_rels/document.xml.rels'))
    added=[r for r in rels if r.attrib['Id'].startswith('rIdSprint3Figura')]
    assert len(added)==5
    for r in added: assert 'word/'+r.attrib['Target'] in z.namelist()
    ct=E.fromstring(z.read('[Content_Types].xml'))
    assert any(r.attrib.get('Extension')=='png' for r in ct)
    doc=E.fromstring(z.read('word/document.xml'))
    ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    assert sum(1 for x in doc.findall('.//w:drawing',ns))>=5
    assert all(s in ''.join(doc.itertext()) for s in ['4.4.4.1 Organización','4.4.4.10 Comprobaciones','252 pruebas','116 entradas'])
api=read('capturas.json')
assert len(api['screens'])==5 and all(r['status'] in (200,204) for r in api['requests'])
assert len([r for r in api['requests'] if r['status']==200 and 'diccionario/buscar' in r['url']])==2
assert api['errors']==[]
frontend=(OUT/'registros/pruebas-frontend.txt').read_text(encoding='utf-8')
assert re.search(r'pass 252\b',frontend) and re.search(r'fail 0\b',frontend)
result=dict(fecha=datetime.now(timezone(timedelta(hours=-5))).isoformat(),comando='python recursos/verificar-entrega.py',
    resultado='APROBADO',original_externo_sin_cambios=True,codigo_rastreado_sin_cambios=True,
    fuentes_con_hash_verificado=len(sources),fragmentos_literales=13,imagenes_reales=5,
    apartados_de_resultados=10,partes_xml_validas=len(xml_parts),relaciones_imagen_validas=True,
    capturas_api_http_200=sum(r['status']==200 for r in api['requests']),
    capturas_preflight_http_204=sum(r['status']==204 for r in api['requests']),
    limite='Estructura y contenido; sin validación visual de paginación en Microsoft Word.')
(OUT/'registros/verificacion-final.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=True,indent=2))
