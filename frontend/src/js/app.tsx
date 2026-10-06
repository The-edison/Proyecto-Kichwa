import '../css/app.css';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './services/queryClient';
import { AuthProvider } from './context/AuthContext';
import { AppRouter } from './router';
import { ScrollRestoration } from './navigation';
import { ToastProvider } from './components/Toast';
createRoot(document.getElementById('root')!).render(
    <BrowserRouter><QueryClientProvider client={queryClient}><ToastProvider><AuthProvider>
        <ScrollRestoration /><AppRouter />
    </AuthProvider></ToastProvider></QueryClientProvider></BrowserRouter>,
);
