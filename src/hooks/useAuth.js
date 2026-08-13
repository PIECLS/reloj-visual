// Bloque 1: estado de autenticación Firebase
import { useState, useEffect } from 'react';
import { auth, iniciarSesion, cerrarSesion, onAuthStateChanged } from '../firebase';

export function useAuth() {
  const [user, setUser]         = useState(undefined); // undefined = Firebase inicializando
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (!auth) { setUser(null); return; }
    const unsub = onAuthStateChanged(auth, u => setUser(u ?? null));
    return unsub;
  }, []);

  const conectar = async () => {
    // Las setState previas son síncronas y no rompen el user gesture.
    // iniciarSesion() llama signInWithPopup sin ningún await previo,
    // así el popup se abre dentro del mismo tick del clic del usuario.
    setCargando(true);
    setError(null);
    try {
      await iniciarSesion();
    } catch(e) {
      if (e.code === 'auth/popup-blocked') {
        setError(
          'Tu navegador bloqueó la ventana de inicio de sesión. ' +
          'Permite las ventanas emergentes para este sitio e inténtalo de nuevo.'
        );
      } else if (
        e.code === 'auth/popup-closed-by-user' ||
        e.code === 'auth/cancelled-popup-request'
      ) {
        // El usuario canceló a propósito — no mostrar error
      } else {
        setError('No se pudo conectar. Intenta de nuevo.');
      }
    } finally {
      setCargando(false);
    }
  };

  const desconectar = async () => {
    try { await cerrarSesion(); } catch(e) {}
  };

  const esColegio = user?.email?.endsWith('@molokai.cl') ?? false;

  return { user, conectar, desconectar, cargando, error, esColegio };
}
