import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNavigate } from 'react-router-dom';

const TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutos de Inatividade

export default function AutoLogoutWrapper({ children }: { children: React.ReactNode }) {
    const auth = useAuthStore();
    const navigate = useNavigate();
    const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);

    const checkLogOut = () => {
        if (!auth.user) return;

        // Dispara o Processo Exato de Logout Redux/Zustand
        auth.signOut();

        // Dispara Alerta ao Usuário
        alert('Sua sessão expirou por inatividade por medida de segurança. Por favor, faça login novamente.');

        // Navega pra tela de Login
        navigate('/login', { replace: true });
    };

    const resetTimer = () => {
        if (!auth.user) return;

        if (logoutTimerRef.current) {
            clearTimeout(logoutTimerRef.current);
        }

        logoutTimerRef.current = setTimeout(checkLogOut, TIMEOUT_MS);
    };

    useEffect(() => {
        // Apenas roda se for no lado Administrativo Autenticado (Ignora Painel Ponto/User)
        if (auth.user) {
            const events = ['mousemove', 'mousedown', 'keypress', 'DOMMouseScroll', 'mousewheel', 'touchmove', 'MSPointerMove'];

            // Inicia Timer Primário
            resetTimer();

            // Atrela Recarregadores em toda tentativa de mexer no Mouse ou Teclado
            events.forEach(event => {
                window.addEventListener(event, resetTimer);
            });

            return () => {
                if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
                events.forEach(event => {
                    window.removeEventListener(event, resetTimer);
                });
            };
        }
    }, [auth.user]);

    return <>{children}</>;
}
