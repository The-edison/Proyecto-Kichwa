import { Head, Link } from '../navigation';
import { ArrowRight, BookOpen, Compass } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TestimonialsSection } from '../components/TestimonialsSection';
import { PublicLayout } from '../layouts/PublicLayout';
import { homeLanguageKey, type HomeLanguage } from '../homeLanguage';
import homeSlide1 from '../../images/home-slide-1-4k.jpg';
import homeSlide2 from '../../images/home-slide-2-4k.jpg';
import homeSlide3 from '../../images/home-slide-3-4k.jpg';
import homeSlide4 from '../../images/home-slide-4-4k.jpg';
import homeSlide5 from '../../images/home-slide-5-4k.jpg';

const homeSlides = [homeSlide1, homeSlide3, homeSlide4, homeSlide5, homeSlide2];

const copy = {
    es: {
        title: 'Bienvenido a Yachay', eyebrow: 'DESCUBRE · APRENDE · COMPARTE', heading: 'El Kichwa nos une.', headingAccent: 'Cada palabra cuenta nuestra historia.',
        description: 'Aprende a tu ritmo y descubre una lengua viva que nos acerca a nuestras raíces, nuestra gente y nuestra cultura.',
        explore: 'Explorar', more: 'Conocer más', cultureEyebrow: 'IDIOMA Y MEMORIA',
        cultureTitle: 'Una lengua que nos conecta.',
        cultureLead: 'El kichwa es una lengua viva de la familia quechua. En Ecuador, su historia se entrelaza con los intercambios entre pueblos andinos, la expansión inca y las generaciones que la han seguido hablando.',
        cultureBody: 'Hoy se escucha en comunidades de la Sierra y la Amazonía. Sus palabras guardan formas de contar la vida, compartir saberes y recordar de dónde venimos.',
        sources: 'Fuentes:', dictionarySource: 'diccionario kichwa del Ministerio de Educación', memorySource: 'Memoria oral del pueblo Saraguro (INPC)',
        start: 'Comenzar a aprender', videoEyebrow: 'PARA VER Y ESCUCHAR', videoTitle: 'La historia del Kichwa en Ecuador',
        videoDescription: 'Un recorrido audiovisual por la lengua y su presencia en nuestro país.', videoLink: 'Ver el video en YouTube',
    },
    qu: {
        title: 'Yachayman alli shamushka', eyebrow: 'RIKSIY · YACHAKUY · RAKIY', heading: 'Kichwa shimika ñukanchikta tinkichin.', headingAccent: 'Sapa shimi ñukanchik ñawpa yuyayta willan.',
        description: 'Kampa pachaman hina yachakuy. Kay kawsak shimika ñukanchik sapi, ayllu, kawsaywanpash ashtawan tinkichin.',
        explore: 'Maskay', more: 'Ashtawan riksiy', cultureEyebrow: 'SHIMI, YUYAYPASH',
        cultureTitle: 'Ñukanchikta tinkichik shimi.',
        cultureLead: 'Kichwa shimika kunan punchakunapipash kawsan. Ecuador mamallaktapi, anti llaktakunapa tantanakuywan, inka pachawan, kichwata rimak ñawpa ayllukunawanpash wiñashka.',
        cultureBody: 'Kunanpash Sierra, Amazonía llaktakunapi kichwa shimi uyarin. Kay shimipi ñukanchik kawsay, yachay, ñawpa yuyaypash tiyan.',
        sources: 'Maymanta hapishka:', dictionarySource: 'Yachachiy Kamaypa kichwa shimi kamu', memorySource: 'Saraguro runakunapa yuyaykuna (INPC)',
        start: 'Yachakuyta kallariy', videoEyebrow: 'RIKUNKAPAK, UYANKAPAKPASH', videoTitle: 'Ecuadorpi kichwa shimipa ñawpa kawsay',
        videoDescription: 'Kichwa shimimanta, Ecuadorpi imashina kawsakmanta rikuchik shuyu.', videoLink: 'YouTubepi shuyuta rikuy',
    },
} as const;

