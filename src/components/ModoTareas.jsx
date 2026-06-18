import { T } from "../shared";

export default function ModoTareas() {
  return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", flex:1, gap:16, padding:32,
    }}>
      <div style={{fontSize:64}}>✅</div>
      <h2 style={{margin:0, color:T.text}}>Timer con tareas</h2>
      <p style={{color:T.dim, textAlign:"center", maxWidth:320, lineHeight:1.6}}>
        Próximamente. Reloj con lista de tareas para secuenciación y automonitoreo.
      </p>
    </div>
  );
}
