import { Head } from '@inertiajs/react';
import { AdminContentManager } from '../../components/AdminContentManager';
import { AppLayout } from '../../layouts/AppLayout';
import type { Level } from '../../types';
export default function ContentManager({levels}:{levels:Level[]}){return <AppLayout title="Contenidos y actividades" subtitle="Organiza, edita y publica el aprendizaje."><Head title="Gestionar contenidos"/><AdminContentManager levels={levels}/></AppLayout>}
