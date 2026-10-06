import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LoadingState } from './components/States';
import { useApi } from './hooks/useApi';
import type { Level } from './types';
const Home = lazy(() => import('./pages/Home'));
const Glossary = lazy(() => import('./pages/Glossary/Index'));
const Login = lazy(() => import('./pages/Auth/Login'));
const Register = lazy(() => import('./pages/Auth/Register'));
const PasswordRecovery = lazy(() => import('./pages/Auth/PasswordRecovery'));
const Account = lazy(() => import('./pages/Account/Index'));
const StudentDashboard = lazy(() => import('./pages/Student/Dashboard'));
const StudentLevel = lazy(() => import('./pages/Student/Level'));
const StudentModule = lazy(() => import('./pages/Student/Module'));
const StudentUnit = lazy(() => import('./pages/Student/Unit'));
const StudentEvaluation = lazy(() => import('./pages/Student/Evaluation'));
const StudentProgress = lazy(() => import('./pages/Student/Progress'));
const AdminDashboard = lazy(() => import('./pages/Admin/Dashboard'));
const AdminStudents = lazy(() => import('./pages/Admin/Students'));
const AdminContentManager = lazy(() => import('./pages/Admin/ContentManager'));
function Protected({ role }: { role?: 'admin' | 'student' }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/iniciar-sesion" replace />;
    if (user.debe_cambiar_contrasena) return <Navigate to="/cuenta" replace />;
    if (role && user.role !== role) return <p role="alert">Acceso denegado.</p>;
    return <Outlet />;
}
function Guest({ register = false }: { register?: boolean }) {
    const { user } = useAuth();
    if (user) return <Navigate to={user.debe_cambiar_contrasena ? '/cuenta' : user.role === 'admin' ? '/admin' : '/aprender'} replace />;
    return register ? <Register /> : <Login />;
}
function LevelPage() {
    const { id } = useParams(); const levels = useApi<Level[]>('/levels');
    if (levels.loading) return <LoadingState />;
    if (levels.error) return <p role="alert">{levels.error}</p>;
    const level = levels.data?.find(l => l.id === Number(id));
    return level ? level.available ? <StudentLevel level={level} /> : <p>Intermedio · Próximamente</p> : <p>Nivel no encontrado.</p>;
}
function ParameterPage({ kind }: { kind: 'module' | 'unit' | 'evaluation' }) {
    const { id } = useParams();
    return kind === 'module' ? <StudentModule moduleId={Number(id)} /> : kind === 'unit' ? <StudentUnit unitId={Number(id)} /> : <StudentEvaluation evaluationId={Number(id)} />;
}
function AccountPage() { const { user } = useAuth(); return user ? <Account /> : <Navigate to="/iniciar-sesion" replace />; }
export function AppRouter() {
    const { loading } = useAuth();
    if (loading) return <LoadingState />;
    return <Suspense fallback={<LoadingState />}><Routes>
        <Route path="/" element={<Home />} /><Route path="/glosario" element={<Glossary />} />
        <Route path="/recuperar-contrasena" element={<PasswordRecovery />} />
        <Route path="/iniciar-sesion" element={<Guest />} /><Route path="/registro" element={<Guest register />} />
        <Route path="/cuenta" element={<AccountPage />} />
        <Route element={<Protected role="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} /><Route path="/admin/estudiantes" element={<AdminStudents />} />
            <Route path="/admin/contenidos/*" element={<AdminContentManager />} />
        </Route>
        <Route element={<Protected role="student" />}>
            <Route path="/aprender" element={<StudentDashboard />} /><Route path="/aprender/progreso" element={<StudentProgress />} />
            <Route path="/aprender/nivel/:id" element={<LevelPage />} /><Route path="/aprender/modulo/:id" element={<ParameterPage kind="module" />} />
            <Route path="/aprender/unidad/:id" element={<ParameterPage kind="unit" />} /><Route path="/aprender/evaluacion/:id" element={<ParameterPage kind="evaluation" />} />
        </Route>
        <Route path="*" element={<p>Página no encontrada.</p>} />
    </Routes></Suspense>;
}
