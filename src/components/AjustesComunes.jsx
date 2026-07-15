import { T, WEDGE_COLORS, MILESTONES, textOn, playEnd, speak } from "../shared";

/**
 * Secciones de ajustes compartidas entre ModoReloj y ModoTareas:
 * Color, Orientación, Sonido, [Animación opcional], Avisos, Pantalla.
 */
export default function AjustesComunes({
  wedgeKey, setWedgeKey,
  inverted, setInverted,
  sound, setSound,
  reducedMotion, setReducedMotion, // opcionales — solo Reloj los usa
  speechOn, setSpeechOn,
  activeHitos, toggleHito,
  wakeLockOn, setWakeLockOn,
}) {
  return (
    <>
      <div className="rv-row">
        <span className="rv-label">Color</span>
        <div className="rv-swatches">
          {WEDGE_COLORS.map(w => (
            <button key={w.k} className={"rv-sw" + (w.k === wedgeKey ? " on" : "")}
              style={{ background: w.c, color: textOn(w.c) }} title={w.n}
              onClick={() => setWedgeKey(w.k)}>
              {w.k === wedgeKey ? "✓" : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="rv-row">
        <span className="rv-label">Orientación</span>
        <div className="rv-seg">
          <button className={!inverted ? "on" : ""} onClick={() => setInverted(false)}>Horaria ↻</button>
          <button className={inverted ? "on" : ""} onClick={() => setInverted(true)}>Inversa ↺</button>
        </div>
      </div>

      <div className="rv-row">
        <span className="rv-label">Sonido</span>
        <div className="rv-seg">
          {[["off", "Sin sonido"], ["suave", "Suave"], ["campana", "Campana"]].map(([k, n]) => (
            <button key={k} className={sound === k ? "on" : ""}
              onClick={() => { setSound(k); if (k !== "off") playEnd(k); }}>{n}</button>
          ))}
        </div>
      </div>

      {setReducedMotion && (
        <div className="rv-row">
          <span className="rv-label">Animación</span>
          <div className="rv-seg">
            <button className={!reducedMotion ? "on" : ""} onClick={() => setReducedMotion(false)}>Normal</button>
            <button className={reducedMotion ? "on" : ""} onClick={() => setReducedMotion(true)}>Reducida</button>
          </div>
        </div>
      )}

      <div className="rv-row" style={{ alignItems: "flex-start" }}>
        <span className="rv-label" style={{ paddingTop: 6 }}>Avisos</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {MILESTONES.map(({ key, label }) => (
              <button key={key} onClick={() => toggleHito(key)}
                className={"btn" + (activeHitos[key] ? " primary" : "")}
                style={{ minHeight: 38, padding: "6px 12px", fontSize: 13 }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: T.dim }}>Voz</span>
            <div className="rv-seg">
              <button className={speechOn ? "on" : ""}
                onClick={() => { setSpeechOn(true); speak("Avisos de voz activados"); }}>Sí</button>
              <button className={!speechOn ? "on" : ""} onClick={() => setSpeechOn(false)}>No</button>
            </div>
            <span style={{ fontSize: 12, color: T.dim }}>Requiere sonido activado</span>
          </div>
        </div>
      </div>

      <div className="rv-row">
        <span className="rv-label">Pantalla</span>
        <div className="rv-seg">
          <button className={wakeLockOn ? "on" : ""} onClick={() => setWakeLockOn(true)}>Encendida</button>
          <button className={!wakeLockOn ? "on" : ""} onClick={() => setWakeLockOn(false)}>Normal</button>
        </div>
      </div>
    </>
  );
}
