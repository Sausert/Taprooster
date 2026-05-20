import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tapper handleiding — Taprooster OJC Walhalla",
  description: "Alles wat je als tapper moet weten over het Taprooster",
};

export default function TapperHandleiding() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="hd-page">
        <div className="hd-header">
          <div className="hd-logo">TAP<span>ROOSTER</span></div>
          <div className="hd-subtitle">OJC Walhalla · Sevenum</div>
        </div>

        <div className="hd-content">
          <div className="hd-badge">🍺 Tapper handleiding</div>
          <h1>Hoe gebruik je het Taprooster?</h1>
          <p className="hd-lead">Alles wat je als tapper moet weten — van inloggen tot afmelden.</p>

          <hr className="hd-divider" />

          <div className="hd-section">
            <div className="hd-step-num">1</div>
            <div className="hd-step-body">
              <h2>Inloggen</h2>
              <p>
                Ga naar <strong>remigommans.nl</strong> op je telefoon of computer.
                Vul je <strong>e-mailadres</strong> en <strong>wachtwoord</strong> in en klik op &quot;Inloggen&quot;.
              </p>
              <div className="hd-highlight">
                <p>
                  💡 <strong>Eerste keer?</strong> Je hebt een uitnodigingslink van de admin nodig.
                  Vraag de admin om een link op jouw e-mailadres te sturen. Via die link maak je een account aan.
                  Vergeet niet je e-mail te bevestigen via de verificatiemail die je ontvangt.
                </p>
              </div>
              <div className="hd-tip">
                <p>
                  📱 <strong>Tip:</strong> Sla de app op je beginscherm op (iOS: Deel → &quot;Voeg toe aan beginscherm&quot; /
                  Android: Chrome-menu → &quot;Toevoegen aan startscherm&quot;). Dan werkt hij als een echte app.
                </p>
              </div>
            </div>
          </div>

          <hr className="hd-divider" />

          <div className="hd-section">
            <div className="hd-step-num">2</div>
            <div className="hd-step-body">
              <h2>Het dashboard</h2>
              <p>
                Na het inloggen kom je op het <strong>dashboard</strong>. Dit is je startpunt. Hier zie je in één oogopslag:
              </p>
              <ul>
                <li>Jouw <strong>eerstvolgende dienst</strong> met een countdown</li>
                <li>Het aantal diensten dat je <strong>dit jaar</strong> hebt gedraaid</li>
                <li>Jouw <strong>positie op de ranglijst</strong></li>
                <li><strong>Open diensten</strong> waar je je op kunt aanmelden</li>
                <li><strong>Berichten</strong> van de admin</li>
              </ul>
              <div className="hd-highlight">
                <p>
                  🟠 <strong>Oranje melding?</strong> Er staat een dienst op je naam die je nog niet hebt bevestigd.
                  Klik op &quot;✅ Ik ben erbij&quot; om te bevestigen.
                </p>
              </div>
            </div>
          </div>

          <hr className="hd-divider" />

          <div className="hd-section">
            <div className="hd-step-num">3</div>
            <div className="hd-step-body">
              <h2>Aanmelden voor een dienst</h2>
              <p>
                Op het dashboard staan open diensten onder &quot;Aanmelden&quot;.
                Klik op <strong>&quot;Aanmelden&quot;</strong> bij een dienst om je in te schrijven.
                De dienst verschijnt daarna meteen in jouw rooster.
              </p>
              <p>
                Je kunt ook via het <strong>Rooster</strong>-scherm (onderaan) diensten bekijken en je aanmelden.
                Klik op een dienst met een open plek → klik &quot;Aanmelden&quot;.
              </p>
              <div className="hd-tip">
                <p>
                  📅 <strong>Agenda:</strong> Klik op het 📅-icoon bij een dienst om de dienst direct toe te voegen
                  aan je Google Calendar, Apple Agenda of andere agenda-app.
                </p>
              </div>
            </div>
          </div>

          <hr className="hd-divider" />

          <div className="hd-section">
            <div className="hd-step-num">4</div>
            <div className="hd-step-body">
              <h2>Dienst bevestigen</h2>
              <p>
                De admin kan jou <strong>automatisch inplannen</strong> op basis van jouw voorkeursdagen.
                Je ontvangt dan een e-mail dat je bent ingepland.
              </p>
              <p>
                Op je dashboard verschijnt een melding met de vraag of je er zeker bij bent.
                Klik op <strong>&quot;✅ Ik ben erbij&quot;</strong> om te bevestigen.
                Doe dit zo snel mogelijk zodat de admin weet dat alles geregeld is.
              </p>
            </div>
          </div>

          <hr className="hd-divider" />

          <div className="hd-section">
            <div className="hd-step-num">5</div>
            <div className="hd-step-body">
              <h2>Afmelden voor een dienst</h2>
              <p>
                Kun je toch niet? Meld je dan zo snel mogelijk af zodat er een vervanger gevonden kan worden.
              </p>
              <ol>
                <li>Klik op <strong>Rooster</strong> onderaan</li>
                <li>Zoek de dienst op</li>
                <li>Klik op de dienst → klik <strong>&quot;Afmelden&quot;</strong></li>
              </ol>
              <div className="hd-warning">
                <p>
                  ⚠️ <strong>Let op:</strong> Na je afmelding ontvangen andere tappers automatisch een e-mail
                  over de open plek. Meld je zo vroeg mogelijk af.
                </p>
              </div>
            </div>
          </div>

          <hr className="hd-divider" />

          <div className="hd-section">
            <div className="hd-step-num">6</div>
            <div className="hd-step-body">
              <h2>Het rooster</h2>
              <p>
                Via het menu onderaan kom je op de <strong>Roosterpagina</strong>.
                Hier zie je alle komende diensten per maand.
              </p>
              <div className="hd-color-legend">
                <div className="hd-color-item">
                  <span className="hd-dot hd-dot-purple" />
                  <span><strong>Paars</strong> — jouw ingeplande dienst</span>
                </div>
                <div className="hd-color-item">
                  <span className="hd-dot hd-dot-mint" />
                  <span><strong>Mintgroen</strong> — dienst is vol</span>
                </div>
                <div className="hd-color-item">
                  <span className="hd-dot hd-dot-amber" />
                  <span><strong>Oranje</strong> — dienst is niet vol, je kunt je aanmelden</span>
                </div>
                <div className="hd-color-item">
                  <span className="hd-dot hd-dot-red" />
                  <span><strong>Rood</strong> — dienst is nog helemaal leeg</span>
                </div>
                <div className="hd-color-item">
                  <span className="hd-dot hd-dot-pink" />
                  <span><strong>Roze</strong> — feestje of speciaal evenement</span>
                </div>
              </div>
              <p>
                Schakel tussen <strong>maandweergave</strong> (kalender) en <strong>lijstweergave</strong>
                met de knoppen rechtsboven op de roosterpagina.
              </p>
            </div>
          </div>

          <hr className="hd-divider" />

          <div className="hd-section">
            <div className="hd-step-num">7</div>
            <div className="hd-step-body">
              <h2>Account &amp; instellingen</h2>
              <p>
                Klik op <strong>&quot;Account&quot;</strong> onderaan om je profiel te bekijken en aan te passen.
                Hier kun je:
              </p>
              <ul>
                <li>Je <strong>e-mailadres</strong> wijzigen</li>
                <li>Je <strong>telefoonnummer</strong> bijwerken</li>
                <li>Je <strong>voorkeursdagen</strong> aanpassen (woensdag / vrijdag / zaterdag)</li>
                <li>Aangeven of je <strong>feestjes</strong> wilt meehelpen</li>
                <li>Je <strong>wachtwoord</strong> veranderen</li>
              </ul>
            </div>
          </div>

          <hr className="hd-divider" />

          <div className="hd-section">
            <div className="hd-step-num">8</div>
            <div className="hd-step-body">
              <h2>E-mail notificaties</h2>
              <p>Je ontvangt automatisch een e-mail bij de volgende situaties:</p>
              <table className="hd-notif-table">
                <tbody>
                  <tr><td>📅</td><td><strong>Nieuw rooster gepubliceerd</strong> — bekijk jouw diensten</td></tr>
                  <tr><td>⏰</td><td><strong>Herinnering 2 weken van tevoren</strong> — dienst eraan komen</td></tr>
                  <tr><td>⏰</td><td><strong>Herinnering 1 week van tevoren</strong> — dienst eraan komen</td></tr>
                  <tr><td>🔓</td><td><strong>Open plek</strong> — een andere tapper heeft zich afgemeld</td></tr>
                  <tr><td>📢</td><td><strong>Bericht van de admin</strong> — aankondiging of informatie</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <hr className="hd-divider" />

          <div className="hd-section">
            <div className="hd-step-num">9</div>
            <div className="hd-step-body">
              <h2>Wachtwoord vergeten</h2>
              <p>
                Op de inlogpagina staat de link <strong>&quot;Wachtwoord vergeten?&quot;</strong>.
                Vul je e-mailadres in en je ontvangt een herstelmail.
                De link in die mail is 24 uur geldig.
              </p>
            </div>
          </div>
        </div>

        <div className="hd-footer">
          <p>OJC Walhalla · De Donckstraat 24/26, 5975 AC Sevenum</p>
          <p style={{ marginTop: 8 }}>
            <a href="/handleiding" className="hd-footer-link">← Handleiding overzicht</a>
            {" · "}
            <a href="/login" className="hd-footer-link">Inloggen</a>
          </p>
        </div>
      </div>
    </>
  );
}

