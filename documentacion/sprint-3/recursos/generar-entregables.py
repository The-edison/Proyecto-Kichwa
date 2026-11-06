"""Genera documentación editable con la biblioteca estándar, sin dependencias nuevas.

Conserva los bytes de la tesis fuera del intervalo de Sprint 3 y mantiene las
partes originales del paquete, salvo document.xml y sus relaciones de imágenes.
"""
from __future__ import annotations
import copy
import hashlib
import json
import re
import struct
import subprocess
import textwrap
import zipfile
from datetime import datetime, timezone, timedelta
from pathlib import Path
from xml.etree import ElementTree as ET
from xml.parsers import expat
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'documentacion/sprint-3'
SOURCE = ROOT / 'tmp/sprint3/tesis-original.docx'
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS = {'w': W}
ET.register_namespace('w', W)
NOW = datetime.now(timezone(timedelta(hours=-5))).isoformat()

# Identificadores, límites literales y contexto de cada extracto.
SPECS = {
    'F01': ('backend/database/migrations/2026_09_30_000004_create_unidades_table.php', 'CREATE TABLE unidades (', '    UNIQUE (id_modulo, orden_unidad)', 1, 'sql', 'up()', '4.4.4.2'),
    'F02': ('backend/app/Http/Controllers/Api/AuthController.php', '        $identifier = mb_strtolower', '        return $this->authenticate($request, $user);', 0, 'php', 'login()', '4.4.4.3'),
    'F03': ('backend/app/Http/Middleware/RequireRole.php', '    public function handle(', '        return $next($request);', 1, 'php', 'handle()', '4.4.4.3'),
    'F04': ('backend/app/Http/Controllers/Api/KichwaCatalogController.php', '    public static function publishedUnit(', '            ->where(\'modulos.publicado\', true)->where(\'unidades.publicado\', true)->where(\'unidades.id_unidad\', $id)->firstOrFail();', 1, 'php', 'publishedUnit()', '4.4.4.4'),
    'F05': ('backend/app/Services/EstadoContenido.php', '    public static function assertReady(', "            throw ValidationException::withMessages(['publication' => $errors]);", 2, 'php', 'assertReady()', '4.4.4.4'),
    'F06': ('backend/app/Services/ContratoEjercicio.php', "        if ($exercise['type'] === 'seleccion_multiple') {", "            return self::sameKeys($answer['seleccion'], $exercise['solution']['seleccion']);", 1, 'php', 'grade(), rama seleccion_multiple', '4.4.4.5'),
    'F07': ('backend/app/Http/Controllers/Api/KichwaSubmissionController.php', "            $content = KichwaResource::present('exercises', $record, true);", "                + DominioLecciones::rewardActivity($record, $answer) + ContratoEjercicio::itemResults($content, $data['answer']);", 0, 'php', 'activity()', '4.4.4.5'),
    'F08': ('backend/app/Http/Controllers/Api/KichwaSubmissionController.php', "            $maximum = (float) $questions->sum('puntaje_pregunta');", '            $attempt->save();', 0, 'php', 'submit()', '4.4.4.6'),
    'F09': ('backend/app/Services/ProgresoAprendizaje.php', '    public static function unitActivities(', "            'correct' => $items->pluck('lineage')->unique()->intersect($correct)->count(),", 2, 'php', 'unitActivities()', '4.4.4.7'),
    'F10': ('backend/app/Http/Controllers/Api/DiccionarioController.php', "        $data = $request->validate(['q'", "        $page = $query->orderBy($column)->orderBy('id')->paginate($q === '' ? 5 : 20);", 0, 'php', 'search()', '4.4.4.7'),
    'F11': ('frontend/src/js/services/api.ts', 'export async function apiRequest<T>', '        cache: \'no-store\',', 1, 'typescript', 'apiRequest(), construcción de solicitud', '4.4.4.8'),
    'F12': ('frontend/src/js/services/api.ts', '    if (response.status === 204)', '            payload?.errors ?? {},', 2, 'typescript', 'apiRequest(), tratamiento de respuesta', '4.4.4.8'),
    'F13': ('frontend/src/js/services/guidedAttempt.ts', 'export function writeGuidedAttempt(', '    return () => { subscribers.delete(listener); if (!subscribers.size) listeners.delete(key); };', 1, 'typescript', 'writeGuidedAttempt() y subscribeGuidedAttempt()', '4.4.4.9'),
}


