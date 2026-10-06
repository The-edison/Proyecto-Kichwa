import { Head } from '../../navigation';
import { GlossarySearch } from '../../components/GlossarySearch';
import { PublicLayout } from '../../layouts/PublicLayout';

export default function Index() {
    return <PublicLayout>
        <Head title="Diccionario Kichwa–Español" />
        <section className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 sm:py-12">
            <p className="eyebrow">Palabras para descubrir</p>
            <h1 className="mb-3 mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Diccionario Kichwa–Español</h1>
            <p className="mb-7 max-w-2xl leading-7 text-muted">Explora el vocabulario y sus equivalencias en los dos idiomas.</p>
            <GlossarySearch />
        </section>
    </PublicLayout>;
}
