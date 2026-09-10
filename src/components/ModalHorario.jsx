import { useState } from "react";
import { T } from "../shared";

function fmt24(hhmm) { return hhmm || "--:--"; }

export default function ModalHorario({
  horarios, horarioActivo, activoId, setActivoId,
  modoHorario, setModoHorario,
  crearHorario, renombrarHorario, eliminarHorario,
  agregarRecreo, actualizarRecreo, eliminarRecreo,
  onClose,
}) {
  const [editNombre, setEditNombre] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");

  const confirmarNombre = () => {
    if (nuevoNombre.trim() && horarioActivo) renombrarHorario(horarioActivo.id, nuevoNombre.trim());
    setEditNombre(false);
  };

  const recreosOrdenados = horarioActivo
    ? [...horarioActivo.recreos].sort((a, b) => a.inicio.localeCompare(b.inicio))
    : [];

  return (
    <div className="rv-overlay" onClick={onClose}>
      <div className="rv-card" onClick={e => e.stopPropagation()}
        style={{ maxHeight: "85vh", overflowY: "auto" }}>
        <div className="rv-drag-pill" />
        <h2>Horario de recreos</h2>
        <p style={{ color: T.dim, fontSize: 13, marginTop: -8, marginBottom: 16 }}>
          El reloj calcula automáticamente el tiempo que falta hasta el próximo recreo.
          Los horarios son editables — ajústalos a tu colegio.
        </p>

        {/* Toggle modo automático */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: T.panel, borderRadius: 12, padding: "12px 16px", marginBottom: 18,
          border: `1.5px solid ${modoHorario ? "#46A877" : T.line}`,
          transition: "border-color .2s",
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: T.text }}>Modo automático</div>
            <div style={{ fontSize: 12, color: T.dim, marginTop: 2 }}>
              {modoHorario ? "Activo — el reloj sigue el horario" : "Desactivado — tiempo manual"}
            </div>
          </div>
          <button onClick={() => setModoHorario(m => !m)} aria-label="Activar modo horario" style={{
            width: 52, height: 28, borderRadius: 999, border: "none", cursor: "pointer",
            background: modoHorario ? "#46A877" : T.line,
            transition: "background .2s", position: "relative", flexShrink: 0,
          }}>
            <span style={{
              position: "absolute", top: 3,
              left: modoHorario ? 26 : 2,
              width: 22, height: 22, borderRadius: "50%",
              background: "#fff", transition: "left .2s",
              boxShadow: "0 1px 4px #0003",
              display: "block",
            }} />
          </button>
        </div>

        {/* Selector de horario */}
        <p style={{ fontSize: 12, fontWeight: 800, color: T.dim, marginBottom: 8 }}>HORARIO</p>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
          <select className="rv-input" style={{ flex: 1, width: "auto", textAlign: "left", paddingLeft: 12 }}
            value={activoId} onChange={e => setActivoId(Number(e.target.value))}>
            {horarios.map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}
          </select>
          <button className="btn" onClick={crearHorario} title="Crear horario nuevo">＋</button>
          {horarios.length > 1 && (
            <button className="btn" title="Eliminar este horario"
              onClick={() => horarioActivo && eliminarHorario(horarioActivo.id)}
              style={{ fontSize: 16 }}>🗑️</button>
          )}
        </div>

        {/* Renombrar */}
        {horarioActivo && (editNombre
          ? <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input className="rv-input" autoFocus
                style={{ flex: 1, width: "auto", textAlign: "left", paddingLeft: 12 }}
                value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") confirmarNombre(); if (e.key === "Escape") setEditNombre(false); }} />
              <button className="btn primary" onClick={confirmarNombre}>✓</button>
              <button className="btn" onClick={() => setEditNombre(false)}>✕</button>
            </div>
          : <button onClick={() => { setNuevoNombre(horarioActivo.nombre); setEditNombre(true); }}
              style={{ background: "none", border: "none", cursor: "pointer",
                color: T.dim, fontSize: 12, fontWeight: 700, padding: "0 0 16px", display: "block" }}>
              ✏️ Renombrar "{horarioActivo.nombre}"
            </button>
        )}

        {/* Lista de recreos */}
        {horarioActivo && (
          <>
            <p style={{ fontSize: 12, fontWeight: 800, color: T.dim, marginBottom: 8 }}>
              RECREOS — {horarioActivo.nombre.toUpperCase()}
            </p>
            {recreosOrdenados.length === 0 && (
              <p style={{ color: T.dim, fontSize: 14, marginBottom: 10 }}>
                Sin recreos. Agrega uno con el botón de abajo.
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {recreosOrdenados.map(r => (
                <div key={r.id} style={{
                  display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                  background: T.panel, borderRadius: 12, padding: "10px 14px",
                  border: `1.5px solid ${T.line}`,
                }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: T.dim, minWidth: 36 }}>Inicio</span>
                  <input type="time" value={r.inicio}
                    onChange={e => actualizarRecreo(horarioActivo.id, r.id, "inicio", e.target.value)}
                    style={{ fontFamily: "inherit", fontSize: 15, fontWeight: 700,
                      border: "none", background: "transparent", color: T.text,
                      cursor: "pointer", minWidth: 96 }} />
                  <span style={{ color: T.dim, fontWeight: 800, padding: "0 2px" }}>–</span>
                  <span style={{ fontWeight: 700, fontSize: 12, color: T.dim, minWidth: 28 }}>Fin</span>
                  <input type="time" value={r.fin}
                    onChange={e => actualizarRecreo(horarioActivo.id, r.id, "fin", e.target.value)}
                    style={{ fontFamily: "inherit", fontSize: 15, fontWeight: 700,
                      border: "none", background: "transparent", color: T.text,
                      cursor: "pointer", minWidth: 96 }} />
                  <span style={{ color: T.dim, fontSize: 12, marginLeft: 4 }}>
                    ({fmt24(r.inicio)}–{fmt24(r.fin)})
                  </span>
                  <button onClick={() => eliminarRecreo(horarioActivo.id, r.id)}
                    style={{ marginLeft: "auto", background: "none", border: "none",
                      cursor: "pointer", color: T.dim, fontSize: 18, padding: "2px 4px", lineHeight: 1 }}>✕</button>
                </div>
              ))}
            </div>
            <button className="btn" style={{ width: "100%", marginBottom: 12 }}
              onClick={() => agregarRecreo(horarioActivo.id)}>
              ＋ Agregar recreo
            </button>
          </>
        )}

        <button className="btn primary" style={{ width: "100%" }} onClick={onClose}>Listo</button>
      </div>
    </div>
  );
}