def get_fragments():
    fragments = {}
    for key, (path, first, last, extra, language, method, section) in SPECS.items():
        source = (ROOT / path).read_text(encoding='utf-8').splitlines()
        starts = [i for i, line in enumerate(source) if line.startswith(first)]
        if key == 'F06':
            # La primera rama de este tipo en validate() no es la de grade().
            starts = [i for i in starts if i > next(j for j, s in enumerate(source) if 'public static function grade(' in s)]
        a = starts[0]
        b = next(i for i in range(a, len(source)) if source[i].startswith(last)) + extra
        raw = '\n'.join(source[a:b+1])
        text = textwrap.dedent(raw)
        fragments[key] = dict(id=key, archivo=path, inicio=a+1, fin=b+1,
                              metodo=method, apartado=section, lenguaje=language,
                              sha256_literal=hashlib.sha256(raw.encode()).hexdigest(), codigo=text)
    return fragments


def body_spans(data):
    parser = expat.ParserCreate()
    depth = 0
    spans = []
    active = None
    def start(name, attrs):
        nonlocal depth, active
        if depth == 2:
            active = parser.CurrentByteIndex
        depth += 1
    def end(name):
        nonlocal depth, active
        depth -= 1
        if depth == 2 and active is not None:
            pos = parser.CurrentByteIndex
            stop = data.index(b'>', pos) + 1 if data[pos:pos+2] == b'</' else pos
            spans.append((active, stop))
            active = None
    parser.StartElementHandler = start
    parser.EndElementHandler = end
    parser.Parse(data, True)
    return spans


def xml(element):
    return ET.tostring(element, encoding='unicode')


def child(element, name):
    return element.find('w:' + name, NS)


def run(text, font='Times New Roman', size=24, bold=False, italic=False):
    props = f'<w:rFonts w:ascii="{font}" w:hAnsi="{font}" w:cs="{font}"/><w:sz w:val="{size}"/><w:szCs w:val="{size}"/><w:lang w:val="es-EC"/>'
    if bold: props += '<w:b/><w:bCs/>'
    if italic: props += '<w:i/><w:iCs/>'
    return f'<w:r><w:rPr>{props}</w:rPr><w:t xml:space="preserve">{escape(text)}</w:t></w:r>'


def inline(text, size=24, bold=False):
    parts = re.split(r'(`[^`]+`|\*\*[^*]+\*\*)', text)
    return ''.join(run(s[1:-1], 'Consolas', min(size, 20), bold=bold) if s.startswith('`') else
                   run(s[2:-2], size=size, bold=True) if s.startswith('**') else
                   run(s, size=size, bold=bold) for s in parts if s)


def paragraph(text='', props=None, bold=False, size=24):
    ppr = props if props is not None else '<w:pPr><w:widowControl/><w:spacing w:before="0" w:after="120" w:line="360" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr>'
    return f'<w:p>{ppr}{inline(text, size, bold)}</w:p>'


def code_block(code):
    # Un párrafo por línea: texto editable, con ajuste visual automático.
    result = []
    rows = code.splitlines()
    for i, line in enumerate(rows):
        keep = '<w:keepNext/>' if i < len(rows)-1 else ''
        props = f'<w:pPr>{keep}<w:widowControl/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="atLeast"/><w:shd w:val="clear" w:fill="F3F3F3"/><w:ind w:left="120" w:right="120"/><w:jc w:val="left"/></w:pPr>'
        result.append(f'<w:p>{props}{run(line or " ", "Consolas", 19)}</w:p>')
    result.append(paragraph('', '<w:pPr><w:spacing w:after="60" w:line="120" w:lineRule="exact"/></w:pPr>'))
    return ''.join(result)