const styles = `
  .hd-page { max-width: 640px; margin: 0 auto; padding: 40px 20px; font-family: 'Helvetica Neue', Arial, sans-serif; }
  .hd-header { background: linear-gradient(135deg, #1a1730, #221f38); border: 1px solid #2e2a4a; border-radius: 16px 16px 0 0; padding: 32px; text-align: center; }
  .hd-logo { color: #00e5c3; font-size: 28px; font-weight: 900; letter-spacing: 3px; }
  .hd-logo span { color: #f0eeff; }
  .hd-subtitle { color: #8b80b0; font-size: 12px; letter-spacing: 2px; margin-top: 6px; text-transform: uppercase; }
  .hd-content { background: #1a1730; border: 1px solid #2e2a4a; border-top: none; padding: 36px 32px; }
  .hd-badge { display: inline-block; background: rgba(0,229,195,0.15); color: #00e5c3; border: 1px solid #00e5c3; border-radius: 20px; padding: 4px 14px; font-size: 12px; font-weight: 700; letter-spacing: 1px; margin-bottom: 14px; }
  .hd-content h1 { color: #f0eeff; font-size: 24px; font-weight: 700; margin-bottom: 10px; }
  .hd-lead { color: #8b80b0; font-size: 15px; line-height: 1.6; margin-bottom: 4px; }
  .hd-divider { border: none; border-top: 1px solid #2e2a4a; margin: 28px 0; }
  .hd-section { display: flex; gap: 20px; align-items: flex-start; }
  .hd-step-num { flex-shrink: 0; width: 36px; height: 36px; background: rgba(0,229,195,0.12); border: 1px solid #00e5c3; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #00e5c3; font-weight: 900; font-size: 16px; margin-top: 2px; }
  .hd-step-body { flex: 1; }
  .hd-step-body h2 { color: #f0eeff; font-size: 17px; font-weight: 700; margin-bottom: 10px; }
  .hd-step-body p { color: #8b80b0; font-size: 15px; line-height: 1.65; margin-bottom: 12px; }
  .hd-step-body p:last-child { margin-bottom: 0; }
  .hd-step-body strong { color: #e8e0ff; }
  .hd-step-body ul, .hd-step-body ol { color: #8b80b0; font-size: 15px; line-height: 1.8; padding-left: 20px; margin-bottom: 12px; }
  .hd-step-body li { margin-bottom: 4px; }
  .hd-highlight { background: rgba(0,229,195,0.07); border: 1px solid rgba(0,229,195,0.35); border-radius: 10px; padding: 14px 18px; margin: 12px 0; }
  .hd-highlight p { color: #b8f0e8 !important; margin: 0 !important; font-size: 14px !important; }
  .hd-tip { background: rgba(196,181,253,0.07); border: 1px solid rgba(196,181,253,0.3); border-radius: 10px; padding: 14px 18px; margin: 12px 0; }
  .hd-tip p { color: #c4b5fd !important; margin: 0 !important; font-size: 14px !important; }
  .hd-warning { background: rgba(255,181,71,0.08); border: 1px solid rgba(255,181,71,0.4); border-radius: 10px; padding: 14px 18px; margin: 12px 0; }
  .hd-warning p { color: #ffb547 !important; margin: 0 !important; font-size: 14px !important; }
  .hd-color-legend { margin: 12px 0 16px; display: flex; flex-direction: column; gap: 8px; }
  .hd-color-item { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #8b80b0; }
  .hd-dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
  .hd-dot-purple { background: #c4b5fd; }
  .hd-dot-mint { background: #00e5c3; }
  .hd-dot-amber { background: #ffb547; }
  .hd-dot-red { background: #ff4f6d; }
  .hd-dot-pink { background: #f472b6; }
  .hd-notif-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  .hd-notif-table td { padding: 8px 6px; color: #8b80b0; font-size: 14px; vertical-align: top; line-height: 1.5; border-bottom: 1px solid #2e2a4a; }
  .hd-notif-table tr:last-child td { border-bottom: none; }
  .hd-notif-table td:first-child { width: 30px; font-size: 16px; padding-right: 12px; }
  .hd-notif-table strong { color: #e8e0ff; }
  .hd-footer { background: #221f38; border: 1px solid #2e2a4a; border-top: none; border-radius: 0 0 16px 16px; padding: 20px 32px; text-align: center; }
  .hd-footer p { color: #8b80b0; font-size: 12px; }
  .hd-footer-link { color: #00e5c3; text-decoration: none; }
  @media (max-width: 480px) {
    .hd-content { padding: 28px 20px; }
    .hd-content h1 { font-size: 20px; }
    .hd-section { flex-direction: column; gap: 12px; }
    .hd-step-num { margin-top: 0; }
  }
`;
