import { useState } from "react";
import { PICTOS, T } from "../shared";

export default function ModalRutina({
  routine, setRoutine, customPictos,
  savedRoutines, setSavedRoutines,
  onClose, onStart,
  // Firebase — opcionales; solo se muestran si el usuario está conectado
  fbUser, fbEsColegio, onAbrirBiblioteca,
}) {
  const [draft, setDraft] = useState({ key:"p3", mins:10 });
  const [routineName, setRoutineName] = useState("");

  const allOptions = [
    ...PICTOS.map((p,i)=>({ key:"p"+i, label:`${p.e} ${p.n}`, picto:p })),
    ...customPictos.map(p=>({ key:"c"+p.id, label:`🖼️ ${p.n}`, picto:p })),
  ];

  const addStep = () => {
    const opt = allOptions.find(o=>o.key===draft.key) || allOptions[0];
    const p = opt.picto;
    const isCustom = draft.key.startsWith("c");
    const step = { id:Date.now(), e:p.e, img:p.img, n:p.n, mins:Math.min(60,Math.max(1,draft.mins)) };
    if(isCustom) step.customId = p.id;
    setRoutine(r=>[...r,step]);
  };

  const removeStep = (id) => setRoutine(r=>r.filter(s=>s.id!==id));

  const saveRoutine = () => {
    if(!routine.length) return;
    const name = routineName.trim() || `Rutina ${savedRoutines.length+1}`;
    const slim = routine.map(s=>s.img?{...s,img:undefined}:s);
    setSavedRoutines(r=>[...r,{ id:Date.now(), name, steps:slim }]);
    setRoutineName("");
  };

  const deleteSaved = (id) => setSavedRoutines(r=>r.filter(s=>s.id!==id));

  const loadSaved = (saved) => {
    const restored = saved.steps.map(s=>{
      if(s.customId){
        const found = customPictos.find(p=>p.id===s.customId);
        return found ? {...s,img:found.img} : s;
      }
      return s;
    });
    setRoutine(restored);
  };

  return (
    <div className="rv-overlay" onClick={onClose}>
      <div className="rv-card" onClick={e=>e.stopPropagation()}>
        <div className="rv-drag-pill"/>
        <h2>Rutina encadenada</h2>
        <p style={{color:T.dim,fontSize:13,marginTop:-8,marginBottom:12}}>
          Agrega actividades en orden. Al terminar una, avanza a la siguiente automáticamente.
        </p>

        {/* Agregar paso */}
        <div className="rv-row">
          <select className="rv-input" style={{width:"auto",flex:1}} value={draft.key}
            onChange={e=>setDraft({...draft,key:e.target.value})}>
            {allOptions.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <input className="rv-input" type="number" min="1" max="60"
            inputMode="numeric" value={draft.mins}
            onChange={e=>setDraft({...draft,mins:e.target.value})}
            onBlur={e=>{const v=Math.min(60,Math.max(1,Number(e.target.value)||1));setDraft({...draft,mins:v});}}/>
          <span style={{color:T.dim,fontWeight:800,fontSize:13}}>min</span>
          <button className="btn" onClick={addStep}>+</button>
        </div>

        {/* Pasos actuales */}
        {routine.map((s,i)=>(
          <div className="rv-step" key={s.id}>
            <strong style={{color:T.dim,minWidth:16}}>{i+1}.</strong>
            {s.img?<img src={s.img} alt=""/>:<span style={{fontSize:22}}>{s.e}</span>}
            <span style={{fontWeight:700,flex:1}}>{s.n}</span>
            <span style={{color:T.dim,whiteSpace:"nowrap"}}>{s.mins} min</span>
            <button className="x" onClick={()=>removeStep(s.id)}>✕</button>
          </div>
        ))}
        {routine.length===0&&<p style={{color:T.dim,fontSize:14}}>Aún no hay actividades.</p>}

        {/* Guardar con nombre */}
        {routine.length>0&&(
          <div className="rv-row" style={{marginTop:14}}>
            <input className="rv-input" style={{flex:1,width:"auto",textAlign:"left",paddingLeft:12}}
              placeholder="Nombre de la rutina…" value={routineName}
              onChange={e=>setRoutineName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&saveRoutine()}/>
            <button className="btn" onClick={saveRoutine}>💾 Guardar</button>
          </div>
        )}

        {/* Rutinas guardadas */}
        {savedRoutines.length>0&&(
          <>
            <p style={{color:T.dim,fontSize:12,fontWeight:800,margin:"16px 0 6px"}}>RUTINAS GUARDADAS</p>
            {savedRoutines.map(sr=>(
              <div className="rv-step" key={sr.id}>
                <span style={{fontWeight:700,flex:1}}>{sr.name}</span>
                <span style={{color:T.dim,fontSize:12,whiteSpace:"nowrap"}}>{sr.steps.length} pasos</span>
                <button className="btn" style={{padding:"6px 12px",minHeight:36,fontSize:13}}
                  onClick={()=>loadSaved(sr)}>Cargar</button>
                <button className="x" onClick={()=>deleteSaved(sr.id)}>✕</button>
              </div>
            ))}
          </>
        )}

        <div style={{display:"flex",gap:10,marginTop:14,flexWrap:"wrap"}}>
          <button className="btn primary" style={{flex:1}} onClick={onStart} disabled={!routine.length}>
            ▶ Iniciar rutina
          </button>
          <button className="btn" onClick={()=>{setRoutine([]);}}>Limpiar</button>
          {fbUser && fbEsColegio && onAbrirBiblioteca && (
            <button className="btn" style={{fontSize:12}}
              onClick={()=>{ onClose(); onAbrirBiblioteca(); }}>
              ☁️ Biblioteca
            </button>
          )}
          <button className="btn" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
