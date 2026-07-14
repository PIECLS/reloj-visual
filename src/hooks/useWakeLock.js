import { useState, useEffect, useRef } from "react";

export default function useWakeLock(enabled) {
  const [active, setActive] = useState(false);
  const lockRef = useRef(null);

  const request = async () => {
    if (!enabled || !("wakeLock" in navigator)) return;
    try {
      lockRef.current = await navigator.wakeLock.request("screen");
      setActive(true);
      lockRef.current.addEventListener("release", () => setActive(false));
    } catch (e) {
      // navegador denegó o no soporta — degradación silenciosa
    }
  };

  useEffect(() => {
    request();

    const onVisibility = () => {
      if (document.visibilityState === "visible") request();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
      setActive(false);
    };
  }, [enabled]); // eslint-disable-line

  return { active };
}
