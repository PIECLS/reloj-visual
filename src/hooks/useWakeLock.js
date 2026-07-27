import { useState, useEffect, useRef } from "react";

export default function useWakeLock(enabled) {
  const [active, setActive] = useState(false);
  const lockRef = useRef(null);

  const request = async () => {
    if (!enabled || !("wakeLock" in navigator)) return;
    // Si ya hay un lock activo no lo re-solicitamos
    if (lockRef.current && !lockRef.current.released) return;
    try {
      const lock = await navigator.wakeLock.request("screen");
      lockRef.current = lock;
      setActive(true);
      lock.addEventListener("release", () => {
        // Puede dispararse cuando la pestaña se oculta (iOS/Android)
        lockRef.current = null;
        setActive(false);
      });
    } catch (e) {}
  };

  useEffect(() => {
    if (enabled) request();

    const onVisibility = () => {
      if (document.visibilityState === "visible") request();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (lockRef.current) {
        lockRef.current.release().catch(() => {});
        lockRef.current = null;
      }
      setActive(false);
    };
  }, [enabled]); // eslint-disable-line

  return { active };
}
