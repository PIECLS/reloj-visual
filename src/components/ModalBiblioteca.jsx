// Bloques 4 + 5: UI y operaciones de la biblioteca del equipo
import { useState, useEffect, useRef } from "react";
import { T } from "../shared";
import { listarPerfiles, publicarPerfil, eliminarPerfil } from "../firebase";

const TIPO_LABELS = {
  "rutina-reloj":           "Rutina de reloj",
  "biblioteca-pictogramas": "Pictogramas",
};

function fmtFecha(ts) {
  if (!ts) return "";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
    return d.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
  } catch { return ""; }
}

function byteSize(obj) {
  return new Blob([JSON.stringify(obj)]).size;
}

// ─── Serialización portable ───────────────────────────────────────────────────
// Los pasos de una rutina guardada localmente tienen la imagen strippeada y
// una referencia `customId` a IndexedDB — inútil en otro dispositivo.
// toPortable convierte cada paso a un formato autosuficiente por tipo.
function toPortable(rutina, customPictos) {
  const steps = (rutina.steps ?? []).map(s => {
    if (s.e && !s.customId) {
      // Emoji del catálogo integrado
      return { tipo: "emoji", emoji: s.e, nombre: s.n, mins: s.mins };
    }
    if (s.customId) {
      const picto = customPictos.find(p => p.id === s.customId);
      if (!picto) {
        return { tipo: "emoji", emoji: "❓", nombre: s.n, mins: s.mins };
      }
      if (picto.origen === "arasaac" && picto.arasaacId) {
        // Solo guarda el ID — la imagen se descarga al importar
        return { tipo: "arasaac", arasaacId: picto.arasaacId, nombre: s.n, mins: s.mins };
      }
      // Imagen subida por el usuario — hay que incrustar el base64
      return { tipo: "imagen", datos: picto.img, nombre: s.n, mins: s.mins };
    }
    return { tipo: "emoji", emoji: s.e ?? "❓", nombre: s.n, mins: s.mins };
  });
  return { ...rutina, steps };
}

// ─── Reconstrucción al importar ───────────────────────────────────────────────
const ARASAAC_IMG = id =>
  `https://static.arasaac.org/pictograms/${id}/${id}_500.png`;

async function urlABase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror  = reject;
    reader.readAsDataURL(blob);
  });
}

