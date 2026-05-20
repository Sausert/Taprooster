import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin handleiding — Taprooster OJC Walhalla",
  description: "Beheerhandleiding voor admins van het Taprooster",
};

export default function AdminHandleiding() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="hd-page">
        <div className="hd-header">
          <div className="hd-logo">TAP<span>ROOSTER</span></div>
          <div className="hd-subtitle">OJC Walhalla · Sevenum</div>
        </div>

        <div className="hd-content">
          <div className="hd-badge">⚙️ Admin handleiding</div>
          <h1>Beheer van het Taprooster</h1>
          <p className="hd-lead">Alles wat je als admin moet weten — tappers beheren, rooster plannen en publiceren.</p>

          <hr className="hd-divider" />

          {/* 1. Admin-menu */}
          <div className="hd-section">
            <div className="hd-step-num">1</div>
            <div className="hd-step-body">
              <h2>Het admin-menu</h2>
              <p>
                Log in met je admin-account. Onderaan verschijnt een extra <strong>Admin</strong>-knop in het menu.
                Klik hierop om het beheergedeelte te openen.
              </p>
              <p>Het admin-gedeelte heeft vijf tabbladen bovenaan:</p>
              <div className="hd-tab-overview">
                <div className="hd-tab-item"><span>📊</span><span><strong>Status</strong> — overzicht bezetting en dienststatus</span></div>
                <div className="hd-tab-item"><span>👥</span><span><strong>Tappers</strong> — tappergegevens bekijken en aanpassen</span></div>
                <div className="hd-tab-item"><span>📅</span><span><strong>Rooster</strong> — gepubliceerd rooster, concept genereren en feestjes aanmaken</span></div>
                <div className="hd-tab-item"><span>💬</span><span><strong>Berichten</strong> — bericht sturen naar alle tappers</span></div>
                <div className="hd-tab-item"><span>🔗</span><span><strong>Uitnodiging</strong> — uitnodigingslink of QR-code genereren voor nieuwe tappers</span></div>
              </div>
            </div>
          </div>

          <hr className="hd-divider" />

          {/* 2. Status */}
          <div className="hd-section">
            <div className="hd-step-num">2</div>
            <div className="hd-step-body">
              <h2>Status &amp; overzicht</h2>
              <p>
                Het <strong>Status</strong>-tabblad toont een overzicht van alle geplande en gepubliceerde diensten dit jaar.
                Je ziet per dienst de bezetting en hoeveel tappers al bevestigd hebben.
              </p>
              <ul>
                <li>Bovenaan twee filters: <strong>Onderbezet</strong> (rood) en <strong>Onbevestigd</strong> (oranje) — klik erop om snel de probleemgevallen te zien</li>
                <li>Per dienst staat de bezetting <em>X/Y bezet · Z bevestigd</em></li>
                <li>Concept-diensten zijn gemarkeerd met een <span className="hd-badge-inline">Concept</span>-label</li>
                <li>Snel een tapper toevoegen via de <strong>+ Tapper</strong>-knop naast een dienst</li>
                <li>Onderaan: de <strong>Tapscore</strong> ranglijst van dit jaar</li>
              </ul>
            </div>
          </div>

          <hr className="hd-divider" />

          {/* 3. Tappers */}
          <div className="hd-section">
            <div className="hd-step-num">3</div>
            <div className="hd-step-body">
              <h2>Tappers beheren</h2>
              <p>
                Onder het <strong>Tappers</strong>-tabblad zie je alle geregistreerde tappers.
                Hier pas je tappergegevens aan of verwijder je een tapper.
                (Nieuwe tappers uitnodigen doe je via het aparte <strong>Uitnodiging</strong>-tabblad — zie stap 9.)
              </p>

              <h3>Tapper aanpassen</h3>
              <ol>
                <li>Klik op <strong>Bewerken</strong> naast de tapper</li>
                <li>Pas in het <strong>Info</strong>-tabblad aan: naam, e-mailadres, telefoonnummer, rol (tapper/admin)</li>
                <li>Pas in het <strong>Voorkeuren</strong>-tabblad aan: tapfrequentie, voorkeursdagen, voorkeursdiensten en onbeschikbare maanden</li>
                <li>Klik <strong>Opslaan</strong></li>
              </ol>

              <h3>Tapper verwijderen</h3>
              <ol>
                <li>Klik op <strong>Bewerken</strong> naast de tapper</li>
                <li>Klik <strong>Tapper verwijderen</strong> onderin het formulier</li>
                <li>Bevestig in het dialoogvenster</li>
              </ol>
              <div className="hd-warning">
                <p>⚠️ <strong>Let op:</strong> Verwijderen kan niet ongedaan gemaakt worden. Alle dienstgegevens van deze tapper worden verwijderd.</p>
              </div>
            </div>
          </div>

          <hr className="hd-divider" />

          {/* 4. Conceptrooster */}
          <div className="hd-section">
            <div className="hd-step-num">4</div>
            <div className="hd-step-body">
              <h2>Conceptrooster genereren</h2>
              <p>
                Ga naar <strong>Rooster</strong> → klik op het sub-tabblad <strong>Concept</strong>.
                Scroll naar beneden naar de sectie <em>Tapavonden genereren</em>.
              </p>
              <ol>
                <li>Kies een <strong>startdatum</strong> (Van) en <strong>einddatum</strong> (Tot en met)</li>
                <li>
                  Stel per dag in:
                  <ul>
                    <li>Aan/uit via de schakelaar</li>
                    <li><strong>Start- en eindtijd</strong></li>
                    <li><strong>Aantal tappers</strong> via de + / − knoppen (max 10)</li>
                    <li>
                      <strong>Modus:</strong>
                      <ul>
                        <li>
                          <span className="hd-mode-auto">Auto inplannen</span>
                          {" "}— het systeem verdeelt tappers automatisch op basis van voorkeuren en werkbelasting
                        </li>
                        <li>
                          <span className="hd-mode-open">Open plekken</span>
                          {" "}— de dienst wordt aangemaakt zonder tappers; tappers kunnen zichzelf aanmelden
                        </li>
                      </ul>
                    </li>
                  </ul>
                </li>
                <li>Klik <strong>Genereer conceptrooster</strong></li>
              </ol>
              <div className="hd-highlight">
                <p>
                  💡 Het systeem houdt rekening met voorkeursdagen, al ingeplande diensten en onbeschikbare maanden van tappers.
                  Bestaande diensten in de gekozen periode worden niet overschreven.
                </p>
              </div>
            </div>
          </div>

          <hr className="hd-divider" />

          {/* 5. Conceptdiensten aanpassen */}
          <div className="hd-section">
            <div className="hd-step-num">5</div>
            <div className="hd-step-body">
              <h2>Conceptdiensten aanpassen</h2>
              <p>
                Na het genereren verschijnen de concept-diensten bovenaan in de <strong>Concept</strong>-weergave.
                Je kunt hier nog wijzigingen aanbrengen vóór publicatie.
              </p>

              <h3>Dienst bewerken</h3>
              <ol>
                <li>Klik op het <strong>potlood-icoon</strong> naast de dienst</li>
                <li>Pas naam, datum, start-/eindtijd of max. tapperaantal aan</li>
                <li>Klik <strong>Opslaan</strong></li>
              </ol>

              <h3>Tapper toevoegen of verwijderen</h3>
              <ol>
                <li>Klik op een dienst om de detailweergave te openen</li>
                <li>Klik <strong>+ Tapper toevoegen</strong> en kies een tapper uit de lijst</li>
                <li>Klik op het <strong>×</strong> naast een naam om de tapper te verwijderen uit de dienst</li>
              </ol>

              <h3>Dienst verwijderen</h3>
              <p>Klik op het prullenbak-icoon naast een dienst en bevestig de verwijdering.</p>
            </div>
          </div>

          <hr className="hd-divider" />

          {/* 6. Publiceren */}
          <div className="hd-section">
            <div className="hd-step-num">6</div>
            <div className="hd-step-body">
              <h2>Rooster publiceren</h2>
              <p>
                Als je tevreden bent met het concept, publiceer je het rooster.
                Alle concept-diensten in de geselecteerde periode worden in één keer gepubliceerd.
              </p>
              <ol>
                <li>Controleer de bezetting van elke dienst in de Concept-weergave</li>
                <li>Scroll naar de sectie <em>Rooster publiceren</em> en kies de periode</li>
                <li>Voeg optioneel een begeleidend bericht toe (verschijnt in de e-mail aan tappers)</li>
                <li>Klik <strong>Rooster publiceren</strong></li>
              </ol>
              <div className="hd-highlight">
                <p>
                  ✅ Na publicatie zijn de diensten zichtbaar voor alle tappers in het Rooster-overzicht.
                  Tappers ontvangen automatisch een e-mail. Diensten met open plekken kunnen door tappers geclaimd worden.
                </p>
              </div>

              <h3>Gepubliceerd rooster inzien</h3>
              <p>
                Via het sub-tabblad <strong>Gepubliceerd</strong> zie je per maand alle gepubliceerde diensten.
                Je kunt hier nog steeds diensten bewerken of tappers toevoegen/verwijderen.
              </p>
            </div>
          </div>

          <hr className="hd-divider" />

          {/* 7. Feestje */}
          <div className="hd-section">
            <div className="hd-step-num">7</div>
            <div className="hd-step-body">
              <h2>Feestje aanmaken</h2>
              <p>
                Ga naar <strong>Rooster</strong> → klik op het sub-tabblad <strong>Events</strong>.
                Hier maak je een feestje aan met meerdere diensten (bijv. tappers én kassamedewerkers).
              </p>
              <ol>
                <li>Vul de <strong>naam</strong> van het feestje in</li>
                <li>Kies de <strong>datum</strong></li>
                <li>
                  Voeg één of meer diensten toe via <strong>+ Dienst toevoegen</strong>:
                  <ul>
                    <li>Kies de rol: <strong>Tapper</strong> of <strong>Kassa</strong></li>
                    <li>Stel start- en eindtijd in</li>
                    <li>Kies het aantal benodigde mensen</li>
                  </ul>
                </li>
                <li>Klik <strong>Feestje aanmaken</strong></li>
              </ol>
              <p>
                Na het aanmaken kun je het feestje direct publiceren (tappers ontvangen een e-mail) of later publiceren via het <strong>Concept</strong>-sub-tabblad.
              </p>
            </div>
          </div>

          <hr className="hd-divider" />

          {/* 8. Berichten */}
          <div className="hd-section">
            <div className="hd-step-num">8</div>
            <div className="hd-step-body">
              <h2>Bericht sturen</h2>
              <p>
                Via het <strong>Berichten</strong>-tabblad stuur je een bericht naar alle tappers tegelijk.
                Handig voor aankondigingen, herinneringen of wijzigingen.
              </p>
              <ol>
                <li>Vul een <strong>onderwerp</strong> in</li>
                <li>Schrijf de <strong>berichttekst</strong></li>
                <li>Klik <strong>Versturen</strong></li>
              </ol>
              <p>
                Tappers ontvangen het bericht als e-mail en zien het ook bovenaan hun dashboard.
              </p>
            </div>
          </div>

          <hr className="hd-divider" />

          {/* 9. Uitnodiging */}
          <div className="hd-section">
            <div className="hd-step-num">9</div>
            <div className="hd-step-body">
              <h2>Nieuwe tapper uitnodigen</h2>
              <p>
                Ga naar het <strong>Uitnodiging</strong>-tabblad om een nieuwe tapper toe te voegen aan het systeem.
              </p>
              <ol>
                <li>Vul optioneel een <strong>e-mailadres</strong> in — de link wordt dan ook direct per e-mail verstuurd</li>
                <li>Klik <strong>🔗 Genereer uitnodigingslink</strong></li>
                <li>Kopieer de link via <strong>📋 Kopieer link</strong> en stuur deze naar de nieuwe tapper</li>
                <li>Of download de <strong>QR-code</strong> en deel die (bijv. op een bord of in een app)</li>
              </ol>
              <div className="hd-highlight">
                <p>
                  🔒 De uitnodigingslink is <strong>7 dagen geldig</strong> en kan maar <strong>één keer gebruikt</strong> worden.
                  Na registratie moet de nieuwe tapper zijn e-mailadres bevestigen via de verificatiemail.
                </p>
              </div>
            </div>
          </div>

          <hr className="hd-divider" />

          {/* 10. Tips */}
          <div className="hd-section">
            <div className="hd-step-num">10</div>
            <div className="hd-step-body">
              <h2>Handige tips</h2>
              <div className="hd-tip">
                <p>
                  🔄 <strong>Automatische herinneringen:</strong> Tappers ontvangen automatisch een herinnering
                  2 weken en 1 week voor hun dienst. Je hoeft hier niets voor te doen.
                </p>
              </div>
              <div className="hd-tip">
                <p>
                  📊 <strong>Ranglijst:</strong> De ranglijst wordt automatisch bijgehouden op basis van
                  het aantal gedraaide diensten en is ook zichtbaar voor tappers op hun accountpagina.
                </p>
              </div>
              <div className="hd-tip">
                <p>
                  🚫 <strong>Onbeschikbaarheid:</strong> Tappers kunnen in hun account aangeven welke maanden
                  zij niet beschikbaar zijn. Het systeem houdt hier rekening mee bij auto-inplannen.
                </p>
              </div>
              <div className="hd-highlight">
                <p>
                  💡 <strong>Aanbevolen werkwijze:</strong> Genereer concept → pas aan indien nodig →
                  publiceer → tappers bevestigen. Zo heb je altijd een goed gevulde tapavond.
                </p>
              </div>
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
  .hd-badge { display: inline-block; background: rgba(255,181,71,0.15); color: #ffb547; border: 1px solid #ffb547; border-radius: 20px; padding: 4px 14px; font-size: 12px; font-weight: 700; letter-spacing: 1px; margin-bottom: 14px; }
  .hd-badge-inline { display: inline-block; background: rgba(255,181,71,0.12); color: #ffb547; border: 1px solid rgba(255,181,71,0.4); border-radius: 20px; padding: 1px 8px; font-size: 11px; font-weight: 700; }
  .hd-content h1 { color: #f0eeff; font-size: 24px; font-weight: 700; margin-bottom: 10px; }
  .hd-lead { color: #8b80b0; font-size: 15px; line-height: 1.6; margin-bottom: 4px; }
  .hd-divider { border: none; border-top: 1px solid #2e2a4a; margin: 28px 0; }
  .hd-section { display: flex; gap: 20px; align-items: flex-start; }
  .hd-step-num { flex-shrink: 0; width: 36px; height: 36px; background: rgba(255,181,71,0.12); border: 1px solid #ffb547; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffb547; font-weight: 900; font-size: 16px; margin-top: 2px; }
  .hd-step-body { flex: 1; min-width: 0; }
  .hd-step-body h2 { color: #f0eeff; font-size: 17px; font-weight: 700; margin-bottom: 10px; }
  .hd-step-body h3 { color: #e8e0ff; font-size: 14px; font-weight: 700; margin: 14px 0 8px; }
  .hd-step-body p { color: #8b80b0; font-size: 15px; line-height: 1.65; margin-bottom: 12px; }
  .hd-step-body p:last-child { margin-bottom: 0; }
  .hd-step-body strong { color: #e8e0ff; }
  .hd-step-body em { color: #a89ec8; font-style: normal; }
  .hd-step-body ul, .hd-step-body ol { color: #8b80b0; font-size: 15px; line-height: 1.8; padding-left: 20px; margin-bottom: 12px; }
  .hd-step-body li { margin-bottom: 4px; }
  .hd-tab-overview { display: flex; flex-direction: column; gap: 8px; margin: 12px 0; }
  .hd-tab-item { display: flex; align-items: center; gap: 12px; background: #221f38; border: 1px solid #2e2a4a; border-radius: 10px; padding: 10px 14px; font-size: 14px; color: #8b80b0; }
  .hd-tab-item span:first-child { font-size: 18px; width: 24px; text-align: center; flex-shrink: 0; }
  .hd-mode-auto { display: inline-block; background: rgba(0,229,195,0.12); color: #00e5c3; border: 1px solid rgba(0,229,195,0.3); border-radius: 6px; padding: 2px 8px; font-size: 12px; font-weight: 700; }
  .hd-mode-open { display: inline-block; background: rgba(255,181,71,0.12); color: #ffb547; border: 1px solid rgba(255,181,71,0.3); border-radius: 6px; padding: 2px 8px; font-size: 12px; font-weight: 700; }
  .hd-highlight { background: rgba(0,229,195,0.07); border: 1px solid rgba(0,229,195,0.35); border-radius: 10px; padding: 14px 18px; margin: 12px 0; }
  .hd-highlight p { color: #b8f0e8 !important; margin: 0 !important; font-size: 14px !important; }
  .hd-tip { background: rgba(196,181,253,0.07); border: 1px solid rgba(196,181,253,0.3); border-radius: 10px; padding: 14px 18px; margin: 12px 0; }
  .hd-tip p { color: #c4b5fd !important; margin: 0 !important; font-size: 14px !important; }
  .hd-warning { background: rgba(255,79,109,0.08); border: 1px solid rgba(255,79,109,0.35); border-radius: 10px; padding: 14px 18px; margin: 12px 0; }
  .hd-warning p { color: #ff8fa3 !important; margin: 0 !important; font-size: 14px !important; }
  .hd-footer { background: #221f38; border: 1px solid #2e2a4a; border-top: none; border-radius: 0 0 16px 16px; padding: 20px 32px; text-align: center; }
  .hd-footer p { color: #8b80b0; font-size: 12px; }
  .hd-footer-link { color: #ffb547; text-decoration: none; }
  @media (max-width: 480px) {
    .hd-content { padding: 28px 20px; }
    .hd-content h1 { font-size: 20px; }
    .hd-section { flex-direction: column; gap: 12px; }
    .hd-step-num { margin-top: 0; }
  }
`;
