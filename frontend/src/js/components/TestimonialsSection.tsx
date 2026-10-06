import { Link } from '../navigation';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, ApiError } from '../services/api';

interface StudentTestimonial {
    id: number;
    name: string;
    body: string;
    created_at: string;
}

interface Eligibility {
    completed_intermediate: boolean;
    has_commented: boolean;
    can_comment: boolean;
}

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
    const [testimonials, setTestimonials] = useState<StudentTestimonial[]>([]);
    const [eligibility, setEligibility] = useState<Eligibility | null>(null);
    const [body, setBody] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        apiGet<StudentTestimonial[]>('/testimonials', controller.signal)
            .then(setTestimonials)
            .catch(() => {});

        return () => controller.abort();
    }, []);

    useEffect(() => {
        if (user?.role !== 'student') return;

        const controller = new AbortController();
        apiGet<Eligibility>('/testimonials/eligibility', controller.signal)
            .then(setEligibility)
            .catch(() => setError('No se pudo comprobar tu progreso. Inténtalo de nuevo más tarde.'));

        return () => controller.abort();
    }, [user?.id, user?.role]);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        setSuccess('');
        setSaving(true);

        try {
            const testimonial = await apiPost<StudentTestimonial>('/testimonials', { body: body.trim() });
            setTestimonials((current) => [testimonial, ...current]);
            setEligibility({ completed_intermediate: true, has_commented: true, can_comment: false });
            setBody('');
            setSuccess('Tu opinión se publicó correctamente. Gracias por compartirla.');
        } catch (reason) {
            setError(reason instanceof ApiError ? reason.message : 'No se pudo publicar tu opinión.');
        } finally {
            setSaving(false);
        }
    }

    const visibleTestimonials = [
        ...testimonials.map((testimonial) => ({ ...testimonial, isExample: false })),
        ...examples.map((example, index) => ({
            id: `example-${index}`,
            name: `Ejemplo ${String(index + 1).padStart(2, '0')}`,
            body: example,
            isExample: true,
        })),
    ].slice(0, 6);

    return (
        <section id="como-funciona" className="mx-auto max-w-[1440px] px-[5%] py-20">
            <span className="eyebrow">HISTORIAS DE ESTUDIANTES</span>
            <h2 className="section-title mt-4">Historias de quienes aprenden Kichwa.</h2>
            <p className="section-lead mt-4 max-w-[760px]">
                Este espacio reúne experiencias de aprendizaje. Los comentarios marcados como ejemplo son textos de muestra hasta que los estudiantes compartan los suyos.
            </p>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visibleTestimonials.map((testimonial) => (
                    <article className="glass-panel card-hover flex min-h-[260px] flex-col p-7" key={testimonial.id}>
                        <div className="flex items-center gap-4">
                            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-emerald-100 font-bold text-forest" aria-hidden="true">
                                {testimonial.isExample ? '✦' : testimonial.name.slice(0, 1).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                                <h3 className="font-bold text-ink">{testimonial.name}</h3>
                                <p className="text-sm text-muted">
                                    {testimonial.isExample ? 'Opinión de ejemplo' : 'Estudiante · Nivel Intermedio'}
                                </p>
                            </div>
                        </div>
                        <p className="mt-7 flex-1 text-lg leading-8 text-ink">“{testimonial.body}”</p>
                        <div className="mt-6 border-t border-white/70 pt-4 text-xs font-semibold text-forest">
                            {testimonial.isExample ? 'Texto de muestra' : 'Experiencia compartida en Yachay'}
                        </div>
                    </article>
                ))}
            </div>

            <div className="glass-panel mt-8 flex flex-col gap-4 p-6 md:p-8">
                <div className="flex items-center gap-3">
                    <MessageCircle className="text-forest" size={24} aria-hidden="true" />
                    <h3 className="font-serif text-2xl text-ink">Comparte tu experiencia</h3>
                </div>
                {eligibility?.can_comment ? (
                    <form onSubmit={submit} className="space-y-4">
                        <label htmlFor="student-opinion" className="field-label">Tu opinión sobre el aprendizaje del Kichwa</label>
                        <textarea
                            id="student-opinion"
                            className="field min-h-32 resize-y"
                            minLength={20}
                            maxLength={500}
                            required
                            value={body}
                            onChange={(event) => setBody(event.target.value)}
                            placeholder="Cuéntanos qué aprendiste y cómo fue tu experiencia..."
                        />
                        <p className="text-sm text-muted">De 20 a 500 caracteres. Tu nombre abreviado aparecerá junto a la opinión.</p>
                        <button type="submit" className="primary-button" disabled={saving}>
                            {saving ? 'Publicando...' : 'Publicar opinión'} <ArrowRight size={17} />
                        </button>
                    </form>
                ) : eligibility?.has_commented ? (
                    <p className="text-muted">Ya compartiste tu opinión. Gracias por participar.</p>
                ) : user?.role === 'student' ? (
                    <p className="text-muted">Las opiniones estarán disponibles cuando se habilite el nivel Intermedio. Por ahora puedes aprender el Básico. <Link href="/aprender" className="font-bold text-forest underline">Ir a mi panel</Link></p>
                ) : user?.role === 'admin' ? (
                    <p className="text-muted">La publicación de opiniones se habilitará junto con el nivel Intermedio.</p>
                ) : (
                    <p className="text-muted">Nivel Intermedio y publicación de opiniones: próximamente. <Link href="/iniciar-sesion" className="font-bold text-forest underline">Inicia sesión</Link> para aprender el Básico.</p>
                )}
                {error && <p className="form-error" role="alert">{error}</p>}
                {success && <p className="text-sm font-semibold text-forest" role="status">{success}</p>}
            </div>
        </section>
    );
}
