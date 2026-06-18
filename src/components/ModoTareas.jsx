import { useState, useEffect, useRef } from "react";
import { T } from "../shared";

function cargarTareas() {
  try { return JSON.parse(localStorage.getItem("rv-tareas")||"[]"); }
  catch(e) { return []; }
}

export default function ModoTareas() {
  const [tareas, setTareas] = useState(cargarTareas);
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  useEffect(()=>{
    try { localStorage.setItem("rv-tareas", JSON.stringify(tareas)); }
    catch(e){}
  },[tareas]);

  const agregar = () => {
    const texto = input.trim();
    if(!texto) return;
    setTareas(t=>[...t, { id:Date.now(), texto, hecha:false }]);
    setInput("");
    inputRef.current?.focus();
  };

  const toggleHecha = (id) =>
    setTareas(t=>t.map(x=>x.id===id?{...x,hecha:!x.hecha}:x));

  const eliminar = (id) =>
    setTareas(t=>t.filter(x=>x.id!==id));

  const limpiarHechas = () =>
    setTareas(t=>t.filter(x=>!x.hecha));

  const hechas = tareas.filter(t=>t.hecha).length;
  const total  = tareas.length;

  return (
    <div style={{
      width:"100%", maxWidth:560, padding:"0 16px 100px",
      display:"flex", flexDirection:"column", flex:1,
    }}>

      {/* Progreso */}
      {total>0&&(
        <div style={{marginBottom:16}}>
          <div style={{
            display:"flex", justifyContent:"space-between",
            fontSize:13, fontWeight:800, color:T.dim, marginBottom:6,
          }}>
            <span>{hechas} de {total} {total===1?"tarea":"tareas"}</span>
            {hechas>0&&(
              <button onClick={limpiarHechas} style={{
                background:"none", border:"none", cursor:"pointer",
                color:T.dim, fontSize:13, fontWeight:800, padding:0,
              }}>Limpiar hechas ✕</button>
            )}
          </div>
          <div style={{
            height:6, background:T.panel, borderRadius:999,
            border:`1.5px solid ${T.line}`, overflow:"hidden",
          }}>
            <div style={{
              height:"100%", background:"#46A877",
              width:`${total===0?0:Math.round(hechas/total*100)}%`,
              borderRadius:999, transition:"width .4s",
            }}/>
          </div>
        </div>
      )}

      {/* Input agregar */}
      <div style={{display:"flex", gap:8, marginBottom:16}}>
        <input
          ref={inputRef}
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&agregar()}
          placeholder="Agregar tarea…"
          className="rv-input"
          style={{flex:1, width:"auto", textAlign:"left", paddingLeft:14, fontSize:15}}
        />
        <button className="btn primary" onClick={agregar}
          style={{minWidth:48, fontSize:22, padding:"0 14px"}}>+</button>
      </div>

      {/* Lista */}
      {tareas.length===0&&(
        <div style={{
          textAlign:"center", padding:"48px 0",
          color:T.dim, fontSize:14, fontWeight:700,
        }}>
          <div style={{fontSize:48, marginBottom:12}}>📋</div>
          Agrega la primera tarea
        </div>
      )}

      <div style={{display:"flex", flexDirection:"column", gap:8}}>
        {tareas.map(t=>(
          <div key={t.id} style={{
            display:"flex", alignItems:"center", gap:12,
            background: t.hecha ? T.panel : T.bg,
            border:`1.5px solid ${T.line}`,
            borderRadius:14, padding:"12px 14px",
            transition:"background .2s",
          }}>
            {/* Checkbox */}
            <button onClick={()=>toggleHecha(t.id)} aria-label={t.hecha?"Marcar pendiente":"Marcar hecha"}
              style={{
                width:28, height:28, borderRadius:"50%", flexShrink:0,
                border:`2px solid ${t.hecha?"#46A877":T.line}`,
                background: t.hecha ? "#46A877" : T.bg,
                cursor:"pointer", display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:14, transition:"all .2s",
              }}>
              {t.hecha&&<span style={{color:"#fff", lineHeight:1}}>✓</span>}
            </button>

            {/* Texto */}
            <span style={{
              flex:1, fontSize:15, fontWeight:700,
              color: t.hecha ? T.dim : T.text,
              textDecoration: t.hecha ? "line-through" : "none",
              transition:"color .2s",
            }}>
              {t.texto}
            </span>

            {/* Eliminar */}
            <button onClick={()=>eliminar(t.id)} aria-label="Eliminar"
              style={{
                background:"none", border:"none", cursor:"pointer",
                color:T.dim, fontSize:18, padding:"4px 2px", lineHeight:1,
              }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
