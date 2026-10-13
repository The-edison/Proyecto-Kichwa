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
                        <Link href="/registro" className="primary-button">
                            <Play size={17} fill="currentColor" aria-hidden="true" /> Iniciar mi recorrido <ArrowRight size={17} aria-hidden="true" />
                        </Link>
                        <Link href="/#historias" className="home-hero-secondary">
                            <BookOpen size={18} aria-hidden="true" /> Conocer más <ArrowRight size={17} aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </section>

            <TestimonialsSection />

            <section id="cultura" className="mx-auto max-w-[1440px] px-[5%] py-16">
                <div className="glass-panel grid gap-8 p-8 md:grid-cols-2 md:p-14">
                    <div>
                        <span className="eyebrow">IDIOMA Y MEMORIA</span>
                        <h2 className="section-title mt-4">Una lengua que nos conecta.</h2>
                        <p className="section-lead mt-5">
                            El Kichwa forma parte de la vida, la historia y los saberes de nuestras comunidades. Este espacio propone aprenderlo con respeto, curiosidad y constancia.
                        </p>
                        <Link href="/registro" className="primary-button mt-7">Comenzar a aprender <ArrowRight size={17} /></Link>
                    </div>
                    <div className="flex items-center justify-center">
                        <div className="rounded-[40px] bg-gradient-to-br from-tint via-card to-positive-soft p-10 text-center ">
                            <div className="text-7xl">✦</div>
                            <p className="mt-4 font-serif text-3xl text-ink">Cada palabra abre un camino.</p>
                        </div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
}
