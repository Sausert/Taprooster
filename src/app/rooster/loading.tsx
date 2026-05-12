export default function Loading() {
  return (
    <div style={{ padding:"16px 16px", background:"#0f0d1a", minHeight:"100vh" }}>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <div className="skeleton-box" style={{ flex:1, height:40, borderRadius:10 }}/>
        <div className="skeleton-box" style={{ flex:1, height:40, borderRadius:10 }}/>
      </div>
      <div className="skeleton-box" style={{ height:44, borderRadius:10, marginBottom:16 }}/>
      <div className="skeleton-box" style={{ height:30, borderRadius:6, marginBottom:12 }}/>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:4, marginBottom:16 }}>
        {Array(35).fill(null).map((_,i) => (
          <div key={i} className="skeleton-box" style={{ aspectRatio:"1", borderRadius:8 }}/>
        ))}
      </div>
    </div>
  );
}
