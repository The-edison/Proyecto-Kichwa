import { Head } from '../../navigation';
import { AppLayout } from '../../layouts/AppLayout';
import { GlossarySearch } from '../../components/GlossarySearch';

export default function Glossary() {
    return <AppLayout title="Diccionario" subtitle="Consulta palabras y expresiones sin salir de tu espacio de aprendizaje.">
        <Head title="Diccionario Kichwa–Español" />
        <GlossarySearch />
    </AppLayout>;
}
