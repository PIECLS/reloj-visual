import { PICTOS, T } from "../shared";

export default function ModalPicker({ customPictos, onSelect, onClose, onUploadClick, onRename, onRemove }) {
  return (
    <div className="rv-overlay" onClick={onClose}>
      <div className="rv-card" onClick={e=>e.stopPropagation()}>
        <div className="rv-drag-pill"/>
        <h2>¿Qué actividad viene?</h2>

        {customPictos.length>0&&(
          <>
            <p style={{color:T.dim,fontSize:12.5,fontWeight:800,margin:"0 0 8px"}}>Mis pictogramas</p>
            <div className="rv-grid" style={{marginBottom:14}}>
              {customPictos.map(p=>(
                <button key={p.id} className="rv-pick" onClick={()=>onSelect(p)}>
                  <img src={p.img} alt={p.n}/>
                  <input className="pn" value={p.n}
                    onClick={e=>e.stopPropagation()}
                    onChange={e=>onRename(p.id,e.target.value)}
                    style={{border:"none",background:"transparent",width:"100%",
                      textAlign:"center",fontFamily:"inherit",fontWeight:700,
                      fontSize:11,color:T.text}}/>
                  <span className="del" role="button"
                    onClick={e=>{e.stopPropagation();onRemove(p.id);}}>✕</span>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="rv-grid">
          <button className="rv-pick" style={{borderStyle:"dashed"}} onClick={onUploadClick}>
            <span className="emo">＋</span><span className="pn">Subir imagen</span>
          </button>
          {PICTOS.map(p=>(
            <button key={p.n} className="rv-pick" onClick={()=>onSelect(p)}>
              <span className="emo">{p.e}</span><span className="pn">{p.n}</span>
            </button>
          ))}
        </div>

        <p className="rv-note">Las imágenes se guardan en este dispositivo (solo aquí). Si borras el caché del navegador o cambias de equipo, las perderás. Toca el nombre para editarlo.</p>
        <button className="btn" style={{width:"100%",marginTop:12}} onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
