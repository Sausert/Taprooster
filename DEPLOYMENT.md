# 🍺 WALHALLA TAPROOSTER — Deploymentgids
## Van nul naar live in ~30 minuten

---

## Wat je nodig hebt
- Een computer met [Node.js 18+](https://nodejs.org) geïnstalleerd
- Een gratis account op [GitHub](https://github.com), [Supabase](https://supabase.com) en [Vercel](https://vercel.com)
- Een gratis account op [Resend](https://resend.com) (voor e-mails)

---

## STAP 1 — Project instellen (5 min)

```bash
# 1. Pak de projectmap
cd walhalla-taprooster

# 2. Installeer alle packages
npm install

# 3. Maak je .env.local bestand
cp .env.example .env.local
```

Open `.env.local` in een teksteditor. Je vult dit zo dadelijk in.

---

## STAP 2 — Supabase instellen (10 min)

1. Ga naar **[supabase.com](https://supabase.com)** → "Start your project" → log in met GitHub
2. Klik **"New project"**
   - Name: `walhalla-taprooster`
   - Database Password: kies een sterk wachtwoord (bewaar dit!)
   - Region: `West EU (Ireland)`
3. Wacht tot het project aangemaakt is (~1 min)

### Database schema uitvoeren
4. Ga naar **SQL Editor** (linkermenu)
5. Klik **"New query"**
6. Open het bestand `supabase/migrations/001_initial_schema.sql`
7. Kopieer de volledige inhoud en plak in de SQL Editor
8. Klik **"Run"** — je ziet "Success"

### API keys kopiëren
9. Ga naar **Project Settings → API**
10. Kopieer:
    - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
    - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

Plak deze in je `.env.local` bestand.

### Auth instellen
11. Ga naar **Authentication → Providers**
12. Zorg dat **Email** provider ingeschakeld is
13. Ga naar **Authentication → Email Templates** en pas de templates aan naar wens

---

## STAP 3 — Resend instellen (5 min)

1. Ga naar **[resend.com](https://resend.com)** → maak gratis account aan
2. Ga naar **API Keys** → "Create API Key"
   - Name: `walhalla-taprooster`
   - Permission: "Full access"
3. Kopieer de key → `RESEND_API_KEY` in `.env.local`
4. Ga naar **Domains** → voeg je domein toe (bijv. `ojcwalhalla.nl`)
   - Voeg de DNS records toe die Resend aangeeft
   - Of gebruik tijdelijk `onboarding@resend.dev` als from-adres

---

## STAP 4 — Lokaal testen (5 min)

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**

### Eerste admin aanmaken
1. Ga naar `/register` — je ziet "Geen uitnodigingslink"
2. Ga naar Supabase → **Authentication → Users** → "Add user"
   - Vul je e-mail en wachtwoord in
3. Ga naar **SQL Editor** en run:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'jouw@email.nl';
   ```
4. Log in op `http://localhost:3000/login`

---

## STAP 5 — Live zetten op Vercel (10 min)

### GitHub repository aanmaken
```bash
git init
git add .
git commit -m "Initial commit: Walhalla Taprooster"
git branch -M main
git remote add origin https://github.com/JOUW-USERNAME/walhalla-taprooster.git
git push -u origin main
```

### Vercel deployment
1. Ga naar **[vercel.com](https://vercel.com)** → log in met GitHub
2. Klik **"Add New Project"**
3. Selecteer je `walhalla-taprooster` repository
4. **Framework Preset**: Next.js (wordt automatisch herkend)
5. Klik op **"Environment Variables"** en voeg toe:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | jouw Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | jouw anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | jouw service role key |
| `RESEND_API_KEY` | jouw Resend key |
| `RESEND_FROM_EMAIL` | `taprooster@ojcwalhalla.nl` |
| `NEXT_PUBLIC_APP_URL` | `https://taprooster.ojcwalhalla.nl` |

6. Klik **"Deploy"** — duurt ~2 minuten

### Custom domein instellen (optioneel)
7. Ga in Vercel naar **Settings → Domains**
8. Voeg toe: `taprooster.ojcwalhalla.nl`
9. Voeg het CNAME record toe bij je DNS provider:
   ```
   taprooster.ojcwalhalla.nl → cname.vercel-dns.com
   ```

---

## STAP 6 — Supabase production URL bijwerken

1. Ga naar Supabase → **Authentication → URL Configuration**
2. Voeg toe aan **Redirect URLs**:
   ```
   https://taprooster.ojcwalhalla.nl/**
   ```

---

## 🚀 Je app is live!

Deel de link met je eerste admin: `https://taprooster.ojcwalhalla.nl`

### Eerste stappen als admin:
1. Log in → ga naar **Account → Admin Dashboard**
2. Ga naar **Uitnodiging** → genereer een QR code voor een poster of app
3. Nodig de eerste tappers uit via de uitnodigingslink
4. Maak diensten aan via de API of voeg ze direct in Supabase in
5. Genereer het conceptrooster → pas aan → publiceer!

---

## 📧 Reminder e-mails automatiseren

Stel een Supabase Edge Function in voor automatische herinneringen:

1. Ga naar Supabase → **Edge Functions** → "New Function"
2. Naam: `send-reminders`
3. Plak de volgende code:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const today = new Date();
  const in2weeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const in1week = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Diensten over precies 14 dagen
  const target2w = in2weeks.toISOString().split("T")[0];
  const target1w = in1week.toISOString().split("T")[0];

  for (const targetDate of [target2w, target1w]) {
    const weeksAhead = targetDate === target2w ? 2 : 1;

    const { data: shifts } = await supabase
      .from("shifts")
      .select("*, assignments:shift_assignments(user_id, profile:profiles(email, full_name))")
      .eq("date", targetDate)
      .eq("status", "published");

    for (const shift of shifts || []) {
      for (const a of shift.assignments || []) {
        if (a.status === "declined") continue;

        // Stuur in-app notificatie
        await supabase.from("notifications").insert({
          user_id: a.user_id,
          type: `reminder_${weeksAhead}weeks`,
          title: `⏰ Reminder: dienst over ${weeksAhead} week${weeksAhead > 1 ? "en" : ""}`,
          message: `${shift.title} — ${targetDate} ${shift.start_time}–${shift.end_time}`,
          shift_id: shift.id,
        });

        // E-mail via Resend (voeg RESEND_API_KEY toe als secret)
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "taprooster@ojcwalhalla.nl",
            to: a.profile.email,
            subject: `⏰ Reminder: jouw dienst over ${weeksAhead} week${weeksAhead > 1 ? "en" : ""}`,
            html: `<p>Hey ${a.profile.full_name}, vergeet je dienst niet: <strong>${shift.title}</strong> op ${targetDate}.</p>`,
          }),
        });
      }
    }
  }

  return new Response("Reminders sent!", { status: 200 });
});
```

4. Deploy de functie
5. Ga naar **Database → Cron Jobs** → "New Cron Job":
   - Schedule: `0 9 * * *` (elke dag om 09:00)
   - Function: `send-reminders`

---

## 💰 Kosten overzicht

| Service | Gratis tier | Wanneer betalen? |
|---------|------------|-----------------|
| **Vercel** | 100GB bandwidth/maand | Nooit voor 20-40 users |
| **Supabase** | 500MB database, 2GB storage | Nooit voor 20-40 users |
| **Resend** | 3.000 e-mails/maand | Bij meer dan 3k mails |

**Totaal: €0/maand** voor de hele groep tappers 🎉

---

## 🆘 Veelgestelde vragen

**Q: Hoe voeg ik een nieuwe admin toe?**
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'nieuw@email.nl';
```

**Q: Hoe reset ik een wachtwoord van een tapper?**
- Ga naar Supabase → Authentication → Users → zoek de user → "Send password recovery"

**Q: De app is traag na lang niet gebruikt.**
- Dit is normaal bij Vercel free tier (cold start). Upgrade naar Vercel Hobby ($0) lost dit op.

**Q: Hoe maak ik een back-up van de database?**
- Supabase → Settings → Database → "Download backup"
