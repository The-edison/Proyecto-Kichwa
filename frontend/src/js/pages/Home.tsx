import { Head, Link } from '../navigation';
import { ArrowRight, BookOpen, Play } from 'lucide-react';
import { TestimonialsSection } from '../components/TestimonialsSection';
import { PublicLayout } from '../layouts/PublicLayout';
import homeBackgroundVideo from '../../videos/home-background.mp4';

export default function Home() {
    return (
        <PublicLayout>
            <Head title="Bienvenido a Yachay" />

            <section className="home-hero" aria-labelledby="home-title">
                <video className="home-hero-video" autoPlay muted loop playsInline preload="auto" aria-hidden="true" tabIndex={-1} disablePictureInPicture
                    onLoadedMetadata={(event) => {
                        event.currentTarget.defaultPlaybackRate = 0.25;
                        event.currentTarget.playbackRate = 0.25;
                    }}>
                    <source src={homeBackgroundVideo} type="video/mp4" />
                </video>
                <div className="home-hero-content">
                    <span className="home-hero-eyebrow">KAWSAYKAMA · BIENVENIDO A YACHAY</span>
                    <h1 id="home-title" className="home-hero-title">
                        Aprende Kichwa.<br />
                        <span>Vive tu raíz.</span>
                    </h1>
                    <p className="home-hero-description">Nuestra lengua, nuestra historia. Un nuevo camino para aprender Kichwa y conectar con nuestra cultura.</p>
                    <div className="home-hero-actions">
                        <Link href="/registro" className="primary-button home-hero-primary">
                            <Play size={17} fill="currentColor" aria-hidden="true" />
                            <span className="home-hero-primary-copy"><span>Explorar</span><small lang="qu">Maskay</small></span>
                            <ArrowRight size={17} aria-hidden="true" />
                        </Link>
                        <Link href="/#historias" className="home-hero-secondary">
                            <BookOpen size={18} aria-hidden="true" /> Conocer más <ArrowRight size={17} aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </section>

            <TestimonialsSection />

            <section id="cultura" className="culture-section" aria-labelledby="culture-title">
                <div className="culture-panel glass-panel">
                    <div className="culture-copy">
                        <span className="eyebrow">IDIOMA Y MEMORIA</span>
                        <h2 id="culture-title" className="section-title">Una lengua que nos conecta.</h2>
                        <p className="section-lead">El kichwa es una lengua viva de la familia quechua. En Ecuador, su historia se entrelaza con los intercambios entre pueblos andinos, la expansión inca y las generaciones que la han seguido hablando.</p>
                        <p>Hoy se escucha en comunidades de la Sierra y la Amazonía. Sus palabras guardan formas de contar la vida, compartir saberes y recordar de dónde venimos.</p>
                        <p className="culture-source">Fuentes: <a href="https://educacion.gob.ec/wp-content/plugins/download-monitor/download.php?id=3113" target="_blank" rel="noreferrer">diccionario kichwa del Ministerio de Educación</a> y <a href="https://www.patrimoniocultural.gob.ec/wp-content/uploads/2023/03/Memoria-Saraguro.pdf" target="_blank" rel="noreferrer">Memoria oral del pueblo Saraguro (INPC)</a>.</p>
                        <Link href="/registro" className="primary-button culture-action">Comenzar a aprender <ArrowRight size={17} aria-hidden="true" /></Link>
                    </div>
                    <div className="culture-video-card">
                        <div className="culture-video-frame">
                            <iframe
                                src="https://www.youtube-nocookie.com/embed/O0qVbgG6fuY"
                                title="La historia del Kichwa en Ecuador, video de Kichwa Runa"
                                loading="lazy"
                                referrerPolicy="strict-origin-when-cross-origin"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                            />
                        </div>
                        <div className="culture-video-caption">
                            <span className="eyebrow">PARA VER Y ESCUCHAR</span>
                            <h3>La historia del Kichwa en Ecuador</h3>
                            <p>Un recorrido audiovisual por la lengua y su presencia en nuestro país.</p>
                            <a href="https://www.youtube.com/watch?v=O0qVbgG6fuY" target="_blank" rel="noreferrer">Ver el video en YouTube</a>
                        </div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
}
