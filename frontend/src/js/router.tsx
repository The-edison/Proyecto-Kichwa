import { useAuth } from './context/AuthContext';
import { LoadingState } from './components/States';
import { useApi } from './hooks/useApi';
import type { Level } from './types';
import Home from './pages/Home';
import Glossary from './pages/Glossary/Index';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Account from './pages/Account/Index';
import StudentDashboard from './pages/Student/Dashboard';
import StudentLevel from './pages/Student/Level';
import StudentUnit from './pages/Student/Unit';
import StudentEvaluation from './pages/Student/Evaluation';
import StudentProgress from './pages/Student/Progress';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminStudents from './pages/Admin/Students';
import AdminContentManager from './pages/Admin/ContentManager';

export function AppRouter() {
    const { user, loading } = useAuth();
    const path = window.location.pathname.replace(/\/$/, '') || '/';

    if (loading) return <LoadingState />;
    if (path === '/') return <Home />;
    if (path === '/glosario') return <Glossary />;
    if (path === '/iniciar-sesion' || path === '/registro') {
        if (user) {
            window.location.replace(user.role === 'admin' ? '/admin' : '/aprender');
            return null;
        }
        return path === '/registro' ? <Register /> : <Login />;
    }

    if (!user) {
        window.location.replace('/iniciar-sesion');
        return null;
    }

    if (path === '/cuenta') return <Account />;
    if (path.startsWith('/admin')) {
        if (user.role !== 'admin') return <p>Acceso denegado.</p>;
        if (path === '/admin') return <AdminDashboard />;
        if (path === '/admin/estudiantes') return <AdminStudents />;
        if (path === '/admin/contenidos') return <AdminContentManager />;
    }
    if (path.startsWith('/aprender')) {
        if (user.role !== 'student') return <p>Acceso denegado.</p>;
        if (path === '/aprender') return <StudentDashboard />;
        if (path === '/aprender/progreso') return <StudentProgress />;
        const level = path.match(/^\/aprender\/nivel\/(\d+)$/);
        if (level) return <LevelPage levelId={Number(level[1])} />;
        const unit = path.match(/^\/aprender\/unidad\/(\d+)$/);
        if (unit) return <StudentUnit unitId={Number(unit[1])} />;
        const evaluation = path.match(/^\/aprender\/evaluacion\/(\d+)$/);
        if (evaluation) return <StudentEvaluation evaluationId={Number(evaluation[1])} />;
    }

    return <p>Página no encontrada.</p>;
}

function LevelPage({ levelId }: { levelId: number }) {
    const { data, loading, error } = useApi<Level[]>('/levels');
    if (loading) return <LoadingState />;
    if (error) return <p>{error}</p>;
    const level = data?.find((item) => item.id === levelId);
    return level ? <StudentLevel level={level} /> : <p>Nivel no encontrado.</p>;
}
