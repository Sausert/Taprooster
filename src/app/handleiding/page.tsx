import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Handleiding — Taprooster OJC Walhalla",
  description: "Gebruikshandleiding voor tappers en admins van het Taprooster",
};

export default function HandleidingPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="hd-page">
        <div className="hd-header">
          <div className="hd-logo">TAP<span>ROOSTER</span></div>
          <div className="hd-subtitle">OJC Walhalla · Sevenum</div>
        </div>
        <div className="hd-content">
          <h1>Handleiding</h1>
          <p className="hd-lead">Kies hieronder de handleiding die op jou van toepassing is.</p>
          <div className="hd-cards">
            <a href="/handleiding/tapper" className="hd-card">
              <div className="hd-card-icon">🍺</div>
              <div className="hd-card-title">Tapper</div>
              <div className="hd-card-desc">Hoe gebruik ik het taprooster? Aanmelden, bevestigen, afmelden en meer.</div>
              <div className="hd-card-link">Lees handleiding →</div>
            </a>
            <a href="/handleiding/admin" className="hd-card hd-card-amber">
              <div className="hd-card-icon">⚙️</div>
              <div className="hd-card-title">Admin</div>
              <div className="hd-card-desc">Tappers beheren, rooster genereren, feestjes aanmaken en publiceren.</div>
              <div className="hd-card-link hd-card-link-amber">Lees handleiding →</div>
            </a>
          </div>
        </div>
        <div className="hd-footer">
          <p>OJC Walhalla · De Donckstraat 24/26, 5975 AC Sevenum</p>
          <p><a href="/login" className="hd-footer-link">← Terug naar inloggen</a></p>
        </div>
      </div>
    </>
  );
}

const styles = `
  .hd-page { max-width: 600px; margin: 0 auto; padding: 40px 20px; font-family: 'Helvetica Neue', Arial, sans-serif; }
  .hd-header { background: linear-gradient(135deg, #1a1730, #221f38); border: 1px solid #2e2a4a; border-radius: 16px 16px 0 0; padding: 32px; text-align: center; }
  .hd-logo { color: #00e5c3; font-size: 28px; font-weight: 900; letter-spacing: 3px; }
  .hd-logo span { color: #f0eeff; }
  .hd-subtitle { color: #8b80b0; font-size: 12px; letter-spacing: 2px; margin-top: 6px; text-transform: uppercase; }
  .hd-content { background: #1a1730; border: 1px solid #2e2a4a; border-top: none; padding: 36px 32px; }
  .hd-content h1 { color: #f0eeff; font-size: 24px; font-weight: 700; margin-bottom: 10px; }
  .hd-lead { color: #8b80b0; font-size: 15px; line-height: 1.6; margin-bottom: 28px; }
  .hd-cards { display: flex; flex-direction: column; gap: 16px; }
  .hd-card { display: block; background: #221f38; border: 1px solid #2e2a4a; border-radius: 14px; padding: 24px; text-decoration: none; }
  .hd-card:hover { border-color: #00e5c3; }
  .hd-card-amber:hover { border-color: #ffb547; }
  .hd-card-icon { font-size: 32px; margin-bottom: 12px; }
  .hd-card-title { color: #f0eeff; font-size: 20px; font-weight: 700; margin-bottom: 8px; }
  .hd-card-desc { color: #8b80b0; font-size: 14px; line-height: 1.6; margin-bottom: 16px; }
  .hd-card-link { color: #00e5c3; font-size: 14px; font-weight: 700; }
  .hd-card-link-amber { color: #ffb547; }
  .hd-footer { background: #221f38; border: 1px solid #2e2a4a; border-top: none; border-radius: 0 0 16px 16px; padding: 20px 32px; text-align: center; }
  .hd-footer p { color: #8b80b0; font-size: 12px; margin-bottom: 6px; }
  .hd-footer-link { color: #00e5c3; text-decoration: none; }
  @media (min-width: 480px) { .hd-cards { flex-direction: row; } .hd-card { flex: 1; } }
`;
