import { Head } from '../../navigation';
import { AdminContentManager } from '../../components/AdminContentManager';
import { ErrorState, LoadingState } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import { AppLayout } from '../../layouts/AppLayout';
import type { Level } from '../../types';
export default function ContentManager(){const {data,loading,error}=useApi<Level[]>('/admin/levels');return <AppLayout title="Contenidos y actividades" subtitle="Organiza, edita y publica el aprendizaje."><Head title="Gestionar contenidos"/>{loading?<LoadingState/>:error?<ErrorState message={error}/>:<AdminContentManager levels={data??[]}/>}</AppLayout>}
