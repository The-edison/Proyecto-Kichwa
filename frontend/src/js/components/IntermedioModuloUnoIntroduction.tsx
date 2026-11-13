import { BookOpen, ChevronRight } from 'lucide-react';
import { LessonNote, LessonOverview } from './LessonOverview';
import '../../css/guided-introduction.css';

type Section = { title: string; explanation: string; steps: string[]; reminder: string; examples: Array<[string, string]> };
type Lesson = { title: string; description: string; sections: Section[] };

const lessons: Record<number, Lesson> = {
    1: {
        title: 'Conjugación en presente, pasado y futuro',
        description: 'Aprende a distinguir lo que ocurre ahora, lo que ya pasó y lo que sucederá después. Fíjate en la palabra de tiempo y en el verbo.',
        sections: [
            { title: 'Kunan pacha · presente', explanation: 'El presente habla de algo que ocurre hoy o en este momento. Kunan es la pista de tiempo que aparece en estas oraciones; el verbo cuenta qué hace la persona.', steps: ['Busca kunan: significa «hoy» o «ahora».', 'Encuentra la acción: llankani significa «trabajo» y upini significa «bebo».', 'Lee la oración completa: kunan + llankani comunica que trabajo hoy, no que trabajé ayer.'], reminder: 'Kunan indica el momento; llankani y upini expresan acciones que ocurren en el presente de estos ejemplos.', examples: [['kunan', 'hoy o ahora'], ['Kunan punchapimi ñuka chakrapi llankani.', 'Hoy trabajo en la chacra.'], ['Kunanmi yakuta upini.', 'Hoy bebo agua.']] },
            { title: 'Yallishka pacha · pasado', explanation: 'El pasado cuenta una acción que ya ocurrió. En el material, kayna sitúa la escena en ayer y verbos como rirkani y rikurka cuentan hechos terminados.', steps: ['Busca kayna: significa «ayer».', 'Observa el verbo: rirkani significa «fui»; rikurka significa «vio».', 'Compara «fui» con «voy» o «iré»: la primera acción ya terminó.'], reminder: 'Kayna ayuda a ubicar el tiempo. No confundas rirkani («fui») con risha («iré»).', examples: [['kayna', 'ayer'], ['Kaynami ñuka yachana wasiman rirkani.', 'Ayer fui a la escuela.'], ['Ñuka turika kayna punchami shuk allkuta rikurka.', 'Mi hermano vio un perro ayer.']] },
            { title: 'Shamuk pacha · futuro', explanation: 'El futuro habla de algo que todavía no sucede. Kaya anuncia mañana; en los ejemplos, risha y tarpushun indican acciones por venir.', steps: ['Busca kaya: significa «mañana».', 'Identifica la acción futura: risha significa «iré» y tarpushun significa «sembraremos».', 'Contrasta las tres ideas: kayna rirkani = ayer fui; kunan llankani = hoy trabajo; kaya risha = mañana iré.'], reminder: 'Una palabra de tiempo y el verbo deben apuntar al mismo momento cuando interpretas estas oraciones.', examples: [['kaya', 'mañana'], ['Kaya punchami chakraman risha.', 'Mañana iré a la chacra.'], ['Ñukanchikka murutami tarpushun.', 'Nosotros sembraremos granos.']] },
        ],
    },
    2: {
        title: 'Morfemas básicos',
        description: 'Una terminación pequeña cambia la función de una palabra. Aprende a reconocer tema, pertenencia, objeto, destino, lugar y procedencia.',
        sections: [
            { title: '-ka y -pa · tema y pertenencia', explanation: 'Un morfema se añade a una palabra y aporta información. En estos ejemplos, -ka señala de quién se está hablando; -pa indica de quién es algo.', steps: ['Empieza por la palabra base: mama = mamá; ñuka = yo.', 'Añade -ka a mama: mamaka presenta a la mamá como tema de la oración.', 'Añade -pa: mamapa significa «de la mamá» y ñukapa significa «mío» o «de mí».'], reminder: '-ka presenta el tema; -pa responde «¿de quién?». No significan lo mismo aunque se unan a la misma palabra.', examples: [['mama → mamaka', 'la mamá, como tema'], ['mama → mamapa', 'de la mamá'], ['ñuka → ñukapa', 'mío o de mí'], ['Mamaka allimi kan.', 'La mamá está bien; aquí se habla de la mamá.']] },
            { title: '-ta y -man · objeto y destino', explanation: '-ta ayuda a reconocer aquello sobre lo que recae una acción. -man marca la dirección o el lugar hacia el que alguien va.', steps: ['Pregunta «¿qué o a quién afecta la acción?»: en el material, wawata señala al bebé como objeto.', 'Pregunta «¿hacia dónde va?»: wasiman significa «hacia la casa».', 'En «Paymi wasiman rinka», wasiman indica el destino y rinka la acción de ir.'], reminder: '-ta mira el objeto de la acción; -man mira hacia dónde se dirige alguien.', examples: [['wawa → wawata', 'al bebé, como objeto'], ['wasi → wasiman', 'hacia la casa'], ['Paymi wasiman rinka.', 'Él irá a la casa.']] },
            { title: '-pi y -manta · lugar y procedencia', explanation: 'Estas dos terminaciones hablan de lugares, pero responden preguntas distintas. -pi ubica algo en un lugar; -manta indica de dónde viene.', steps: ['Si preguntas «¿dónde?», busca -pi: chakrapi = «en la chacra».', 'Si preguntas «¿de dónde?», busca -manta: chakramanta = «de la chacra».', 'Compara chakrapi con chakramanta: la palabra base chakra no cambia; cambia la relación con el lugar.'], reminder: 'Lugar donde ocurre: -pi. Punto de partida o procedencia: -manta.', examples: [['chakra → chakrapi', 'en la chacra'], ['chakra → chakramanta', 'de la chacra'], ['Quito → Quitomanta', 'desde Quito'], ['Chakrapi papakuna tyan.', 'En la chacra hay papas.']] },
        ],
    },
    3: {
        title: 'Morfemas medios',
        description: 'Reconoce terminaciones que indican con quién, hasta cuándo o dónde, por qué, a quién se parece algo y qué característica abunda.',
        sections: [
            { title: '-wan y -kama · compañía y límite', explanation: 'Las dos terminaciones responden preguntas diferentes. -wan indica compañía; -kama señala el punto hasta el que llega un recorrido o un tiempo.', steps: ['Pregunta «¿con quién?»: mamawan significa «con mamá» y mashiwan, «con un compañero».', 'Pregunta «¿hasta cuándo o hasta dónde?»: kayakama significa «hasta mañana»; yachanawasikama, «hasta la escuela».', 'Mira la palabra base antes del final: mama + wan habla de compañía; kaya + kama habla de un límite de tiempo.'], reminder: '-wan = con; -kama = hasta. La pregunta que hace la oración te ayuda a elegir.', examples: [['mama → mamawan', 'con mamá'], ['mashi → mashiwan', 'con un compañero'], ['kaya → kayakama', 'hasta mañana'], ['yachanawasi → yachanawasikama', 'hasta la escuela']] },
            { title: '-rayku y -shina · motivo y semejanza', explanation: '-rayku explica el motivo de una acción. -shina compara a una persona o cosa con otra: «como» o «parecido a».', steps: ['Pregunta «¿por quién o por qué?»: wawarayku significa «por el bebé».', 'Pregunta «¿como quién o como qué?»: taytashina significa «como el papá».', 'En «Wawarayku llankani» el motivo es el bebé; en «Taytashina purin» se compara la forma de caminar con la del papá.'], reminder: 'Un motivo usa -rayku. Una comparación usa -shina.', examples: [['wawa → wawarayku', 'por el bebé'], ['tayta → taytashina', 'como el papá'], ['Wawarayku llankani.', 'Trabajo por el bebé.'], ['Taytashina purin.', 'Camina como el papá.']] },
            { title: '-sapa · característica abundante', explanation: 'En las palabras de este material, -sapa indica que una característica es muy marcada o abundante. No expresa compañía, destino ni motivo.', steps: ['Identifica la palabra base: yaku se relaciona con agua y yuyay con pensamiento.', 'Observa qué añade -sapa: yakusapa describe algo jugoso; yuyaysapa describe a alguien muy inteligente.', 'Lee el significado de toda la palabra, porque la traducción natural no siempre se obtiene palabra por palabra.'], reminder: 'Busca una cualidad abundante o muy visible cuando encuentres -sapa en estos ejemplos.', examples: [['wiksa → wiksasapa', 'barrigón'], ['yuyay → yuyaysapa', 'muy inteligente'], ['yaku → yakusapa', 'jugoso'], ['shunku → shunkusapa', 'de gran corazón']] },
        ],
    },
    4: {
        title: 'Adverbios y ampliación de la oración',
        description: 'Amplía una oración con pistas de cuándo sucede la acción, dónde ocurre y cómo está alguien o algo.',
        sections: [
            { title: 'Kayna, kunan y kaya · cuándo', explanation: 'Estas palabras añaden información de tiempo sin reemplazar al verbo. Ayudan a saber si la oración habla de ayer, de hoy o de mañana.', steps: ['Busca la pregunta «¿cuándo?». Kayna responde «ayer»; kunan, «hoy o ahora»; kaya, «mañana».', 'Mira el verbo junto a esa palabra: kayna rirkani = «ayer fui»; kunan llankani = «hoy trabajo»; kaya risha = «mañana iré».', 'Si dos oraciones tienen acciones parecidas, la palabra de tiempo te ayuda a distinguir el momento.'], reminder: 'Primero encuentra la pista de tiempo; después verifica qué acción expresa el verbo.', examples: [['kayna', 'ayer'], ['kunan', 'hoy o ahora'], ['kaya', 'mañana'], ['Kaya punchami chakraman risha.', 'Mañana iré a la chacra.']] },
            { title: 'Kaypi y alli · dónde y cómo', explanation: 'Para ampliar una oración también puedes decir dónde ocurre algo o cómo está alguien. Kaypi señala «aquí»; alli comunica «bien» en los ejemplos.', steps: ['Pregunta «¿dónde vive?»: en «Kaypimi shuk wawa kawsan», kaypi responde «aquí».', 'Pregunta «¿cómo está?»: en «Ñuka mamaka allimi kan», alli responde «bien».', 'No intercambies las dos palabras: kaypi habla de lugar; alli habla de estado o cualidad.'], reminder: 'Kaypi = aquí; alli = bien. El resto de la oración indica qué ocurre en ese lugar o cómo está la persona.', examples: [['kaypi', 'aquí'], ['alli', 'bien'], ['Kaypimi shuk wawa kawsan.', 'Aquí vive un niño.'], ['Ñuka mamaka allimi kan.', 'Mi mamá está bien.']] },
        ],
    },
    5: {
        title: 'Afirmación, negación, pregunta y duda',
        description: 'Observa las pistas que convierten una idea en afirmación, negación, pregunta o posibilidad.',
        sections: [
            { title: '-mi/-m y mana…-chu · afirmar o negar', explanation: 'Una afirmación presenta una idea como cierta. En los ejemplos, -mi o -m refuerza esa afirmación. Para negar, mana aparece junto con -chu.', steps: ['Busca -mi en allpami: «Kay allpami alli kan» afirma que esta tierra es buena.', 'Para una negación, busca las dos piezas: mana antes de la acción y -chu al final de la forma verbal.', 'Lee «Ñuka mana yachana wasiman rirkani-chu»: la persona dice que no fue a la escuela.'], reminder: 'En estos ejemplos, -mi/-m acompaña una afirmación; mana…-chu expresa «no».', examples: [['Kay allpami alli kan.', 'Esta tierra sí es buena.'], ['Ñukami Kichwa shimita yachakuni.', 'Yo aprendo kichwa.'], ['Ñuka mana yachana wasiman rirkani-chu.', 'Yo no fui a la escuela.'], ['mana rinichu', 'no voy']] },
            { title: '-chu y -cha/-chari · preguntar o dudar', explanation: 'Una pregunta espera una respuesta. Una expresión de duda comunica «tal vez» o «quizá». Aunque se parecen, -chu y -cha/-chari cumplen funciones diferentes en este material.', steps: ['Si ves una pregunta como «yachakunkichu?», -chu indica que se puede responder sí o no.', 'Si ves paycha, interpreta «tal vez él o ella»: la idea no se presenta como segura.', 'En «karankachari», -chari también expresa posibilidad: quizá ocurrirá.'], reminder: 'Pregunta cerrada: -chu. Posibilidad o duda: -cha o -chari. En la negación, -chu aparece con mana.', examples: [['Kan Kichwa shimita yachakunkichu?', '¿Estás aprendiendo kichwa?'], ['Paycha kunan yachana wasiman rinka.', 'Tal vez él irá hoy a la escuela.'], ['Pachamamaka parata karankachari.', 'Quizá la Pachamama dará lluvia.'], ['rinkichu?', '¿irás?']] },
        ],
    },
};

