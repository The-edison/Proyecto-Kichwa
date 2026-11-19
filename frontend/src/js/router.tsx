import { lazy, Suspense, useState } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LoadingState } from './components/States';
import { useApi } from './hooks/useApi';
import type { Level } from './types';
import { loadLearningModule, loadLearningUnit } from './services/learningNavigation';
import { hasFinishedLevelIntroduction, LevelIntroduction } from './components/LevelIntroduction';
import basicIntroductionVideo from '../videos/nivel-basico.mp4';
import intermediateIntroductionVideo from '../videos/nivel-intermedio.mp4';
const Home = lazy(() => import('./pages/Home'));
const Dictionary = lazy(() => import('./pages/Dictionary/Index'));
const PublicInfo = lazy(() => import('./pages/PublicInfo'));
const Login = lazy(() => import('./pages/Auth/Login'));
const Register = lazy(() => import('./pages/Auth/Register'));
const PasswordRecovery = lazy(() => import('./pages/Auth/PasswordRecovery'));
const Account = lazy(() => import('./pages/Account/Index'));
const StudentDashboard = lazy(() => import('./pages/Student/Dashboard'));
const StudentLevel = lazy(() => import('./pages/Student/Level'));
const StudentModule = lazy(loadLearningModule);
const StudentUnit = lazy(loadLearningUnit);
const StudentEvaluation = lazy(() => import('./pages/Student/Evaluation'));
const StudentProgress = lazy(() => import('./pages/Student/Progress'));
const StudentDictionary = lazy(() => import('./pages/Student/Dictionary'));
const AdminDashboard = lazy(() => import('./pages/Admin/Dashboard'));
const AdminStudents = lazy(() => import('./pages/Admin/Students'));
const AdminContentManager = lazy(() => import('./pages/Admin/ContentManager'));
const AdminDictionary = lazy(() => import('./pages/Admin/Dictionary'));
const AdminGroups = lazy(() => import('./pages/Admin/Groups'));
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
type NavigationLevel = { id: number; modules: Array<{ id: number; units: Array<{ id: number }> }> };
function LearningIntroGate() {
    const { user } = useAuth();
    const { pathname } = useLocation();
    const match = pathname.match(/^\/aprender\/(nivel|modulo|unidad)\/(\d+)$/);
    const kind = match?.[1];
    const id = Number(match?.[2]);
    const levels = useApi<Level[]>('/levels');
    const navigation = useApi<NavigationLevel[]>(kind === 'modulo' || kind === 'unidad' ? '/learning-navigation' : null);
    const [completedKey, setCompletedKey] = useState<string | null>(null);
    if (levels.loading || navigation.loading) return <LoadingState />;
    if (levels.error || navigation.error) return <p role="alert">{levels.error || navigation.error}</p>;
    const navigationLevel = navigation.data?.find(level => kind === 'nivel' ? level.id === id
        : level.modules.some(module => kind === 'modulo' ? module.id === id : module.units.some(unit => unit.id === id)));
    const level = levels.data?.find(item => item.id === (kind === 'nivel' ? id : navigationLevel?.id));
    const videoSrc = level?.code === 'basic' ? basicIntroductionVideo
        : level?.code === 'intermediate' ? intermediateIntroductionVideo : null;
    const completionKey = user && level ? `${user.id}:${level.id}` : null;
    if (user && level && videoSrc && completedKey !== completionKey && !hasFinishedLevelIntroduction(user.id, level.id)) {
        return <>
        <div className="learning-introduction-preview" inert><Suspense fallback={<LoadingState />}><Outlet /></Suspense></div>
        <LevelIntroduction key={completionKey} levelName={level.name} videoSrc={videoSrc} onComplete={() => {
            try { localStorage.setItem(`yachay-level-introduction:${user.id}:${level.id}`, 'complete'); } catch { /* Continue in this tab. */ }
            setCompletedKey(completionKey);
        }} />
        </>;
    }
    return <Outlet />;
}
function AccountPage() { const { user } = useAuth(); return user ? <Account /> : <Navigate to="/iniciar-sesion" replace />; }
export function AppRouter() {
    const { loading } = useAuth();
    if (loading) return <LoadingState />;
    return <Suspense fallback={<LoadingState />}><Routes>
        <Route path="/" element={<Home />} /><Route path="/diccionario" element={<Dictionary />} />
        <Route path="/informacion/:topic" element={<PublicInfo />} />
        <Route path="/recuperar-contrasena" element={<PasswordRecovery />} />
        <Route path="/iniciar-sesion" element={<Guest />} /><Route path="/registro" element={<Guest register />} />
        <Route path="/cuenta" element={<AccountPage />} />
        <Route element={<Protected role="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} /><Route path="/admin/estudiantes" element={<AdminStudents />} />
            <Route path="/admin/contenidos/*" element={<AdminContentManager />} />
            <Route path="/admin/contenidos/grupos" element={<AdminGroups />} />
            <Route path="/admin/diccionario" element={<AdminDictionary />} />
            <Route path="/admin/contenidos/diccionario/*" element={<Navigate to="/admin/diccionario" replace />} />
        </Route>
        <Route element={<Protected role="student" />}>
            <Route path="/aprender" element={<StudentDashboard />} /><Route path="/aprender/progreso" element={<StudentProgress />} />
            <Route path="/aprender/diccionario" element={<StudentDictionary />} />
            <Route element={<LearningIntroGate />}>
                <Route path="/aprender/nivel/:id" element={<LevelPage />} /><Route path="/aprender/modulo/:id" element={<ParameterPage kind="module" />} />
                <Route path="/aprender/unidad/:id" element={<ParameterPage kind="unit" />} />
            </Route>
            <Route path="/aprender/evaluacion/:id" element={<ParameterPage kind="evaluation" />} />
        </Route>
        <Route path="*" element={<p>Página no encontrada.</p>} />
    </Routes></Suspense>;
}
