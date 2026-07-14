import { useState, useRef, useEffect } from "react";
import { dbGetAll, dbPut, dbDelete } from "./db";
import { T, WEDGE_COLORS, textOn } from "./shared";
import useWakeLock from "./hooks/useWakeLock";
import ModoReloj from "./components/ModoReloj";
import ModoSemaforo from "./components/ModoSemaforo";
import ModoTareas from "./components/ModoTareas";

const MODOS = [
  { key:"reloj",    label:"Reloj",    ico:"⏱️" },
  { key:"semaforo", label:"Semáforo", ico:"🚦" },
  { key:"tareas",   label:"Tareas",   ico:"✅" },
];

export default function App() {
  const [modo, setModo] = useState("reloj");

  // ---- Ajustes compartidos ----
  const [wakeLockOn, setWakeLockOn] = useState(() => {
    try { return JSON.parse(localStorage.getItem("rv-wakelock") ?? "true"); }
    catch(e) { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem("rv-wakelock", JSON.stringify(wakeLockOn)); } catch(e) {}
  }, [wakeLockOn]);
  const { active: wakeLockActive } = useWakeLock(wakeLockOn);

  const [wedgeKey, setWedgeKey] = useState("rojo");
  const [inverted, setInverted] = useState(false);
  const [sound, setSound] = useState("suave");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [speechOn, setSpeechOn] = useState(false);
  const [activeHitos, setActiveHitos] = useState({ m5:true, m3:false, m2:false, m1:true, s30:false, s5:false });
  const toggleHito = (k) => setActiveHitos(h=>({...h,[k]:!h[k]}));

  const baseWedge = WEDGE_COLORS.find(w=>w.k===wedgeKey).c;

  // ---- Pictogramas propios (compartidos entre modos) ----
  const [customPictos, setCustomPictos] = useState([]);
  const fileRef = useRef(null);

  useEffect(()=>{
    dbGetAll().then(items=>{ if(items.length) setCustomPictos(items); }).catch(()=>{});
  },[]);

  const handleFiles = (ev) => {
    Array.from(ev.target.files||[]).forEach(file=>{
      const reader = new FileReader();
      reader.onload = () => {
        const name = file.name.replace(/\.[^.]+$/,"").slice(0,24)||"Imagen";
        const picto = { id:Date.now()+Math.random(), img:reader.result, n:name };
        setCustomPictos(c=>[...c,picto]);
        dbPut(picto).catch(()=>{});
      };
      reader.readAsDataURL(file);
    });
    ev.target.value="";
  };

  const addCustomPicto = (picto) => {
    setCustomPictos(c => [...c, picto]);
    dbPut(picto).catch(() => {});
  };

  const removeCustom = (id) => {
    setCustomPictos(c=>c.filter(p=>p.id!==id));
    dbDelete(id).catch(()=>{});
  };

  const renameCustom = (id, n) => {
    setCustomPictos(c=>{
      const updated = c.map(p=>p.id===id?{...p,n}:p);
      const picto = updated.find(p=>p.id===id);
      if(picto) dbPut(picto).catch(()=>{});
      return updated;
    });
  };

  // ---- Rutinas guardadas (compartidas entre modos) ----
  const [savedRoutines, setSavedRoutines] = useState(()=>{
    try{ return JSON.parse(localStorage.getItem("rv-saved-routines")||"[]"); }
    catch(e){ return []; }
  });
  useEffect(()=>{
    try{ localStorage.setItem("rv-saved-routines",JSON.stringify(savedRoutines)); }
    catch(e){}
  },[savedRoutines]);

  // ---- CSS global (necesita baseWedge y reducedMotion para theming) ----
  const css = `
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    .rv{
      min-height:100dvh;background:${T.bg};color:${T.text};
      font-family:ui-rounded,'Segoe UI',system-ui,-apple-system,sans-serif;
      display:flex;flex-direction:column;align-items:center;
      padding-bottom:env(safe-area-inset-bottom,0px);
    }
    .rv-hdr{
      width:100%;max-width:980px;display:flex;align-items:center;
      justify-content:space-between;padding:12px 16px;
    }
    .rv-title{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:${T.dim};font-weight:800}
    .rv-hbtns{display:flex;gap:8px}
    .rv-modeselector{
      display:flex;background:${T.panel};border:1.5px solid ${T.line};
      border-radius:14px;overflow:hidden;
    }
    .rv-modeselector button{
      background:transparent;border:none;color:${T.dim};
      padding:8px 14px;font-size:13px;font-weight:800;
      cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:5px;
      white-space:nowrap;
    }
    .rv-modeselector button.on{background:${baseWedge};color:${textOn(baseWedge)}}

    .btn{
      background:${T.panel};color:${T.text};border:1.5px solid ${T.line};
      border-radius:14px;padding:10px 16px;font-size:14px;font-weight:700;
      cursor:pointer;font-family:inherit;min-height:44px;
      transition:${reducedMotion?"none":"transform .12s,border-color .2s"};
      display:inline-flex;align-items:center;justify-content:center;gap:6px;
    }
    .btn:hover{border-color:${baseWedge}}
    .btn:active{transform:${reducedMotion?"none":"scale(.96)"}}
    .btn:focus-visible{outline:3px solid ${baseWedge};outline-offset:2px}
    .btn.primary{background:${baseWedge};color:${textOn(baseWedge)};border-color:transparent;font-size:15px}
    .btn.ghost{background:transparent;border-color:transparent;font-size:22px;padding:8px}

    .rv-stage{
      position:relative;
      width:min(88vmin,520px);height:min(88vmin,520px);
      flex-shrink:0;
    }
    .rv-svg{width:100%;height:100%;display:block;touch-action:none}
    .rv-center{
      position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      width:38%;height:38%;border-radius:50%;
      background:${T.bg};border:2px solid ${T.line};
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
      cursor:pointer;box-shadow:0 0 0 6px ${T.bg};user-select:none;overflow:hidden;
    }
    .rv-center:focus-visible{outline:3px solid ${baseWedge};outline-offset:3px}
    .rv-actname{font-size:clamp(10px,2vmin,14px);font-weight:800;text-align:center;padding:0 8px}
    .rv-digital{font-size:clamp(12px,2.4vmin,17px);font-weight:800;color:${T.dim};font-variant-numeric:tabular-nums}
    .rv-badge{
      position:absolute;top:5%;left:50%;transform:translateX(-50%);
      font-weight:800;font-size:12px;padding:5px 12px;border-radius:999px;
      white-space:nowrap;
    }
    @keyframes rvpulse{0%,100%{opacity:1}50%{opacity:.55}}

    .rv-controls{
      display:flex;flex-wrap:wrap;gap:10px;align-items:center;
      justify-content:center;padding:6px 16px 8px;
    }
    .rv-input{
      width:62px;background:${T.bg};border:1.5px solid ${T.line};
      color:${T.text};border-radius:12px;padding:9px 8px;font-size:16px;
      font-weight:800;text-align:center;font-family:inherit;min-height:44px;
    }
    .rv-input:focus-visible{outline:3px solid ${baseWedge};outline-offset:1px}
    .rv-seg{display:flex;background:${T.panel};border:1.5px solid ${T.line};border-radius:12px;overflow:hidden}
    .rv-seg button{
      background:transparent;border:none;color:${T.dim};
      padding:10px 13px;font-size:13px;font-weight:800;
      cursor:pointer;font-family:inherit;min-height:44px;
    }
    .rv-seg button.on{background:${baseWedge};color:${textOn(baseWedge)}}

    .rv-strip{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;padding:4px 16px 16px;max-width:920px}
    .rv-chip{
      display:flex;align-items:center;gap:7px;background:${T.panel};
      border:1.5px solid ${T.line};border-radius:999px;padding:7px 13px;
      font-size:13px;font-weight:700;color:${T.dim};
    }
    .rv-chip.cur{border-color:${baseWedge};color:${T.text};box-shadow:0 0 0 3px ${baseWedge}33}
    .rv-chip.done{opacity:.5;text-decoration:line-through}
    .rv-chip img{width:20px;height:20px;object-fit:cover;border-radius:5px}

    .rv-tabbar{
      display:none;
      position:fixed;bottom:0;left:0;right:0;
      background:${T.bg};border-top:1.5px solid ${T.line};
      padding:6px 12px calc(6px + env(safe-area-inset-bottom,0px));
      z-index:30;gap:0;
    }
    .rv-tabbar .tab{
      flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
      gap:2px;background:none;border:none;cursor:pointer;
      font-family:inherit;font-size:10px;font-weight:800;color:${T.dim};
      min-height:52px;padding:4px 0;
    }
    .rv-tabbar .tab .ico{font-size:22px;line-height:1}
    .rv-tabbar .tab.active{color:${baseWedge}}
    .rv-tabbar .tab.main{flex:1.5}
    .rv-tabbar .tab.main .ico{
      background:${baseWedge};color:${textOn(baseWedge)};
      width:52px;height:52px;border-radius:50%;display:flex;align-items:center;
      justify-content:center;font-size:24px;margin-bottom:2px;
      box-shadow:0 3px 12px ${baseWedge}66;
    }

    .rv-overlay{
      position:fixed;inset:0;
      background:rgba(34,48,63,.45);
      display:flex;align-items:flex-end;justify-content:center;
      z-index:40;padding:0;
    }
    .rv-card{
      background:${T.bg};
      border-radius:24px 24px 0 0;
      padding:20px 20px calc(20px + env(safe-area-inset-bottom,0px));
      width:100%;max-width:600px;
      max-height:88dvh;overflow-y:auto;
      box-shadow:0 -8px 40px rgba(34,48,63,.18);
    }
    .rv-card h2{margin:0 0 14px;font-size:18px}
    .rv-drag-pill{
      width:40px;height:4px;border-radius:999px;
      background:${T.line};margin:0 auto 16px;
    }
    @media(min-width:641px){
      .rv-overlay{align-items:center;padding:20px}
      .rv-card{border-radius:24px;max-height:86vh}
      .rv-drag-pill{display:none}
    }

    .rv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:10px}
    .rv-pick{
      background:${T.panel};border:2px solid ${T.line};border-radius:16px;
      padding:12px 6px;display:flex;flex-direction:column;align-items:center;gap:6px;
      cursor:pointer;color:${T.text};font-family:inherit;position:relative;
      min-height:44px;
    }
    .rv-pick:hover{border-color:${baseWedge}}
    .rv-pick .emo{font-size:30px;line-height:1}
    .rv-pick img{width:40px;height:40px;object-fit:cover;border-radius:10px}
    .rv-pick .pn{font-size:11px;font-weight:700;text-align:center;word-break:break-word}
    .rv-pick .del{
      position:absolute;top:-7px;right:-7px;width:22px;height:22px;
      border-radius:50%;background:${T.text};color:${T.bg};
      border:none;font-size:12px;cursor:pointer;line-height:22px;text-align:center;
    }
    .rv-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0}
    .rv-label{font-size:13px;font-weight:800;color:${T.dim};min-width:90px}
    select.rv-input{width:auto;text-align:left}
    .rv-step{
      display:flex;align-items:center;gap:10px;background:${T.panel};
      border:1.5px solid ${T.line};border-radius:14px;padding:10px 12px;margin:7px 0;
    }
    .rv-step img{width:26px;height:26px;object-fit:cover;border-radius:7px}
    .rv-step .x{margin-left:auto;background:none;border:none;color:${T.dim};font-size:20px;cursor:pointer;padding:4px}
    .rv-swatches{display:flex;gap:8px;flex-wrap:wrap}
    .rv-sw{
      width:42px;height:42px;border-radius:12px;cursor:pointer;
      border:3px solid transparent;font-weight:900;font-size:18px;
      display:flex;align-items:center;justify-content:center;
    }
    .rv-sw.on{border-color:${T.text}}
    .rv-note{color:${T.dim};font-size:12px;margin-top:8px;line-height:1.5}

    .rv-done{text-align:center;padding:10px 0}
    .rv-done .big{font-size:72px;margin:4px 0}
    .rv-done h2{font-size:24px}
    .rv-done .next-row{display:flex;align-items:center;justify-content:center;gap:12px;font-size:17px;font-weight:800;margin:14px 0}

    @media(max-width:640px){
      .rv-tabbar{display:flex}
      .rv-controls{display:none}
      .rv-hbtns{display:none}
      .rv-stage{width:min(94vmin,420px);height:min(94vmin,420px);margin-top:4px}
      .rv-timepanel{
        display:flex;align-items:center;gap:10px;
        padding:10px 16px 4px;justify-content:center;flex-wrap:wrap;
      }
    }
    @media(min-width:641px){
      .rv-timepanel{display:none}
    }
  `;

  const sharedProps = {
    customPictos,
    onUploadClick: ()=>fileRef.current?.click(),
    onRenameCustom: renameCustom,
    onRemoveCustom: removeCustom,
    onAddCustomPicto: addCustomPicto,
    savedRoutines, setSavedRoutines,
    wedgeKey, setWedgeKey,
    inverted, setInverted,
    sound, setSound,
    reducedMotion, setReducedMotion,
    speechOn, setSpeechOn,
    activeHitos, toggleHito,
    wakeLockOn, setWakeLockOn,
  };

  return (
    <div className="rv">
      <style>{css}</style>
      <input ref={fileRef} type="file" accept="image/*" multiple
        style={{display:"none"}} onChange={handleFiles}/>

      {/* ---- header ---- */}
      <div className="rv-hdr">
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div className="rv-title">Reloj Visual PIE</div>
          {wakeLockActive && (
            <span title="Pantalla bloqueada activa" style={{
              fontSize:13, opacity:.55, lineHeight:1, userSelect:"none",
            }}>🔆</span>
          )}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div className="rv-modeselector">
            {MODOS.map(m=>(
              <button key={m.key} className={modo===m.key?"on":""}
                onClick={()=>setModo(m.key)}>
                {m.ico} {m.label}
              </button>
            ))}
          </div>
          {/* botones de modo reloj (desktop) */}
          {modo==="reloj"&&<div id="rv-hbtns-slot"/>}
        </div>
      </div>

      {/* ---- modo activo ---- */}
      {modo==="reloj"    && <ModoReloj    {...sharedProps}/>}
      {modo==="semaforo" && <ModoSemaforo {...sharedProps}/>}
      {modo==="tareas"   && <ModoTareas   {...sharedProps}/>}
    </div>
  );
}
