import { Head } from '../../navigation';
import { AppLayout } from '../../layouts/AppLayout';
import { DictionarySearch } from '../../components/DictionarySearch';

export default function Dictionary() {
    return <AppLayout title="Diccionario" subtitle="Consulta palabras y expresiones sin salir de tu espacio de aprendizaje.">
        <Head title="Diccionario Kichwa–Español" />
        <DictionarySearch />
    </AppLayout>;
}