export function intermedioModuloUnoPageCount(unitOrder: number): number {
    return lessons[unitOrder]?.sections.length ?? 1;
}

export function IntermedioModuloUnoIntroduction({ unitOrder, page, onSelectPage }: { unitOrder: number; page: number; onSelectPage: (page: number) => void }) {
    const lesson = lessons[unitOrder];
    if (!lesson) return null;
    const section = lesson.sections[page] ?? lesson.sections[0];

    return <div className="guided-introduction">
        <LessonOverview unit={`NIVEL INTERMEDIO · MÓDULO 1 · UNIDAD ${unitOrder}`} title={lesson.title} description={lesson.description} showGuide={false} />
        <nav className="mb-6 flex flex-wrap gap-2" aria-label="Partes de la lección">
            {lesson.sections.map((part, index) => <button type="button" key={part.title} onClick={() => onSelectPage(index)} aria-current={page === index ? 'step' : undefined} className={page === index ? 'primary-button' : 'secondary-button'}>{String(index + 1).padStart(2, '0')} · {part.title}</button>)}
        </nav>
        <section className="rounded-2xl border border-line bg-card p-5 md:p-7" aria-labelledby="intermedio-one-section-title">
            <div className="mx-auto max-w-4xl space-y-4">
                <span className="eyebrow">LECCIÓN {page + 1} DE {lesson.sections.length}</span>
                <h2 id="intermedio-one-section-title" className="font-serif text-2xl font-bold">{section.title}</h2>
                <p className="leading-7 text-muted">{section.explanation}</p>
                <div className="rounded-xl border border-line bg-background p-4">
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-forest">Entiéndelo paso a paso</h3>
                    <ol className="space-y-3">{section.steps.map((step, index) => <li className="flex gap-3 leading-6" key={step}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-positive-soft text-sm font-bold text-forest">{index + 1}</span><span>{step}</span></li>)}</ol>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-forest"><BookOpen size={18} aria-hidden="true" /> Observa los ejemplos <ChevronRight size={16} aria-hidden="true" /></div>
                <dl className="grid gap-2">{section.examples.map(([kichwa, spanish]) => <div key={kichwa} className="rounded-xl border border-line bg-background px-4 py-3"><dt className="font-bold text-ink">{kichwa}</dt><dd className="mt-1 text-sm text-muted">{spanish}</dd></div>)}</dl>
                <p className="rounded-xl bg-positive-soft p-4 text-sm leading-6 text-ink"><strong>Para recordar:</strong> {section.reminder}</p>
            </div>
        </section>
        <LessonNote>Lee las formas en kichwa y su significado antes de pasar a los ejercicios. Puedes volver a cualquier parte de la lección con los botones de arriba.</LessonNote>
    </div>;
}
