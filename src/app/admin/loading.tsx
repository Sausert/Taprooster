export default function Loading() {
  return (
    <div style={{ display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", minHeight:"100vh", background:"#0f0d1a", gap:12 }}>
      <div style={{ fontSize:36, animation:"pulse 1.5s ease-in-out infinite" }}>🍺</div>
      <p style={{ fontSize:13, color:"#8b80b0", fontFamily:"'Exo 2',sans-serif", margin:0 }}>Laden...</p>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
