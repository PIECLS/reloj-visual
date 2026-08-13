// Bloque 2: UI entry point de la biblioteca — solo visible dentro de Ajustes
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
  // Firebase — opcionales; si no llegan el bloque no se renderiza
  fbUser, fbCargando, fbError, fbEsColegio,
  onConectar, onDesconectar, onAbrirBiblioteca,
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

        {/* ─── Biblioteca del equipo — Bloque 2 ─────────────────────────── */}
        {/* Solo se renderiza cuando se pasaron los props de Firebase (solo ModoReloj los pasa) */}
        {onConectar && fbUser !== undefined && (
          <div style={{
            marginTop: 20, borderTop: `1.5px solid ${T.line}`,
            paddingTop: 16,
          }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: T.text, marginBottom: 4 }}>
              Biblioteca del equipo
            </div>

            {/* No conectado */}
            {fbUser === null && (
              <>
                <div style={{ fontSize: 12, color: T.dim, marginBottom: 10, lineHeight: 1.55 }}>
                  Comparte rutinas y pictogramas con tu equipo PIE.
                </div>
                <button className="btn" style={{ fontSize: 13, padding: "8px 14px" }}
                  onClick={onConectar} disabled={fbCargando}>
                  {fbCargando ? "Conectando…" : "Conectar cuenta del colegio"}
                </button>
                {fbError && (
                  <div style={{ fontSize: 12, color: "#C03030", marginTop: 6 }}>{fbError}</div>
                )}
              </>
            )}

            {/* Conectado — dominio incorrecto */}
            {fbUser && !fbEsColegio && (
              <>
                <div style={{ fontSize: 12, color: T.dim, marginBottom: 6 }}>{fbUser.email}</div>
                <div style={{ fontSize: 13, color: "#C03030", marginBottom: 10, lineHeight: 1.5,
                  background: "#FFF4F4", border: "1.5px solid #E04F4F",
                  borderRadius: 12, padding: "10px 12px" }}>
                  Esta función es solo para cuentas del colegio (@molokai.cl).
                </div>
                <button className="btn" style={{ fontSize: 12, color: T.dim }}
                  onClick={onDesconectar}>
                  Cerrar sesión
                </button>
              </>
            )}

            {/* Conectado — OK */}
            {fbUser && fbEsColegio && (
              <>
                <div style={{ fontSize: 12, color: T.dim, marginBottom: 10 }}>{fbUser.email}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn primary" style={{ fontSize: 13 }}
                    onClick={() => { onClose(); onAbrirBiblioteca(); }}>
                    Abrir biblioteca del equipo
                  </button>
                  <button className="btn" style={{ fontSize: 12, color: T.dim }}
                    onClick={onDesconectar}>
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <button className="btn" style={{ width: "100%", marginTop: 14 }} onClick={onClose}>Listo</button>
      </div>
    </div>
  );
}
