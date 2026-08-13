import { useState, useEffect, useRef } from "react";

export default function useWakeLock(enabled) {
  const [active, setActive] = useState(false);
  const lockRef    = useRef(null);
  const retryRef   = useRef(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const acquire = async () => {
    if (!enabledRef.current || !("wakeLock" in navigator)) return;
    if (lockRef.current?.released) lockRef.current = null;
    if (lockRef.current) return;
    clearTimeout(retryRef.current);
    try {
      const lock = await navigator.wakeLock.request("screen");
      lockRef.current = lock;
      setActive(true);
      lock.addEventListener("release", () => {
        if (lockRef.current === lock) {
          lockRef.current = null;
          setActive(false);
          // iOS suelta el lock al ir al fondo; reintentamos al volver
          if (enabledRef.current && document.visibilityState === "visible") {
            retryRef.current = setTimeout(acquire, 500);
          }
        }
      });
    } catch (e) {
      setActive(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    // Delay inicial: iOS puede reportar visibilityState=visible antes de que
    // el documento esté listo para conceder el lock tras un cold start / BFCache restore.
    const initTimer = setTimeout(acquire, 150);

    const reRequest = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(retryRef.current);
        retryRef.current = setTimeout(acquire, 300);
      }
    };

    document.addEventListener("visibilitychange", reRequest);
    window.addEventListener("pageshow", reRequest);   // iOS PWA restore (BFCache)
    window.addEventListener("focus",    reRequest);   // ventana recupera foco

    return () => {
      clearTimeout(initTimer);
      clearTimeout(retryRef.current);
      document.removeEventListener("visibilitychange", reRequest);
      window.removeEventListener("pageshow", reRequest);
      window.removeEventListener("focus",    reRequest);
      if (lockRef.current) {
        lockRef.current.release().catch(() => {});
        lockRef.current = null;
      }
      setActive(false);
    };
  }, [enabled]); // eslint-disable-line

  return { active };
}
