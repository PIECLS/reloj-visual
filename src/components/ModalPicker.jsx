import { useState, useRef } from "react";
import { PICTOS, T } from "../shared";

const ARASAAC_IMG  = (id) => `https://static.arasaac.org/pictograms/${id}/${id}_500.png`;
const ARASAAC_API  = (q)  => `https://api.arasaac.org/v1/pictograms/es/search/${encodeURIComponent(q)}`;

async function urlABase64(url) {
  const res  = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror  = reject;
    reader.readAsDataURL(blob);
  });
}

export default function ModalPicker({
  customPictos, onSelect, onClose, onUploadClick,
  onRename, onRemove, onAddCustomPicto,
  // Firebase — opcionales; solo se muestran si el usuario está conectado
  fbUser, fbEsColegio, onAbrirBiblioteca,
}) {
  const [tab, setTab]           = useState("local");
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState(null);

  // Pictograma ARASAAC seleccionado (para mostrar hoja de acción)
  const [seleccionado, setSeleccionado] = useState(null);
  const [guardando, setGuardando]       = useState(false);
  const [guardadoOk, setGuardadoOk]    = useState(false);

  const inputRef = useRef(null);

  const buscar = async () => {
    const q = query.trim();
    if (!q) return;
    setCargando(true);
    setError(null);
    setResults([]);
    setSeleccionado(null);
    try {
      const res  = await fetch(ARASAAC_API(q));
      if (!res.ok) throw new Error("sin_resultados");
      const data = await res.json();
      if (!data.length) throw new Error("sin_resultados");
      setResults(data);
    } catch (e) {
      setError(
        e.message === "sin_resultados"
          ? `No se encontraron pictogramas para "${q}".`
          : "No se pudo conectar con ARASAAC. Verifica tu conexión."
      );
    } finally {
      setCargando(false);
    }
  };

  const usarAhora = (picto) => {
    const keyword = picto.keywords?.[0]?.keyword ?? "Pictograma";
    onSelect({ img: ARASAAC_IMG(picto._id), n: keyword });
  };

  const guardarEnBiblioteca = async (picto) => {
    setGuardando(true);
    setGuardadoOk(false);
    try {
      const keyword = picto.keywords?.[0]?.keyword ?? "Pictograma";
      const base64  = await urlABase64(ARASAAC_IMG(picto._id));
      const nuevo   = {
        id:       Date.now() + Math.random(),
        img:      base64,
        n:        keyword,
        origen:   "arasaac",
        arasaacId: picto._id,  // necesario para reconstrucción cross-device
      };
      onAddCustomPicto(nuevo);
      setGuardadoOk(true);
      setTimeout(() => { setSeleccionado(null); setGuardadoOk(false); }, 1800);
    } catch (e) {
      setError("No se pudo descargar la imagen. Verifica tu conexión.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rv-overlay" onClick={onClose}>
      <div className="rv-card" onClick={e => e.stopPropagation()}
        style={{maxHeight:"88vh", display:"flex", flexDirection:"column", padding:"16px 16px 12px"}}>
        <div className="rv-drag-pill"/>
        <h2>¿Qué actividad viene?</h2>

        {/* ── Tabs ── */}
        <div className="rv-seg" style={{marginBottom:14, alignSelf:"stretch"}}>
          <button className={tab === "local" ? "on" : ""}
            onClick={() => { setTab("local"); setSeleccionado(null); }}>
            Mis pictos
          </button>
          <button className={tab === "arasaac" ? "on" : ""}
            onClick={() => {
              setTab("arasaac");
              setSeleccionado(null);
              setTimeout(() => inputRef.current?.focus(), 60);
            }}>
            🔍 Buscar ARASAAC
          </button>
        </div>

        {/* ── Contenido scrollable ── */}
        <div style={{overflowY:"auto", flex:1}}>

          {tab === "local" ? (
            <>
              {customPictos.length > 0 && (
                <>
                  <p style={{color:T.dim,fontSize:12.5,fontWeight:800,margin:"0 0 8px"}}>
                    Mis pictogramas
                  </p>
                  <div className="rv-grid" style={{marginBottom:14}}>
                    {customPictos.map(p => (
                      <button key={p.id} className="rv-pick" onClick={() => onSelect(p)}
                        style={{position:"relative"}}>
                        <img src={p.img} alt={p.n}/>
                        <input className="pn" value={p.n}
                          onClick={e => e.stopPropagation()}
                          onChange={e => onRename(p.id, e.target.value)}
                          style={{border:"none",background:"transparent",width:"100%",
                            textAlign:"center",fontFamily:"inherit",fontWeight:700,
                            fontSize:11,color:T.text}}/>
                        {p.origen === "arasaac" && (
                          <span style={{
                            position:"absolute", top:3, left:3,
                            fontSize:9, fontWeight:800, color:"#4A90D9",
                            background:"#4A90D922", border:"1px solid #4A90D944",
                            borderRadius:4, padding:"1px 4px", lineHeight:1.4,
                            pointerEvents:"none",
                          }}>ARASAAC</span>
                        )}
                        <span className="del" role="button"
                          onClick={e => { e.stopPropagation(); onRemove(p.id); }}>✕</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className="rv-grid">
                <button className="rv-pick" style={{borderStyle:"dashed"}} onClick={onUploadClick}>
                  <span className="emo">＋</span><span className="pn">Subir imagen</span>
                </button>
                {PICTOS.map(p => (
                  <button key={p.n} className="rv-pick" onClick={() => onSelect(p)}>
                    <span className="emo">{p.e}</span><span className="pn">{p.n}</span>
                  </button>
                ))}
              </div>

              <p className="rv-note">
                Las imágenes se guardan en este dispositivo. Toca el nombre para editarlo.
              </p>

              {/* Acceso contextual a la biblioteca — solo si ya está conectado */}
              {fbUser && fbEsColegio && onAbrirBiblioteca && (
                <button className="btn" style={{ width: "100%", marginTop: 6, fontSize: 13 }}
                  onClick={() => { onClose(); onAbrirBiblioteca(); }}>
                  ☁️ Explorar biblioteca del equipo
                </button>
              )}
            </>
          ) : (
            <>
              {/* ── Buscador ── */}
              <div style={{display:"flex", gap:8, marginBottom:14}}>
                <input ref={inputRef}
                  className="rv-input"
                  inputMode="text"
                  style={{flex:1, width:"auto", textAlign:"left", paddingLeft:14, fontSize:15}}
                  placeholder="Ej: comer, pelota, baño…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && buscar()}/>
                <button className="btn primary"
                  style={{minWidth:56, padding:"0 14px"}}
                  onClick={buscar}
                  disabled={cargando || !query.trim()}>
                  {cargando ? "…" : "Buscar"}
                </button>
              </div>

              {/* Estado vacío / cargando */}
              {!cargando && results.length === 0 && !error && (
                <p style={{color:T.dim, fontSize:13, textAlign:"center", padding:"28px 0"}}>
                  Escribe una palabra y pulsa Buscar
                </p>
              )}

              {error && (
                <p style={{color:T.dim, fontSize:13, textAlign:"center", padding:"16px 0"}}>{error}</p>
              )}

              {/* Resultados */}
              {results.length > 0 && !seleccionado && (
                <>
                  <p style={{color:T.dim,fontSize:12,fontWeight:700,margin:"0 0 10px"}}>
                    {results.length} resultado{results.length !== 1 ? "s" : ""} — toca para seleccionar
                  </p>
                  <div className="rv-grid">
                    {results.map(p => (
                      <button key={p._id} className="rv-pick"
                        onClick={() => { setSeleccionado(p); setGuardadoOk(false); }}>
                        <img src={ARASAAC_IMG(p._id)}
                          alt={p.keywords?.[0]?.keyword ?? ""}
                          loading="lazy"
                          style={{background:"#fff"}}/>
                        <span className="pn">{p.keywords?.[0]?.keyword ?? ""}</span>
                      </button>
                    ))}
                  </div>

                  {/* Atribución ARASAAC (bloque 4a) */}
                  <p style={{
                    color:T.dim, fontSize:11, textAlign:"center",
                    marginTop:16, lineHeight:1.5,
                  }}>
                    Pictogramas de{" "}
                    <a href="https://arasaac.org" target="_blank" rel="noreferrer"
                      style={{color:"#4A90D9", fontWeight:700}}>ARASAAC</a>
                    {" "}· Autor: Sergio Palao · Licencia CC BY-NC-SA
                  </p>
                </>
              )}
            </>
          )}
        </div>

        {/* ── Hoja de acción ARASAAC (bloque 2 + 3) ── */}
        {seleccionado && (
          <div style={{
            borderTop:`1.5px solid ${T.line}`, marginTop:12,
            paddingTop:12, display:"flex", flexDirection:"column", gap:8,
          }}>
            <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:4}}>
              <img src={ARASAAC_IMG(seleccionado._id)}
                alt={seleccionado.keywords?.[0]?.keyword}
                style={{width:56,height:56,objectFit:"contain",background:"#fff",
                  borderRadius:10, border:`1.5px solid ${T.line}`, flexShrink:0}}/>
              <div>
                <div style={{fontWeight:800, fontSize:14, color:T.text}}>
                  {seleccionado.keywords?.[0]?.keyword ?? "Pictograma"}
                </div>
                <div style={{fontSize:11, color:T.dim, marginTop:2}}>
                  ARASAAC · CC BY-NC-SA
                </div>
              </div>
              <button onClick={() => setSeleccionado(null)}
                style={{marginLeft:"auto",background:"none",border:"none",
                  cursor:"pointer",color:T.dim,fontSize:20,lineHeight:1}}>✕</button>
            </div>

            {guardadoOk ? (
              <div style={{
                background:"#46A87722", border:"1.5px solid #46A877",
                borderRadius:12, padding:"10px 14px",
                color:"#46A877", fontWeight:800, fontSize:14, textAlign:"center",
              }}>
                ✓ Guardado en tu biblioteca
              </div>
            ) : (
              <>
                <button className="btn primary" style={{width:"100%"}}
                  onClick={() => guardarEnBiblioteca(seleccionado)}
                  disabled={guardando}>
                  {guardando ? "Guardando pictograma…" : "💾 Guardar en mi biblioteca"}
                </button>
                <button className="btn" style={{width:"100%"}}
                  onClick={() => { usarAhora(seleccionado); }}>
                  ▶ Usar solo ahora
                </button>
              </>
            )}
          </div>
        )}

        <button className="btn" style={{width:"100%", marginTop:10}} onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
