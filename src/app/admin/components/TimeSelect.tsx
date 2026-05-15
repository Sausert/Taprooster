"use client";

const selectStyle: React.CSSProperties = {
  background: "#221f38",
  border: "1px solid #2e2a4a",
  borderRadius: 8,
  padding: "7px 6px",
  color: "#e8e0ff",
  fontSize: 14,
  fontFamily: "monospace",
  cursor: "pointer",
  flex: 1,
  minWidth: 0,
};

export function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h = "20", m = "00"] = (value || "20:00").split(":");
  return (
    <div style={{ display:"flex", gap:4, alignItems:"center" }}>
      <select value={h} onChange={e => onChange(`${e.target.value}:${m}`)} style={selectStyle}>
        {Array.from({ length:24 }, (_, i) => String(i).padStart(2,"0")).map(hh => (
          <option key={hh} value={hh}>{hh}</option>
        ))}
      </select>
      <span style={{ color:"#8b80b0", fontFamily:"monospace", fontSize:14, flexShrink:0 }}>:</span>
      <select value={m.length === 2 ? m : "00"} onChange={e => onChange(`${h}:${e.target.value}`)} style={selectStyle}>
        {["00","15","30","45"].map(mm => <option key={mm} value={mm}>{mm}</option>)}
      </select>
    </div>
  );
}
