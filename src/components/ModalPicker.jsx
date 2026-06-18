import { useState, useRef } from "react";
import { PICTOS, T } from "../shared";

const ARASAAC_IMG = (id) => `https://static.arasaac.org/pictograms/${id}/${id}_300.png`;
const ARASAAC_SEARCH = (q) => `https://api.arasaac.org/v1/pictograms/es/search/${encodeURIComponent(q)}`;

export default function ModalPicker({ customPictos, onSelect, onClose, onUploadClick, onRename, onRemove }) {
  const [tab, setTab]           = useState("local");   // "local" | "arasaac"
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const inputRef                = useRef(null);

  const buscar = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const res  = await fetch(ARASAAC_SEARCH(q));
      if (!res.ok) throw new Error("Sin resultados");
      const data = await res.json();
      setResults(data.slice(0, 40)); // máximo 40
    } catch(e) {
      setError("No se encontraron pictogramas. Intenta otra palabra.");
    } finally {
      setLoading(false);
    }
  };

  const seleccionarArasaac = (picto) => {
    const keyword = picto.keywords?.[0]?.keyword ?? "Pictograma";
    onSelect({ img: ARASAAC_IMG(picto._id), n: keyword });
  };

  return (
    <div className="rv-overlay" onClick={onClose}>
      <div className="rv-card" onClick={e => e.stopPropagation()}
        style={{maxHeight:"88vh", display:"flex", flexDirection:"column"}}>
        <div className="rv-drag-pill"/>
        <h2>¿Qué actividad viene?</h2>

        {/* Tabs */}
        <div className="rv-seg" style={{marginBottom:16, alignSelf:"stretch"}}>
          <button className={tab === "local" ? "on" : ""}
            onClick={() => setTab("local")}>Mis pictos</button>
          <button className={tab === "arasaac" ? "on" : ""}
            onClick={() => { setTab("arasaac"); setTimeout(() => inputRef.current?.focus(), 50); }}>
            🔍 ARASAAC
          </button>
        </div>

        {/* ---- Contenido scrollable ---- */}
        <div style={{overflowY:"auto", flex:1}}>

          {tab === "local" ? (
            <>
              {customPictos.length > 0 && (
                <>
                  <p style={{color:T.dim,fontSize:12.5,fontWeight:800,margin:"0 0 8px"}}>Mis pictogramas</p>
                  <div className="rv-grid" style={{marginBottom:14}}>
                    {customPictos.map(p => (
                      <button key={p.id} className="rv-pick" onClick={() => onSelect(p)}>
                        <img src={p.img} alt={p.n}/>
                        <input className="pn" value={p.n}
                          onClick={e => e.stopPropagation()}
                          onChange={e => onRename(p.id, e.target.value)}
                          style={{border:"none",background:"transparent",width:"100%",
                            textAlign:"center",fontFamily:"inherit",fontWeight:700,
                            fontSize:11,color:T.text}}/>
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

              <p className="rv-note">Las imágenes se guardan en este dispositivo. Toca el nombre para editarlo.</p>
            </>
          ) : (
            <>
              {/* Buscador ARASAAC */}
              <div style={{display:"flex", gap:8, marginBottom:16}}>
                <input ref={inputRef}
                  className="rv-input"
                  style={{flex:1, width:"auto", textAlign:"left", paddingLeft:14, fontSize:15}}
                  placeholder="Buscar pictograma… (ej: comer)"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && buscar()}/>
                <button className="btn primary"
                  style={{minWidth:52, padding:"0 14px"}}
                  onClick={buscar}
                  disabled={loading}>
                  {loading ? "…" : "Buscar"}
                </button>
              </div>

              {error && (
                <p style={{color:T.dim, fontSize:13, textAlign:"center", padding:"16px 0"}}>{error}</p>
              )}

              {!loading && results.length === 0 && !error && (
                <p style={{color:T.dim, fontSize:13, textAlign:"center", padding:"24px 0"}}>
                  Escribe una palabra y pulsa Buscar
                </p>
              )}

              {results.length > 0 && (
                <>
                  <p style={{color:T.dim,fontSize:12,fontWeight:700,margin:"0 0 10px"}}>
                    {results.length} resultado{results.length !== 1 ? "s" : ""} — toca para seleccionar
                  </p>
                  <div className="rv-grid">
                    {results.map(p => (
                      <button key={p._id} className="rv-pick"
                        onClick={() => seleccionarArasaac(p)}>
                        <img src={ARASAAC_IMG(p._id)}
                          alt={p.keywords?.[0]?.keyword ?? ""}
                          loading="lazy"
                          style={{background:"#fff"}}/>
                        <span className="pn">{p.keywords?.[0]?.keyword ?? ""}</span>
                      </button>
                    ))}
                  </div>
                  <p style={{color:T.dim,fontSize:11,textAlign:"center",marginTop:12}}>
                    Pictogramas de ARASAAC bajo licencia CC BY-NC-SA
                  </p>
                </>
              )}
            </>
          )}
        </div>

        <button className="btn" style={{width:"100%", marginTop:12}} onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
