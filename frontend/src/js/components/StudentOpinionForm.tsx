import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, Send } from 'lucide-react';
import { Link } from '../navigation';
import { useApi } from '../hooks/useApi';
import { ApiError, apiPost } from '../services/api';
import type { StudentTestimonial, TestimonialEligibility } from '../types';

export function StudentOpinionForm() {
    const id = useId();
    const eligibility = useApi<TestimonialEligibility>('/testimonials/eligibility');
    const [body, setBody] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const submitting = useRef(false);
    const savedBody = eligibility.data?.testimonial?.body;
    useEffect(() => { setBody(savedBody ?? ''); }, [savedBody]);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (submitting.current) return;
        const text = body.trim();
        if (text.length < 20 || text.length > 500) {
            setError('Escribe una opinión de entre 20 y 500 caracteres.');
            return;
        }
        submitting.current = true;
        setSaving(true); setError(''); setSuccess(false);
        try {
            await apiPost<StudentTestimonial>('/testimonials', { body: text });
            setSuccess(true);
        } catch (reason) {
            setError(reason instanceof ApiError ? reason.errors.body?.[0] ?? reason.message : 'No se pudo publicar. Tu texto se conserva para que puedas volver a intentarlo.');
        } finally {
            submitting.current = false;
            setSaving(false);
        }
    }

    if (eligibility.loading) return <p role="status">Cargando tu espacio de opiniones…</p>;
    if (eligibility.error) return <div><p className="form-error" role="alert">{eligibility.error}</p><button type="button" className="secondary-button" onClick={() => void eligibility.refresh()}>Volver a intentar</button></div>;

    return <form className="student-opinion-form" onSubmit={submit} aria-busy={saving}>
        <p className="student-opinion-intro">Tu experiencia puede animar a otros a aprender Kichwa.</p>
        <label htmlFor={id} className="field-label">Tu opinión sobre Yachay</label>
        <textarea id={id} className="field" rows={5} minLength={20} maxLength={500} required disabled={saving}
            aria-describedby={`${id}-help ${id}-count${error ? ` ${id}-error` : ''}`} aria-invalid={Boolean(error)}
            placeholder="¿Qué te ha gustado de la plataforma? ¿Cómo ha sido aprender aquí?"
            value={body} onChange={event => { setBody(event.target.value); setError(''); setSuccess(false); }} />
        <div className="student-opinion-help"><span id={`${id}-help`}>Mínimo 20 caracteres.</span><span id={`${id}-count`}>{body.length}/500</span></div>
        <p className="student-opinion-privacy">Al publicar, tu comentario será público en las Historias del inicio junto a tu nombre abreviado. Evita incluir datos personales. Puedes editar tu opinión aquí cuando quieras.</p>
        {error && <p id={`${id}-error`} className="form-error" role="alert">{error}</p>}
        {success && <p className="student-opinion-success" role="status"><CheckCircle2 size={18} aria-hidden="true" />Tu opinión ya está publicada en el inicio.</p>}
        <button type="submit" className="primary-button" disabled={saving || body.trim().length < 20 || !eligibility.data?.can_comment}>
            <Send size={16} aria-hidden="true" />{saving ? 'Publicando…' : eligibility.data?.has_commented || success ? 'Actualizar opinión' : 'Publicar opinión'}
        </button>
        <Link href="/#historias" className="student-opinion-home">Ver opiniones en el inicio <ArrowRight size={16} aria-hidden="true" /></Link>
    </form>;
}