def make_table(rows, reference):
    tblpr = xml(child(reference, 'tblPr'))
    grid = child(reference, 'tblGrid')
    gridcols = list(grid)
    if len(gridcols) == len(rows[0]):
        widths = [int(c.attrib[f'{{{W}}}w']) for c in gridcols]
    else:
        widths = [2100, 2850, 3554] if len(rows[0]) == 3 else [709,3356,1363,1686,1390]
    # Nunca exceder el ancho original del texto de la sección (8504 twips).
    scale = 8504 / sum(widths)
    widths = [round(w*scale) for w in widths]
    gridxml = '<w:tblGrid>' + ''.join(f'<w:gridCol w:w="{w}"/>' for w in widths) + '</w:tblGrid>'
    rowsxml = []
    refrows = reference.findall('w:tr', NS)
    for rid, row in enumerate(rows):
        cellsxml = []
        refcells = refrows[min(rid, 1)].findall('w:tc', NS)
        for cid, value in enumerate(row):
            refp = refcells[min(cid, len(refcells)-1)].find('w:p/w:pPr', NS)
            ppr = xml(refp) if refp is not None else '<w:pPr><w:spacing w:after="100" w:line="259" w:lineRule="auto"/></w:pPr>'
            cellsxml.append(f'<w:tc><w:tcPr><w:tcW w:w="{widths[cid]}" w:type="dxa"/></w:tcPr>{paragraph(value, ppr, bold=rid==0)}</w:tc>')
        rowsxml.append('<w:tr><w:trPr>' + ('<w:tblHeader/>' if rid == 0 else '') + '<w:cantSplit/></w:trPr>' + ''.join(cellsxml) + '</w:tr>')
    return '<w:tbl>' + tblpr + gridxml + ''.join(rowsxml) + '</w:tbl>' + paragraph('')


def picture(path, rid, docid):
    data = path.read_bytes()
    width, height = struct.unpack('>II', data[16:24])
    cx = 8504 * 635
    cy = int(cx * height / width)
    if cy > 6.8 * 914400:
        cy = int(6.8 * 914400)
        cx = int(cy * width / height)
    return f'''<w:p><w:pPr><w:keepNext/><w:jc w:val="center"/></w:pPr><w:r><w:drawing>
<wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="{cx}" cy="{cy}"/><wp:docPr id="{docid}" name="{path.name}" descr="Captura real de Yachay"/><wp:cNvGraphicFramePr/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="{path.name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline>
</w:drawing></w:r></w:p>'''