export default function Home() {
    const [slideIndex, setSlideIndex] = useState(0);
    const [language, setLanguage] = useState<HomeLanguage>(() => {
        try { return localStorage.getItem(homeLanguageKey) === 'qu' ? 'qu' : 'es'; } catch { return 'es'; }
    });
    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const interval = window.setInterval(() => setSlideIndex(index => (index + 1) % homeSlides.length), 6000);
        return () => window.clearInterval(interval);
    }, []);
    useEffect(() => {
        document.documentElement.lang = language === 'qu' ? 'qu-EC' : 'es';
        return () => { document.documentElement.lang = 'es'; };
    }, [language]);
    const t = copy[language];

    return (
        <PublicLayout language={language} onLanguageChange={() => { const next = language === 'es' ? 'qu' : 'es'; setLanguage(next); try { localStorage.setItem(homeLanguageKey, next); } catch {} }}>
            <Head title={t.title} />

            <section className="home-hero" aria-labelledby="home-title">
                <div className="home-hero-slides" aria-hidden="true">
                    {homeSlides.map((slide, index) => <img key={slide} src={slide} alt="" fetchPriority={index === 0 ? 'high' : 'auto'}
                        className={index === slideIndex ? 'home-hero-slide is-active' : 'home-hero-slide'} />)}
                </div>
                <div className="home-hero-content">
                    <span className="home-hero-eyebrow">{t.eyebrow}</span>
                    <h1 id="home-title" className="home-hero-title">
                        {t.heading}
                        <span>{t.headingAccent}</span>
                    </h1>
                    <p className="home-hero-description">{t.description}</p>
                    <div className="home-hero-actions">
                        <Link href="/registro" className="primary-button home-hero-primary">
                            <Compass size={17} aria-hidden="true" />
                            <span>{t.explore}</span>
                            <ArrowRight size={17} aria-hidden="true" />
                        </Link>
                        <Link href="/#historias" className="home-hero-secondary">
                            <BookOpen size={18} aria-hidden="true" /> {t.more} <ArrowRight size={17} aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </section>

            <TestimonialsSection language={language} />

            <section id="cultura" className="culture-section" aria-labelledby="culture-title">
                <div className="culture-panel glass-panel">
                    <div className="culture-copy">
                        <span className="eyebrow">{t.cultureEyebrow}</span>
                        <h2 id="culture-title" className="section-title">{t.cultureTitle}</h2>
                        <p className="section-lead">{t.cultureLead}</p>
                        <p>{t.cultureBody}</p>
                        <p className="culture-source">{t.sources} <a href="https://educacion.gob.ec/wp-content/plugins/download-monitor/download.php?id=3113" target="_blank" rel="noreferrer">{t.dictionarySource}</a> {language === 'qu' ? 'shinallatak' : 'y'} <a href="https://www.patrimoniocultural.gob.ec/wp-content/uploads/2023/03/Memoria-Saraguro.pdf" target="_blank" rel="noreferrer">{t.memorySource}</a>.</p>
                        <Link href="/registro" className="primary-button culture-action">{t.start} <ArrowRight size={17} aria-hidden="true" /></Link>
                    </div>
                    <div className="culture-video-card">
                        <div className="culture-video-frame">
                            <iframe
                                src="https://www.youtube-nocookie.com/embed/O0qVbgG6fuY"
                                title={`${t.videoTitle}, Kichwa Runa`}
                                loading="lazy"
                                referrerPolicy="strict-origin-when-cross-origin"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                            />
                        </div>
                        <div className="culture-video-caption">
                            <span className="eyebrow">{t.videoEyebrow}</span>
                            <h3>{t.videoTitle}</h3>
                            <p>{t.videoDescription}</p>
                            <a href="https://www.youtube.com/watch?v=O0qVbgG6fuY" target="_blank" rel="noreferrer">{t.videoLink}</a>
                        </div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
}
