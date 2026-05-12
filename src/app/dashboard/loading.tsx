export default function Loading() {
  return (
    <div style={{ padding:"20px 16px", background:"#0f0d1a", minHeight:"100vh" }}>
      <div style={{ marginBottom:20 }}>
        <div className="skeleton-box" style={{ width:100, height:14, marginBottom:8 }}/>
        <div className="skeleton-box" style={{ width:160, height:26 }}/>
      </div>
      <div className="skeleton-box" style={{ height:140, borderRadius:16, marginBottom:12 }}/>
      <div className="skeleton-box" style={{ width:120, height:11, marginBottom:8 }}/>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
        <div className="skeleton-box" style={{ height:80, borderRadius:16 }}/>
        <div className="skeleton-box" style={{ height:80, borderRadius:16 }}/>
      </div>
      <div className="skeleton-box" style={{ height:60, borderRadius:16, marginBottom:12 }}/>
      <div className="skeleton-box" style={{ width:100, height:11, marginBottom:8 }}/>
      {[1,2].map(i => (
        <div key={i} className="skeleton-box" style={{ height:90, borderRadius:16, marginBottom:10 }}/>
      ))}
    </div>
  );
}