// Devuelve la rutina lista para añadir a savedRoutines.
// onProgreso(actual, total) se llama antes de procesar cada paso.
async function importarRutina(perfil, customPictos, onAddCustomPicto, onProgreso) {
  const steps = perfil.datos?.steps ?? [];
  const resultado = [];

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    onProgreso(i + 1, steps.length);
    const base = { id: Date.now() + Math.random(), mins: s.mins ?? 5 };

    // Formato antiguo (publicado antes de esta actualización): sin campo `tipo`
    if (!s.tipo) {
      resultado.push(s.e
        ? { ...base, e: s.e, n: s.n }
        : { ...base, e: "❓", n: s.n }
      );
      continue;
    }

    if (s.tipo === "emoji") {
      resultado.push({ ...base, e: s.emoji, n: s.nombre });

    } else if (s.tipo === "arasaac") {
      // Reusar si ya existe localmente (evita descarga duplicada)
      const existente = customPictos.find(p => p.arasaacId === s.arasaacId);
      if (existente) {
        resultado.push({ ...base, n: s.nombre, customId: existente.id });
      } else {
        try {
          const img   = await urlABase64(ARASAAC_IMG(s.arasaacId));
          const picto = {
            id: Date.now() + Math.random(),
            img, n: s.nombre, origen: "arasaac", arasaacId: s.arasaacId,
          };
          onAddCustomPicto(picto);
          resultado.push({ ...base, n: s.nombre, customId: picto.id });
        } catch {
          // Sin internet o ID inválido → marcador visible
          resultado.push({ ...base, e: "❓", n: s.nombre });
        }
      }

    } else if (s.tipo === "imagen") {
      // Deduplicar por prefijo de base64 + longitud (mismo archivo = mismos datos)
      const existenteImg = customPictos.find(p =>
        p.img && s.datos &&
        p.img.length === s.datos.length &&
        p.img.slice(0, 100) === s.datos.slice(0, 100)
      );
      if (existenteImg) {
        resultado.push({ ...base, n: s.nombre, customId: existenteImg.id });
      } else {
        const picto = { id: Date.now() + Math.random(), img: s.datos, n: s.nombre };
        onAddCustomPicto(picto);
        resultado.push({ ...base, n: s.nombre, customId: picto.id });
      }

    } else {
      resultado.push({ ...base, e: "❓", n: s.nombre ?? s.n ?? "Paso" });
    }
  }

  return {
    id:    Date.now(),
    name:  perfil.nombre || perfil.datos?.name || "Rutina importada",
    steps: resultado,
  };
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function ModalBiblioteca({
  user,
  savedRoutines,
  setSavedRoutines,
  customPictos,
  onAddCustomPicto,
  onClose,
}) {
  const [tab, setTab]           = useState("lista");
  const [perfiles, setPerfiles] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [importConfirm, setImportConfirm] = useState(null);

  // Progreso de importación de rutina
  const [importProg, setImportProg] = useState(null); // {cur, total} | null
  const importingRef = useRef(false); // guard síncrono contra doble tap

  // Publicar form
  const [pubTipo, setPubTipo]         = useState("rutina-reloj");
  const [pubRutinaIdx, setPubRutinaIdx] = useState(0);
  const [pubNombre, setPubNombre]     = useState("");
  const [pubDesc, setPubDesc]         = useState("");
  const [pubCargando, setPubCargando] = useState(false);
  const [pubOk, setPubOk]             = useState(false);
  const [pubError, setPubError]       = useState(null);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      setPerfiles(await listarPerfiles());
    } catch {
      setError("No se pudo cargar la biblioteca. Revisa tu conexión.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line

  // ─── Publicar ─────────────────────────────────────────────────────────────
  const handlePublicar = async () => {
    setPubError(null);
    let datos, nombre = pubNombre.trim();

    if (pubTipo === "rutina-reloj") {
      const rutina = savedRoutines[pubRutinaIdx];
      if (!rutina) { setPubError("Selecciona una rutina para publicar."); return; }
      datos  = toPortable(rutina, customPictos);
      if (!nombre) nombre = rutina.name || "Rutina";
    } else {
      if (!customPictos.length) { setPubError("No tienes pictogramas propios para publicar."); return; }
      datos  = customPictos;
      if (!nombre) nombre = "Mis pictogramas";
    }

    if (!nombre) { setPubError("Escribe un nombre para identificar el contenido."); return; }

    if (byteSize(datos) > 800_000) {
      setPubError(
        "Esta biblioteca es demasiado pesada para compartir (máx. ~800 KB). " +
        "Publica menos imágenes por vez. Las rutinas con emojis o pictogramas de ARASAAC pesan mucho menos."
      );
      return;
    }

    setPubCargando(true);
    try {
      await publicarPerfil(user, { nombre, descripcion: pubDesc.trim(), tipo: pubTipo, datos });
      setPubOk(true);
      setPubNombre(""); setPubDesc("");
      setTimeout(() => { setPubOk(false); setTab("lista"); cargar(); }, 1800);
    } catch(e) {
      setPubError("No se pudo publicar. " + (e.message || "Intenta de nuevo."));
    } finally {
      setPubCargando(false);
    }
  };

  // ─── Importar ──────────────────────────────────────────────────────────────
  const doImportar = async (perfil) => {
    if (importingRef.current) return; // bloquea doble tap antes de que el estado actualice
    importingRef.current = true;
    try {
      if (perfil.tipo === "rutina-reloj") {
        const total = (perfil.datos?.steps ?? []).length;
        setImportProg({ cur: 0, total });
        try {
          const rutina = await importarRutina(
            perfil, customPictos, onAddCustomPicto,
            (cur, total) => setImportProg({ cur, total }),
          );
          setSavedRoutines(rs => [...rs, rutina]);
        } finally {
          setImportProg(null);
        }
      } else if (perfil.tipo === "biblioteca-pictogramas") {
        const lista = Array.isArray(perfil.datos) ? perfil.datos : [];
        lista.forEach(p => onAddCustomPicto({ ...p, id: Date.now() + Math.random() }));
      }
    } finally {
      importingRef.current = false;
    }
  };

  const handleImportar = async (perfil) => {
    const hayDuplicado =
      perfil.tipo === "rutina-reloj"
        ? savedRoutines.some(r => r.name === (perfil.datos?.name ?? perfil.nombre))
        : Array.isArray(perfil.datos) &&
          perfil.datos.some(p => customPictos.some(c => c.n === p.n));

    if (hayDuplicado) { setImportConfirm(perfil); return; }
    await doImportar(perfil);
  };

  // ─── Eliminar ─────────────────────────────────────────────────────────────
  const handleEliminar = async (id) => {
    try {
      await eliminarPerfil(id);
      setConfirmDelete(null);
      setPerfiles(ps => ps.filter(p => p.id !== id));
    } catch {
      setError("No se pudo eliminar. Intenta de nuevo.");
    }
  };

  const esMio = p => p.creadoPor === user?.email;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="rv-overlay" onClick={onClose}>
      <div className="rv-card" onClick={e => e.stopPropagation()}
        style={{ maxHeight: "88dvh", display: "flex", flexDirection: "column", padding: "16px 16px 12px" }}>
        <div className="rv-drag-pill"/>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <h2 style={{ margin: 0, flex: 1 }}>☁️ Biblioteca del equipo</h2>
          <span style={{ fontSize: 11, color: T.dim, textAlign: "right", maxWidth: 160, lineHeight: 1.3 }}>
            {user?.email}
          </span>
        </div>

        <div className="rv-seg" style={{ marginBottom: 14 }}>
          <button className={tab === "lista"    ? "on" : ""} onClick={() => setTab("lista")}>
            Del equipo
          </button>
          <button className={tab === "publicar" ? "on" : ""} onClick={() => setTab("publicar")}>
            Publicar
          </button>
        </div>

        {/* ── Progreso de importación ─────────────────────────────────────── */}
        {importProg && (
          <div style={{
            background: T.panel, border: `1.5px solid ${T.line}`,
            borderRadius: 14, padding: "14px 16px", marginBottom: 12,
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>
              Descargando pictogramas… {importProg.cur}/{importProg.total}
            </div>
            <div style={{
              height: 6, borderRadius: 999, background: T.line, overflow: "hidden",
            }}>
              <div style={{
                height: "100%", borderRadius: 999,
                background: T.warn5,
                width: `${importProg.total ? (importProg.cur / importProg.total) * 100 : 0}%`,
                transition: "width .3s",
              }}/>
            </div>
          </div>
        )}

        <div style={{ overflowY: "auto", flex: 1 }}>

          {/* ── Tab: lista ─────────────────────────────────────────────────── */}
          {tab === "lista" && (
            <>
              {cargando && (
                <p style={{ textAlign: "center", padding: "32px 0", color: T.dim }}>Cargando…</p>
              )}
              {error && (
                <div style={{ background: "#FFF4F4", border: "1.5px solid #E04F4F",
                  borderRadius: 14, padding: "12px 14px", color: "#C03030",
                  fontSize: 13, marginBottom: 12 }}>
                  {error}
                </div>
              )}
              {!cargando && !error && perfiles.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0", color: T.dim }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
                  <div style={{ fontSize: 14 }}>Todavía no hay nada publicado</div>
                </div>
              )}

              {!cargando && perfiles.map(p => (
                <div key={p.id} style={{
                  background: T.panel, border: `1.5px solid ${T.line}`,
                  borderRadius: 14, padding: "12px 14px", marginBottom: 10,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, fontSize: 14, flex: 1, color: T.text }}>
                      {p.nombre}
                    </span>
                    <span style={{ fontSize: 11, color: T.dim, background: T.bg,
                      border: `1px solid ${T.line}`, borderRadius: 999,
                      padding: "2px 8px", whiteSpace: "nowrap", flexShrink: 0 }}>
                      {TIPO_LABELS[p.tipo] ?? p.tipo}
                    </span>
                  </div>
                  {p.descripcion ? (
                    <div style={{ fontSize: 12, color: T.dim, marginBottom: 4 }}>{p.descripcion}</div>
                  ) : null}
                  <div style={{ fontSize: 11, color: T.dim, marginBottom: 10 }}>
                    {p.creadoPor} · {fmtFecha(p.actualizadoEn)}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn primary" style={{ fontSize: 13, padding: "6px 14px" }}
                      disabled={!!importProg}
                      onClick={() => handleImportar(p)}>
                      ⬇ Importar
                    </button>
                    {esMio(p) && (
                      confirmDelete === p.id ? (
                        <>
                          <button className="btn" style={{ fontSize: 12,
                            background: "#E04F4F", color: "#fff", borderColor: "transparent" }}
                            onClick={() => handleEliminar(p.id)}>
                            Sí, eliminar
                          </button>
                          <button className="btn" style={{ fontSize: 12 }}
                            onClick={() => setConfirmDelete(null)}>
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button className="btn" style={{ fontSize: 12 }}
                          onClick={() => setConfirmDelete(p.id)}>
                          ✕ Eliminar
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}

              <button className="btn" style={{ width: "100%", marginTop: 4, fontSize: 13 }}
                onClick={cargar}>
                Actualizar lista
              </button>
            </>
          )}

          {/* ── Tab: publicar ──────────────────────────────────────────────── */}
          {tab === "publicar" && (
            <>
              <div style={{ background: "#FFF8E7", border: "1.5px solid #E3C334",
                borderRadius: 14, padding: "12px 14px", marginBottom: 16,
                fontSize: 12, lineHeight: 1.55 }}>
                <strong>⚠️ Recuerda:</strong> no incluyas nombres de estudiantes.
                Usa solo códigos o descripciones funcionales
                (ej: "Rutina transición post-recreo").
              </div>

              <div className="rv-row" style={{ margin: "0 0 12px" }}>
                <span className="rv-label">Tipo</span>
                <div className="rv-seg">
                  <button className={pubTipo === "rutina-reloj"           ? "on" : ""}
                    onClick={() => setPubTipo("rutina-reloj")}>Rutina</button>
                  <button className={pubTipo === "biblioteca-pictogramas"  ? "on" : ""}
                    onClick={() => setPubTipo("biblioteca-pictogramas")}>Pictogramas</button>
                </div>
              </div>

              {pubTipo === "rutina-reloj" && (
                <div className="rv-row" style={{ margin: "0 0 12px" }}>
                  <span className="rv-label">Rutina</span>
                  {savedRoutines.length === 0 ? (
                    <span style={{ fontSize: 13, color: T.dim }}>No hay rutinas guardadas</span>
                  ) : (
                    <select className="rv-input"
                      style={{ flex: 1, width: "auto", textAlign: "left" }}
                      value={pubRutinaIdx}
                      onChange={e => setPubRutinaIdx(Number(e.target.value))}>
                      {savedRoutines.map((r, i) => (
                        <option key={r.id ?? i} value={i}>{r.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {pubTipo === "biblioteca-pictogramas" && (
                <div style={{ fontSize: 13, color: T.dim, marginBottom: 12 }}>
                  Se publicarán tus {customPictos.length} pictograma(s) propios.
                </div>
              )}

              <div className="rv-row" style={{ margin: "0 0 12px" }}>
                <span className="rv-label">Nombre</span>
                <input className="rv-input"
                  style={{ flex: 1, width: "auto", textAlign: "left", paddingLeft: 12 }}
                  placeholder={
                    pubTipo === "rutina-reloj" && savedRoutines[pubRutinaIdx]
                      ? savedRoutines[pubRutinaIdx].name
                      : "Nombre para la biblioteca"
                  }
                  value={pubNombre}
                  onChange={e => setPubNombre(e.target.value)}/>
              </div>

              <div className="rv-row" style={{ margin: "0 0 16px" }}>
                <span className="rv-label">Descripción</span>
                <input className="rv-input"
                  style={{ flex: 1, width: "auto", textAlign: "left", paddingLeft: 12 }}
                  placeholder="Opcional"
                  value={pubDesc}
                  onChange={e => setPubDesc(e.target.value)}/>
              </div>

              {pubError && (
                <div style={{ background: "#FFF4F4", border: "1.5px solid #E04F4F",
                  borderRadius: 14, padding: "10px 14px", color: "#C03030",
                  fontSize: 13, marginBottom: 12 }}>
                  {pubError}
                </div>
              )}
              {pubOk && (
                <div style={{ background: "#F0FFF4", border: "1.5px solid #46A877",
                  borderRadius: 14, padding: "10px 14px", color: "#276749",
                  fontSize: 13, marginBottom: 12, fontWeight: 800 }}>
                  ✅ Publicado correctamente
                </div>
              )}

              <button className="btn primary" style={{ width: "100%" }}
                onClick={handlePublicar} disabled={pubCargando}>
                {pubCargando ? "Publicando…" : "☁️ Publicar en la biblioteca"}
              </button>
            </>
          )}
        </div>

        <button className="btn" style={{ width: "100%", marginTop: 12 }}
          onClick={onClose} disabled={!!importProg}>
          {importProg ? "Importando…" : "Cerrar"}
        </button>
      </div>

      {/* ── Confirmación de importar duplicado ─────────────────────────────── */}
      {importConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(34,48,63,.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 50, padding: 20 }} onClick={() => setImportConfirm(null)}>
          <div style={{ background: T.bg, borderRadius: 20, padding: "20px 20px 16px",
            maxWidth: 340, width: "100%" }} onClick={e => e.stopPropagation()}>
            <p style={{ margin: "0 0 14px", fontWeight: 800, fontSize: 14, lineHeight: 1.5 }}>
              Ya existe contenido similar localmente. ¿Importar de todas formas?
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn primary" style={{ flex: 1 }}
                onClick={() => { const p = importConfirm; setImportConfirm(null); doImportar(p); }}>
                Importar
              </button>
              <button className="btn" style={{ flex: 1 }}
                onClick={() => setImportConfirm(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
