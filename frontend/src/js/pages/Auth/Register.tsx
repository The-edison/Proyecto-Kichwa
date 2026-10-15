import { BookOpen, ChartNoAxesCombined, UserRoundPlus } from 'lucide-react';
import { Head } from '../../navigation';
import { RegisterForm } from '../../components/RegisterForm';
import { PublicLayout } from '../../layouts/PublicLayout';

export default function Register() {
    return <PublicLayout>
        <Head title="Crear cuenta" />
        <section className="register-page" aria-labelledby="register-title">
            <div className="auth-panel register-panel">
                <header className="register-welcome">
                    <span className="register-welcome-icon" aria-hidden="true"><UserRoundPlus size={28} strokeWidth={1.6} /></span>
                    <p className="eyebrow">COMIENZA CON YACHAY</p>
                    <h1 id="register-title">Una cuenta.<br />Tu camino al <span>Kichwa.</span></h1>
                    <p className="register-welcome-copy">Aprende a tu ritmo y conecta con nuestra lengua, una palabra a la vez.</p>
                    <div className="register-benefits">
                        <p><BookOpen size={20} aria-hidden="true" /><span>Lecciones y actividades para practicar.</span></p>
                        <p><ChartNoAxesCombined size={20} aria-hidden="true" /><span>Tu progreso guardado en un solo lugar.</span></p>
                    </div>
                    <span className="register-welcome-footer">YACHAY · KICHWA</span>
                </header>
                <div className="register-main">
                    <h2>Crear tu cuenta</h2>
                    <p className="register-main-intro">Completa tus datos para empezar a aprender.</p>
                    <RegisterForm />
                </div>
            </div>
        </section>
    </PublicLayout>;
}
