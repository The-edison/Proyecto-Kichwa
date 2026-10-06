import { Head } from '../../navigation';
import { GlossarySearch } from '../../components/GlossarySearch';
import { PublicLayout } from '../../layouts/PublicLayout';
export default function Index(){return <PublicLayout><Head title="Diccionario Español–Kichwa"/><section className="mx-auto max-w-[1100px] px-5 py-16"><span className="eyebrow">PALABRAS PARA DESCUBRIR</span><h1 className="section-title mt-4">Diccionario Español–Kichwa.</h1><p className="section-lead mb-9 mt-4">Explora términos, significados y ejemplos para ampliar tu vocabulario.</p><GlossarySearch/></section></PublicLayout>}
