import { Head, Link } from '@inertiajs/react';
import { ArrowRight, BookOpen, Play } from 'lucide-react';
import { ChakanaIllustration } from '../components/ChakanaIllustration';
import { TestimonialsSection } from '../components/TestimonialsSection';
import { PublicLayout } from '../layouts/PublicLayout';

const heroCardClass = 'glass-panel card-hover flex min-h-24 min-w-0 items-center gap-3 p-4 text-sm text-ink shadow-xl';

export default function Home() {
    return (
        <PublicLayout>
            <Head title="Bienvenido a Yachay" />

            <section className="mx-auto grid max-w-[1440px] grid-cols-1 gap-8 px-[5%] pb-24 pt-16 lg:min-h-[680px] lg:grid-cols-2 lg:gap-x-10">
                <div className="relative z-[1]">
                    <div className="flex flex-wrap items-center gap-4">
                        <span className="eyebrow">● KAWSAYKAMA · BIENVENIDO A YACHAY</span>
                    </div>
                    <h1 className="mt-8 font-serif text-[clamp(4rem,7vw,7rem)] leading-[.97] tracking-[-.06em] text-ink">
                        Aprende Kichwa.<br />
                        <span className="text-coral">Vive tu raíz.</span>
                    </h1>
                </div>
                <div className="relative z-[1] flex items-center justify-end lg:justify-start xl:-translate-x-45">
                    <ChakanaIllustration compact />
                </div>

                <div className="hero-actions relative z-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Link href="/registro" className={heroCardClass}>
                        <Play size={20} className="shrink-0 text-coral" fill="currentColor" />
                        <span className="min-w-0 flex-1">
                            <strong className="block">Iniciar mi recorrido</strong>
                            <small className="block text-muted">Empieza a aprender Kichwa</small>
                        </span>
                        <ArrowRight size={17} className="shrink-0 text-coral" />
                    </Link>
                    <a href="#como-funciona" className={heroCardClass}>
                        <BookOpen size={20} className="shrink-0 text-coral" />
                        <span className="min-w-0 flex-1">
                            <strong className="block">Conocer más</strong>
                            <small className="block text-muted">Descubre cómo funciona</small>
                        </span>
                        <ArrowRight size={17} className="shrink-0 text-coral" />
                    </a>
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
                        <div className="rounded-[40px] bg-gradient-to-br from-[#d1ebe2] via-[#fff5d9] to-[#f4d5ba] p-10 text-center shadow-inner">
                            <div className="text-7xl">✦</div>
                            <p className="mt-4 font-serif text-3xl text-ink">Cada palabra abre un camino.</p>
                        </div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
}