def render_word(markdown, body):
    blocks = []
    media = []
    heading_refs = [body[801], body[802], body[804], body[813], body[816]]
    mainhead = 0
    lines = markdown.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip(): i += 1; continue
        if line.startswith('# ' ) or line.startswith('## '):
            ref = heading_refs[mainhead]; mainhead += 1
            ppr = xml(child(ref, 'pPr'))
            title = re.sub(r'^#+\s+\d+(?:\.\d+)*\s+', '', line)
            blocks.append(paragraph(title, ppr, bold=True))
        elif line.startswith('### '):
            props = '<w:pPr><w:keepNext/><w:widowControl/><w:spacing w:before="200" w:after="120" w:line="360" w:lineRule="auto"/><w:jc w:val="both"/><w:outlineLvl w:val="3"/></w:pPr>'
            blocks.append(paragraph(line[4:], props, bold=True))
        elif line.startswith('```'):
            i += 1; code = []
            while not lines[i].startswith('```'):
                code.append(lines[i]); i += 1
            blocks.append(code_block('\n'.join(code)))
        elif line.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                cells = [s.strip() for s in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-+:?', s) for s in cells): rows.append(cells)
                i += 1
            blocks.append(make_table(rows, body[815] if len(rows[0])==5 else body[831])); continue
        elif line.startswith('!['):
            match = re.fullmatch(r'!\[(.+)\]\((.+)\)', line)
            caption, file = match.groups()
            number = len(media)+1
            rid = f'rIdSprint3Figura{number}'
            blocks.append(picture(OUT / file, rid, 10000+number))
            props = '<w:pPr><w:keepNext/><w:spacing w:after="120" w:line="360" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>'
            blocks.append(paragraph(caption, props))
            media.append((rid, OUT / file, f'media/sprint3-figura-{number}.png'))
        elif line.startswith('- '):
            props = '<w:pPr><w:widowControl/><w:spacing w:after="100" w:line="360" w:lineRule="auto"/><w:ind w:left="360" w:hanging="240"/><w:jc w:val="both"/></w:pPr>'
            blocks.append(paragraph('• ' + line[2:], props))
        elif re.match(r'Tabla \d+\.', line):
            ppr = xml(child(body[814], 'pPr'))
            # Evitar que el título se separe de la cabecera de la tabla.
            ppr = ppr.replace('</w:pPr>', '<w:keepNext/></w:pPr>')
            blocks.append(paragraph(line, ppr))
        elif line.startswith('Fragmento F'):
            props = '<w:pPr><w:keepNext/><w:spacing w:before="120" w:after="80" w:line="280" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr>'
            blocks.append(paragraph(line, props, size=21))
        else:
            text = line
            while i+1 < len(lines) and lines[i+1].strip() and not re.match(r'[#|!`-]', lines[i+1]):
                i += 1; text += ' ' + lines[i]
            blocks.append(paragraph(text))
        i += 1
    assert mainhead == 5
    return ''.join(blocks).encode('utf-8'), media


def main():
    fragments = get_fragments()
    template = (OUT/'recursos/contenido.template.md').read_text(encoding='utf-8')
    def replacement(match):
        f = fragments[match[1]]
        label = f"Fragmento {f['id']}. `{f['archivo']}`, {f['metodo']}, líneas {f['inicio']}–{f['fin']}."
        return label + f"\n\n```{f['lenguaje']}\n{f['codigo']}\n```"
    md = re.sub(r'\{\{fragmento:(F\d+)\}\}', replacement, template)
    assert '{{fragmento:' not in md
    (OUT/'Sprint-3.md').write_text(md, encoding='utf-8')
    (OUT/'registros/fragmentos.json').write_text(json.dumps(fragments,ensure_ascii=False,indent=2), encoding='utf-8')
    with zipfile.ZipFile(SOURCE) as original:
        raw = original.read('word/document.xml')
        doc = ET.fromstring(raw)
        body = doc.find('w:body', NS)
        texts = [''.join(x.itertext()) for x in body]
        # Identificar el intervalo por el texto de los títulos, sin instrucciones del documento.
        start = next(i for i,x in enumerate(body) if ''.join(x.itertext()).startswith('SPRINT 3:'))
        stop = next(i for i,x in enumerate(body) if i > start and ''.join(x.itertext()).startswith('SPRINT 4:'))
        assert (start,stop) == (801,833), (start,stop)
        spans = body_spans(raw)
        assert len(spans) == len(body), (len(spans),len(body))
        new, media = render_word(md, body)
        a,b = spans[start][0], spans[stop][0]
        document = raw[:a] + new + raw[b:]
        ET.fromstring(document)
        rels = original.read('word/_rels/document.xml.rels')
        addition = ''.join(f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="{target}"/>' for rid,path,target in media).encode()
        rels_new = rels.replace(b'</Relationships>', addition + b'</Relationships>')
        assert rels_new != rels
        ET.fromstring(rels_new)
        filename = OUT/'TESIS 2.3 - Sprint 3 revisado.docx'
        with zipfile.ZipFile(filename,'w',compression=zipfile.ZIP_DEFLATED) as output:
            for entry in original.infolist():
                payload = document if entry.filename=='word/document.xml' else rels_new if entry.filename=='word/_rels/document.xml.rels' else original.read(entry.filename)
                output.writestr(copy.copy(entry),payload)
            for rid,path,target in media: output.writestr('word/'+target,path.read_bytes())
        with zipfile.ZipFile(filename) as output:
            changed = [name for name in original.namelist() if original.read(name) != output.read(name)]
            assert set(changed) == {'word/document.xml','word/_rels/document.xml.rels'}, changed
            assert output.testzip() is None
            generated = ET.fromstring(output.read('word/document.xml'))
            updated = generated.find('w:body',NS)
            after_count = len(body)-stop
            assert [ET.tostring(x) for x in body[:start]] == [ET.tostring(x) for x in updated[:start]]
            assert [ET.tostring(x) for x in body[stop:]] == [ET.tostring(x) for x in updated[-after_count:]]
            source_prefix, source_suffix = raw[:a], raw[b:]
            assert document.startswith(source_prefix) and document.endswith(source_suffix)
            doc_text = '\n'.join(''.join(p.itertext()) for p in updated)
            for f in fragments.values():
                for line in f['codigo'].splitlines():
                    if line: assert line in doc_text, (f['id'],line)
            validation = dict(fecha=NOW, archivo=filename.name, fuente_sha256=hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
                resultado_sha256=hashlib.sha256(filename.read_bytes()).hexdigest(), elementos_anteriores_intactos=start,
                elementos_posteriores_intactos=after_count, prefijo_xml_identico=True,sufijo_xml_identico=True,
                partes_originales_modificadas=changed, partes_originales_intactas=len(original.namelist())-2,
                imagenes_nuevas=len(media), fragmentos_literales=len(fragments), xml_valido=True,zip_valido=True,
                estilos_margenes_numeracion_headers_footers_originales='Conservados sin modificación en sus partes XML',
                renderizado_word='Pendiente de inspección visual')
    (OUT/'registros/validacion-documento.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(validation, ensure_ascii=True, indent=2))


if __name__ == '__main__': main()
