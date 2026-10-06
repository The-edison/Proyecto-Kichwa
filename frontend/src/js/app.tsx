import '../css/app.css';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import { AppRouter } from './router';

createRoot(document.getElementById('root')!).render(
    <AuthProvider>
        <AppRouter />
    </AuthProvider>,
);
