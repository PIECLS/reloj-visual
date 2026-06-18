import { useState } from "react";
import { T, textOn, playWarn } from "../shared";

const LUCES = [
  { key:"rojo",     color:"#E04F4F", label:"Parar",    desc:"Detente, espera" },
  { key:"amarillo", color:"#E3C334", label:"Atención", desc:"Prepárate para cambiar" },
  { key:"verde",    color:"#46A877", label:"Seguir",   desc:"Todo bien, continúa" },
];

export default function ModoSemaforo({ sound, reducedMotion }) {
  const [activa, setActiva] = useState("verde");

  const cambiar = (key) => {
    if(key === activa) return;
    setActiva(key);
    playWarn(sound);
  };

  const luzActiva = LUCES.find(l=>l.key===activa);

  return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", flex:1, padding:"16px 24px 80px",
      gap:0,
    }}>

      {/* Carcasa del semáforo */}
      <div style={{
        background:"#1A1A1A", borderRadius:999,
        padding:"20px 18px", display:"flex", flexDirection:"column",
        gap:16, alignItems:"center",
        boxShadow:"0 8px 32px rgba(0,0,0,.22)",
      }}>
        {LUCES.map(luz=>{
          const on = activa===luz.key;
          return (
            <button key={luz.key} onClick={()=>cambiar(luz.key)}
              aria-label={luz.label} aria-pressed={on}
              style={{
                width:"min(30vmin,160px)", height:"min(30vmin,160px)",
                borderRadius:"50%", border:"none", cursor:"pointer",
                background: on ? luz.color : "#333",
                boxShadow: on
                  ? `0 0 48px ${luz.color}99, 0 0 12px ${luz.color}66, inset 0 2px 6px rgba(255,255,255,.15)`
                  : "inset 0 2px 6px rgba(0,0,0,.4)",
                transition: reducedMotion?"none":"background .25s, box-shadow .25s",
                display:"flex", alignItems:"center", justifyContent:"center",
                flexShrink:0,
              }}>
              <div style={{
                width:"42%", height:"42%", borderRadius:"50%",
                background: on ? `rgba(255,255,255,.22)` : "transparent",
                transition: reducedMotion?"none":"background .25s",
              }}/>
            </button>
          );
        })}
      </div>

      {/* Etiqueta del estado actual */}
      <div style={{
        marginTop:28, textAlign:"center",
        background: luzActiva.color,
        color: textOn(luzActiva.color),
        borderRadius:999, padding:"10px 28px",
        transition: reducedMotion?"none":"background .3s, color .3s",
      }}>
        <div style={{fontSize:20,fontWeight:900,letterSpacing:".04em"}}>{luzActiva.label}</div>
        <div style={{fontSize:13,fontWeight:700,opacity:.85,marginTop:2}}>{luzActiva.desc}</div>
      </div>

      {/* Instrucción */}
      <p style={{color:T.dim, fontSize:12, marginTop:20, textAlign:"center"}}>
        Toca una luz para cambiar el estado
      </p>
    </div>
  );
}
