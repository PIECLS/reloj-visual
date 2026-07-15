import { T } from "../shared";
import AjustesComunes from "./AjustesComunes";

export default function ModalAjustes({
  wedgeKey, setWedgeKey,
  inverted, setInverted,
  sound, setSound,
  reducedMotion, setReducedMotion,
  speechOn, setSpeechOn,
  activeHitos, toggleHito,
  wakeLockOn, setWakeLockOn,
  onClose,
}) {
  return (
    <div className="rv-overlay" onClick={onClose}>
      <div className="rv-card" onClick={e => e.stopPropagation()}>
        <div className="rv-drag-pill"/>
        <h2>Ajustes</h2>

        <AjustesComunes
          wedgeKey={wedgeKey} setWedgeKey={setWedgeKey}
          inverted={inverted} setInverted={setInverted}
          sound={sound} setSound={setSound}
          reducedMotion={reducedMotion} setReducedMotion={setReducedMotion}
          speechOn={speechOn} setSpeechOn={setSpeechOn}
          activeHitos={activeHitos} toggleHito={toggleHito}
          wakeLockOn={wakeLockOn} setWakeLockOn={setWakeLockOn}
        />

        {/* Crédito ARASAAC */}
        <div style={{
          marginTop: 20, padding: "12px 14px",
          background: T.panel, border: `1.5px solid ${T.line}`,
          borderRadius: 14, fontSize: 12, color: T.dim, lineHeight: 1.6,
        }}>
          <div style={{ fontWeight: 800, marginBottom: 4, color: T.text }}>Acerca de los pictogramas</div>
          Pictogramas de{" "}
          <a href="https://arasaac.org" target="_blank" rel="noreferrer"
            style={{ color: "#4A90D9", fontWeight: 700 }}>ARASAAC</a>
          {" "}(Portal Aragonés de la Comunicación Aumentativa y Alternativa).{"\n"}
          Autor: Sergio Palao. Origen: ARASAAC — Gobierno de Aragón.{" "}
          Licencia:{" "}
          <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer"
            style={{ color: "#4A90D9" }}>CC BY-NC-SA 4.0</a>.
        </div>

        <button className="btn" style={{ width: "100%", marginTop: 14 }} onClick={onClose}>Listo</button>
      </div>
    </div>
  );
}
