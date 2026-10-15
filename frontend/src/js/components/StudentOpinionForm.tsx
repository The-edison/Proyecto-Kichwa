import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, Send } from 'lucide-react';
import { Link } from '../navigation';
import { useApi } from '../hooks/useApi';
import { ApiError, apiPost } from '../services/api';
import type { StudentTestimonial, TestimonialEligibility } from '../types';
import type { HomeLanguage } from '../homeLanguage';

const copy = {
    es: {
        lengthError: 'Escribe una opinión de entre 20 y 500 caracteres.', publishError: 'No se pudo publicar. Tu texto se conserva para que puedas volver a intentarlo.',
        loading: 'Cargando tu espacio de opiniones…', loadError: 'No se pudo cargar tu opinión.', retry: 'Volver a intentar',
        intro: 'Tu experiencia puede animar a otros a aprender Kichwa.', label: 'Tu opinión en español sobre Yachay',
        placeholder: '¿Qué te ha gustado de la plataforma? ¿Cómo ha sido aprender aquí?', minimum: 'Mínimo 20 caracteres.',
        privacy: 'Al publicar, tu comentario será público en las Historias del inicio junto a tu nombre abreviado. Evita incluir datos personales. Puedes editar tu opinión aquí cuando quieras.',
        success: 'Tu opinión ya está publicada en el inicio.', publishing: 'Publicando…', update: 'Actualizar opinión', publish: 'Publicar opinión', view: 'Ver opiniones en el inicio',
    },
    qu: {
        lengthError: '20manta 500 kama killkakunawan kampa yuyayta killkay.', publishError: 'Mana rikuchiyta usharirkanchu. Kampa killkashka kayllapi sakirin; kutin rurayta ushanki.',
        loading: 'Kampa rimaykunapa kuskata apamun…', loadError: 'Kampa rimayta mana apamuyta usharirkanchu.', retry: 'Kutin ruray',
        intro: 'Kampa yachakuyka shuk runakunata kichwa shimita yachakunkapak kallpachin.', label: 'Kichwapi Yachaymanta kampa yuyay',
        placeholder: 'Yachaypi imatata munarkanki? Imashinatak kaypi yachakurkanki?', minimum: '20 killkakunamanta ashtawan.',
        privacy: 'Rikuchikpika kampa rimayka qallariypi tukuypak rikurin, uchillachishka shutiykiwan. Kampa pakalla willayta ama killkaychu. Munashpayki kampa rimayta allichiyta ushanki.',
        success: 'Kampa rimayka qallariypi rikurin.', publishing: 'Rikuchin…', update: 'Rimayta allichiy', publish: 'Rimayta rikuchiy', view: 'Qallariypi rimaykunata rikuy',
    },
} as const;

export function StudentOpinionForm({ compact = false, language = 'es' }: { compact?: boolean; language?: HomeLanguage } = {}) {
    const t = copy[language];
    const id = useId();
    const eligibility = useApi<TestimonialEligibility>(`/testimonials/eligibility?language=${language}`);
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
            setError(t.lengthError);
            return;
        }
        submitting.current = true;
        setSaving(true); setError(''); setSuccess(false);
        try {
            await apiPost<StudentTestimonial>('/testimonials', { body: text, language });
            setSuccess(true);
        } catch (reason) {
            setError(language === 'qu' ? t.publishError : reason instanceof ApiError ? reason.errors.body?.[0] ?? reason.message : t.publishError);
        } finally {
            submitting.current = false;
            setSaving(false);
        }
    }

    if (eligibility.loading) return <p role="status">{t.loading}</p>;
    if (eligibility.error) return <div><p className="form-error" role="alert">{language === 'qu' ? t.loadError : eligibility.error}</p><button type="button" className="secondary-button" onClick={() => void eligibility.refresh()}>{t.retry}</button></div>;

    return <form className={compact ? 'student-opinion-form is-compact' : 'student-opinion-form'} onSubmit={submit} aria-busy={saving}>
        {!compact && <p className="student-opinion-intro">{t.intro}</p>}
        <label htmlFor={id} className="field-label">{t.label}</label>
        <textarea id={id} className="field" rows={compact ? 3 : 5} minLength={20} maxLength={500} required disabled={saving}
            aria-describedby={`${id}-help ${id}-count${error ? ` ${id}-error` : ''}`} aria-invalid={Boolean(error)}
            placeholder={t.placeholder}
            value={body} onChange={event => { setBody(event.target.value); setError(''); setSuccess(false); }} />
        <div className="student-opinion-help"><span id={`${id}-help`}>{t.minimum}</span><span id={`${id}-count`}>{body.length}/500</span></div>
        <p className="student-opinion-privacy">{t.privacy}</p>
        {error && <p id={`${id}-error`} className="form-error" role="alert">{error}</p>}
        {success && <p className="student-opinion-success" role="status"><CheckCircle2 size={18} aria-hidden="true" />{t.success}</p>}
        <button type="submit" className="primary-button" disabled={saving || body.trim().length < 20 || !eligibility.data?.can_comment}>
            <Send size={16} aria-hidden="true" />{saving ? t.publishing : eligibility.data?.has_commented || success ? t.update : t.publish}
        </button>
        <Link href="/#historias" className="student-opinion-home">{t.view} <ArrowRight size={16} aria-hidden="true" /></Link>
    </form>;
}
