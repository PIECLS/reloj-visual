import { T } from "../shared";

export default function ModoSemaforo() {
  return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", flex:1, gap:16, padding:32,
    }}>
      <div style={{fontSize:64}}>🚦</div>
      <h2 style={{margin:0, color:T.text}}>Semáforo táctil</h2>
      <p style={{color:T.dim, textAlign:"center", maxWidth:320, lineHeight:1.6}}>
        Próximamente. Tres luces grandes para autorregulación emocional y gestión de turnos.
      </p>
    </div>
  );
}
