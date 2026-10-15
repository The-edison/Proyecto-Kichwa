import { Link } from '../navigation';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { StudentOpinionForm } from './StudentOpinionForm';
import type { StudentTestimonial } from '../types';

const examples = [
    'Las palabras nuevas se entienden mejor cuando puedo practicarlas después de cada lección.',
    'Me gusta avanzar a mi ritmo y volver a los contenidos que necesito repasar.',
    'Los ejercicios me ayudan a reconocer mis errores y a intentarlo otra vez.',
    'Aprender saludos y expresiones cotidianas hace que el Kichwa se sienta más cercano.',
    'Ver mi progreso me anima a continuar y a completar cada unidad.',
    'Compartir lo aprendido con otras personas puede mantener viva nuestra lengua.',
];

export function TestimonialsSection() {
    const { user } = useAuth();
    const testimonials = useApi<StudentTestimonial[]>('/testimonials');
    const visibleTestimonials = [
        ...(testimonials.data ?? []).map(testimonial => ({ ...testimonial, isExample: false })),
        ...examples.map((body, index) => ({ id: `example-${index}`, name: `Ejemplo ${String(index + 1).padStart(2, '0')}`, body, isExample: true })),
    ].slice(0, 6);

    return <section id="historias" className="mx-auto max-w-[1440px] px-[5%] py-20">
        <span className="eyebrow">HISTORIAS DE ESTUDIANTES</span>
        <h2 className="section-title mt-4">Historias de quienes aprenden Kichwa.</h2>
        <p className="section-lead mt-4 max-w-[760px]">Experiencias compartidas por nuestra comunidad. Aquí aparecen las seis opiniones más recientes; los espacios marcados como ejemplo son textos de muestra.</p>
        {testimonials.loading ? <p className="mt-8 text-muted" role="status">Cargando experiencias…</p> : testimonials.error ?
            <div className="mt-8"><p className="form-error" role="alert">No se pudieron cargar las opiniones.</p><button type="button" className="secondary-button mt-3" onClick={() => void testimonials.refresh()}>Volver a intentar</button></div> :
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visibleTestimonials.map(testimonial => <article className="glass-panel card-hover testimonial-card flex min-h-[260px] flex-col p-7" key={testimonial.id}>
                    <div className="flex items-center gap-4">
                        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-positive-soft font-bold text-forest" aria-hidden="true">{testimonial.isExample ? '✦' : testimonial.name.slice(0, 1).toUpperCase()}</span>
                        <div className="min-w-0"><h3 className="break-words font-bold text-ink">{testimonial.name}</h3><p className="text-sm text-muted">{testimonial.isExample ? 'Opinión de ejemplo' : 'Estudiante de Yachay'}</p></div>
                    </div>
                    <p className="mt-7 flex-1 whitespace-pre-line break-words text-lg leading-8 text-ink">“{testimonial.body}”</p>
                    <div className="mt-6 border-t border-line pt-4 text-xs font-semibold text-forest">{testimonial.isExample ? 'Texto de muestra' : 'Experiencia compartida en Yachay'}</div>
                </article>)}
            </div>}
        {user?.role === 'student' && <details className="glass-panel student-opinion-composer">
            <summary><MessageCircle size={21} aria-hidden="true" /><span>Escribe tu opinión sobre Yachay...</span><span className="student-opinion-composer-action">Comentar</span></summary>
            <div className="student-opinion-composer-body"><StudentOpinionForm compact /></div>
        </details>}
        {!user && <div className="glass-panel student-opinion-composer student-opinion-composer-guest">
            <MessageCircle size={21} aria-hidden="true" /><span>Comparte tu experiencia con otros estudiantes.</span><Link href="/iniciar-sesion">Iniciar sesión</Link>
        </div>}
    </section>;
}
