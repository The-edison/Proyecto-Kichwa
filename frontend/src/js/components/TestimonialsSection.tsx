import { Link } from '../navigation';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { StudentOpinionForm } from './StudentOpinionForm';
import type { StudentTestimonial } from '../types';
import type { HomeLanguage } from '../homeLanguage';

const copy = {
    es: {
        examples: [
            'Las palabras nuevas se entienden mejor cuando puedo practicarlas después de cada lección.',
            'Me gusta avanzar a mi ritmo y volver a los contenidos que necesito repasar.',
            'Los ejercicios me ayudan a reconocer mis errores y a intentarlo otra vez.',
            'Aprender saludos y expresiones cotidianas hace que el Kichwa se sienta más cercano.',
            'Ver mi progreso me anima a continuar y a completar cada unidad.',
            'Compartir lo aprendido con otras personas puede mantener viva nuestra lengua.',
        ],
        exampleName: 'Ejemplo', eyebrow: 'HISTORIAS DE ESTUDIANTES', title: 'Historias de quienes aprenden Kichwa.',
        intro: 'Experiencias compartidas por nuestra comunidad. Aquí aparecen las seis opiniones más recientes; los espacios marcados como ejemplo son textos de muestra.',
        loading: 'Cargando experiencias…', loadError: 'No se pudieron cargar las opiniones.', retry: 'Volver a intentar',
        exampleOpinion: 'Opinión de ejemplo', student: 'Estudiante de Yachay', exampleText: 'Texto de muestra', shared: 'Experiencia compartida en Yachay',
        write: 'Escribe tu opinión sobre Yachay...', comment: 'Comentar', share: 'Comparte tu experiencia con otros estudiantes.', login: 'Iniciar sesión',
    },
    qu: {
        examples: [
            'Mushuk shimikunata yachakushpa, sapa yachaymanta kipa rurashpa ashtawan hamutani.',
            'Ñukapa pachaman hina yachakuyta munani; yachashkakunata kutin rikuytapash munani.',
            'Ruraykunaka pantashkakunata rikuchin, kutin kallariyta yanapan.',
            'Napaykunata, punchantin rimaykunatapash yachakushpa kichwa shimita ashtawan riksini.',
            'Ñukapa ñawpariyta rikushpaka sapa yachayta tukuchinkapak kallpata charini.',
            'Yachashkata shuk runakunawan rakinaka ñukanchik shimita kawsachin.',
        ],
        exampleName: 'Rikuchiy', eyebrow: 'YACHAKUKKUNAPA RIMAYKUNA', title: 'Kichwa shimita yachakukkunapa rimaykuna.',
        intro: 'Ñukanchik ayllupa yachakuy rimaykuna. Kaypi sukta mushuk rimaykuna rikurin; rikuchiy nishkakunaka rikuchiy killkakunallami.',
        loading: 'Rimaykunata apamun…', loadError: 'Rimaykunata mana apamuyta usharirkanchu.', retry: 'Kutin ruray',
        exampleOpinion: 'Rikuchiy rimay', student: 'Yachaypi yachakuk', exampleText: 'Rikuchiy killka', shared: 'Yachaypi rakishka rimay',
        write: 'Yachaymanta kampa yuyayta killkay...', comment: 'Killkay', share: 'Yachakukkunawan kampa yachayta rakiy.', login: 'Yaykuy',
    },
} as const;

export function TestimonialsSection({ language = 'es' }: { language?: HomeLanguage }) {
    const t = copy[language];
    const cardCopy = copy.es;
    const { user } = useAuth();
    const testimonials = useApi<StudentTestimonial[]>('/testimonials?language=es');
    const visibleTestimonials = [
        ...(testimonials.data ?? []).map(testimonial => ({ ...testimonial, isExample: false })),
        ...cardCopy.examples.map((body, index) => ({ id: `example-${index}`, name: `${cardCopy.exampleName} ${String(index + 1).padStart(2, '0')}`, body, isExample: true })),
    ].slice(0, 6);

    return <section id="historias" lang="es" className="mx-auto max-w-[1440px] px-[5%] py-20">
        <span className="eyebrow" lang={language === 'qu' ? 'qu-EC' : 'es'}>{t.eyebrow}</span>
        <h2 className="section-title mt-4" lang={language === 'qu' ? 'qu-EC' : 'es'}>{t.title}</h2>
        <p className="section-lead mt-4 max-w-[760px]" lang={language === 'qu' ? 'qu-EC' : 'es'}>{t.intro}</p>
        {testimonials.loading ? <p className="mt-8 text-muted" role="status">{cardCopy.loading}</p> : testimonials.error ?
            <div className="mt-8"><p className="form-error" role="alert">{cardCopy.loadError}</p><button type="button" className="secondary-button mt-3" onClick={() => void testimonials.refresh()}>{cardCopy.retry}</button></div> :
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visibleTestimonials.map(testimonial => <article className="glass-panel card-hover testimonial-card flex min-h-[260px] flex-col p-7" key={testimonial.id}>
                    <div className="flex items-center gap-4">
                        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-positive-soft font-bold text-forest" aria-hidden="true">{testimonial.isExample ? '✦' : testimonial.name.slice(0, 1).toUpperCase()}</span>
                        <div className="min-w-0"><h3 className="break-words font-bold text-ink">{testimonial.name}</h3><p className="text-sm text-muted">{testimonial.isExample ? cardCopy.exampleOpinion : cardCopy.student}</p></div>
                    </div>
                    <p className="mt-7 flex-1 whitespace-pre-line break-words text-lg leading-8 text-ink">“{testimonial.body}”</p>
                    <div className="mt-6 border-t border-line pt-4 text-xs font-semibold text-forest">{testimonial.isExample ? cardCopy.exampleText : cardCopy.shared}</div>
                </article>)}
            </div>}
        {user?.role === 'student' && <details className="glass-panel student-opinion-composer">
            <summary><MessageCircle size={21} aria-hidden="true" /><span>{cardCopy.write}</span><span className="student-opinion-composer-action">{cardCopy.comment}</span></summary>
            <div className="student-opinion-composer-body"><StudentOpinionForm compact language="es" /></div>
        </details>}
        {!user && <div className="glass-panel student-opinion-composer student-opinion-composer-guest">
            <MessageCircle size={21} aria-hidden="true" /><span>{cardCopy.share}</span><Link href="/iniciar-sesion">{cardCopy.login}</Link>
        </div>}
    </section>;
}
