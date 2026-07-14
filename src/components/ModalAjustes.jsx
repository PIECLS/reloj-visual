import { T, WEDGE_COLORS, MILESTONES, textOn, playEnd, speak } from "../shared";

export default function ModalAjustes({
  wedgeKey, setWedgeKey,
  inverted, setInverted,
  sound, setSound,
  reducedMotion, setReducedMotion,
  speechOn, setSpeechOn,
  activeHitos, toggleHito,
  onClose,
}) {
  return (
    <div className="rv-overlay" onClick={onClose}>
      <div className="rv-card" onClick={e=>e.stopPropagation()}>
        <div className="rv-drag-pill"/>
        <h2>Ajustes</h2>

        <div className="rv-row">
          <span className="rv-label">Color</span>
          <div className="rv-swatches">
            {WEDGE_COLORS.map(w=>(
              <button key={w.k} className={"rv-sw"+(w.k===wedgeKey?" on":"")}
                style={{background:w.c,color:textOn(w.c)}} title={w.n}
                onClick={()=>setWedgeKey(w.k)}>
                {w.k===wedgeKey?"✓":""}
              </button>
            ))}
          </div>
        </div>

        <div className="rv-row">
          <span className="rv-label">Orientación</span>
          <div className="rv-seg">
            <button className={!inverted?"on":""} onClick={()=>setInverted(false)}>Horaria ↻</button>
            <button className={inverted?"on":""} onClick={()=>setInverted(true)}>Inversa ↺</button>
          </div>
        </div>

        <div className="rv-row">
          <span className="rv-label">Sonido</span>
          <div className="rv-seg">
            {[["off","Sin sonido"],["suave","Suave"],["campana","Campana"]].map(([k,n])=>(
              <button key={k} className={sound===k?"on":""}
                onClick={()=>{ setSound(k); if(k!=="off") playEnd(k); }}>{n}</button>
            ))}
          </div>
        </div>

        <div className="rv-row">
          <span className="rv-label">Animación</span>
          <div className="rv-seg">
            <button className={!reducedMotion?"on":""} onClick={()=>setReducedMotion(false)}>Normal</button>
            <button className={reducedMotion?"on":""} onClick={()=>setReducedMotion(true)}>Reducida</button>
          </div>
        </div>

        <div className="rv-row" style={{alignItems:"flex-start"}}>
          <span className="rv-label" style={{paddingTop:6}}>Avisos</span>
          <div style={{display:"flex",flexDirection:"column",gap:8,flex:1}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {MILESTONES.map(({key,text})=>(
                <button key={key} onClick={()=>toggleHito(key)}
                  className={"btn"+(activeHitos[key]?" primary":"")}
                  style={{minHeight:38,padding:"6px 12px",fontSize:13}}>
                  {text.replace("Quedan ","").replace("Queda ","")
                       .replace(" minutos"," min").replace(" minuto"," min")
                       .replace(" segundos"," seg")}
                </button>
              ))}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:13,fontWeight:800,color:T.dim}}>Voz</span>
              <div className="rv-seg">
                <button className={speechOn?"on":""}
                  onClick={()=>{ setSpeechOn(true); speak("Avisos de voz activados"); }}>Sí</button>
                <button className={!speechOn?"on":""} onClick={()=>setSpeechOn(false)}>No</button>
              </div>
              <span style={{fontSize:12,color:T.dim}}>Requiere sonido activado</span>
            </div>
          </div>
        </div>

        {/* Crédito ARASAAC */}
        <div style={{
          marginTop:20, padding:"12px 14px",
          background:T.panel, border:`1.5px solid ${T.line}`,
          borderRadius:14, fontSize:12, color:T.dim, lineHeight:1.6,
        }}>
          <div style={{fontWeight:800, marginBottom:4, color:T.text}}>Acerca de los pictogramas</div>
          Pictogramas de{" "}
          <a href="https://arasaac.org" target="_blank" rel="noreferrer"
            style={{color:"#4A90D9",fontWeight:700}}>ARASAAC</a>
          {" "}(Portal Aragonés de la Comunicación Aumentativa y Alternativa).{"\n"}
          Autor: Sergio Palao. Origen: ARASAAC — Gobierno de Aragón.{" "}
          Licencia:{" "}
          <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer"
            style={{color:"#4A90D9"}}>CC BY-NC-SA 4.0</a>.
        </div>

        <button className="btn" style={{width:"100%",marginTop:14}} onClick={onClose}>Listo</button>
      </div>
    </div>
  );
}
