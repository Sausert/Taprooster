export default function Loading() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#0f0d1a", gap:12 }}>
      <div style={{ fontSize:36, animation:"pulse 1.5s ease-in-out infinite" }}>🍺</div>
      <p style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:"#8b80b0", textTransform:"uppercase" }}>Laden...</p>
    </div>
  );
}
