# Urenlogger online zetten met inloggen

Wat je krijgt: een eigen webadres waar jij en je collega's inloggen. Iedereen ziet alleen zijn eigen uren, kosten en tarief. Je gegevens staan veilig in een database, dus je ziet ze op je laptop én telefoon.

Je hebt drie gratis accounts nodig: **GitHub** (heb je al), **Supabase** (database en inloggen) en een **host** voor de pagina (Vercel, zie de opmerking hieronder).

> **Let op bij Vercel:** het gratis *Hobby*-abonnement van Vercel is volgens hun voorwaarden alleen voor persoonlijk, niet-commercieel gebruik. Een urenlogger voor je werk als freelancer valt daar waarschijnlijk niet onder; dan heb je Vercel Pro nodig (betaald). Gratis alternatieven waar commercieel gebruik wel mag: **Netlify**, **Cloudflare Pages** of **GitHub Pages**. De app werkt op alle vier op dezelfde manier; stap 5 is steeds hetzelfde idee.

---

## Stap 1. Supabase-project maken

1. Ga naar **supabase.com** en log in (met GitHub kan het snelst).
2. Klik op **New project**. Geef het een naam (bijv. `urenlogger`), kies een sterk database-wachtwoord (bewaar het in je wachtwoordmanager; je hebt het zelden nodig) en kies als regio een **Europese** (bijv. Frankfurt).
3. Wacht tot het project klaar is (ongeveer een minuut).

## Stap 2. Database inrichten

1. Klik links op **SQL Editor** en dan op **New query**.
2. Open het bestand `supabase/schema.sql` uit deze map, kopieer alles en plak het in de editor.
3. Klik op **Run**. Je ziet "Success". Dit maakt de tabellen aan en zorgt dat iedereen alleen zijn eigen rijen kan zien.

## Stap 3. Collega's toevoegen en aanmelden dichtzetten

1. Ga naar **Authentication → Users**.
2. Voeg jezelf en je collega's toe via **Add user**. Twee manieren:
   - **Create new user**: je vult e-mail en een wachtwoord in (vink aan dat het account meteen bevestigd is, zoals *Auto Confirm User*). Je geeft het wachtwoord zelf door; je collega kan het later wijzigen via "Wachtwoord vergeten?".
   - **Invite user**: je collega krijgt een e-mail met een link en kiest daarna zelf een wachtwoord op de website. (Dit werkt pas goed na stap 4.)
3. Zet daarna aanmelden voor vreemden uit: zoek bij **Authentication** (onder *Sign In / Providers* of *Sign In / Up*, afhankelijk van de versie van het dashboard) de instelling **Allow new users to sign up** en zet die **uit**. Dan kan niemand zich zelf registreren; alleen mensen die jij toevoegt, kunnen inloggen.

## Stap 4. Sleutels in de app zetten

1. Ga in Supabase naar **Project Settings → API** (of *API Keys*).
2. Kopieer de **Project URL** (begint met `https://` en eindigt op `.supabase.co`) en de **anon / publishable** sleutel.
3. Open in je GitHub-repo het bestand `config.js`, klik op het potloodje en vul beide in:
   ```js
   window.URENLOGGER_CONFIG = {
     supabaseUrl: "https://JOUWPROJECT.supabase.co",
     supabaseKey: "de-anon-of-publishable-sleutel"
   };
   ```
   Commit de wijziging.
4. **Belangrijk:** gebruik nooit de `service_role`- of *secret*-sleutel. De anon/publishable sleutel is bedoeld om openbaar te staan; de beveiliging zit in de database (stap 2).

## Stap 5. De pagina online zetten

### Vercel
1. Ga naar **vercel.com** en log in met GitHub.
2. Klik **Add New… → Project** en kies je repo `urenlogger`.
3. Bij *Framework Preset* kies je **Other**. Laat *Build Command* en *Output Directory* leeg.
4. Klik **Deploy**. Je krijgt een adres zoals `urenlogger-xxxx.vercel.app`. Bij elke wijziging in GitHub wordt de site vanzelf bijgewerkt.

### Netlify / Cloudflare Pages / GitHub Pages
Koppel je repo `urenlogger`, geen build-opdracht, de hoofdmap als publicatiemap. Daarna hetzelfde adres-principe.

## Stap 6. Het webadres bij Supabase bekendmaken

Dit is nodig voor de uitnodigings- en wachtwoord-vergeten-mails:

1. Ga in Supabase naar **Authentication → URL Configuration**.
2. Zet bij **Site URL** je adres (bijv. `https://urenlogger-xxxx.vercel.app`).
3. Voeg hetzelfde adres toe bij **Redirect URLs**.

## Stap 7. Proberen

1. Open je adres. Je ziet het inlogscherm.
2. Log in. De eerste keer vraagt de app om je **uurtarief** en **btw-percentage**. Dat is per persoon, dus je collega vult zijn eigen tarief in.
3. Had je op dit apparaat al uren bijgehouden zonder inloggen? Dan biedt de app eenmalig aan die te **importeren** in je account.
4. Log in op je telefoon en zet de pagina op je beginscherm (*Deel → Zet op beginscherm* of *Menu → App installeren*).

---

## Goed om te weten

- **Gratis Supabase-projecten kunnen op pauze gaan** als ze een tijd niet gebruikt worden; je zet ze dan met één klik weer aan in het dashboard. Controleer de actuele regels op supabase.com.
- **E-mails** (uitnodiging, wachtwoord vergeten) worden in de gratis laag beperkt verstuurd (een paar per uur). Voor een kleine groep is dat genoeg.
- **Back-ups:** maak af en toe een back-up via *Export & back-up → Back-up (JSON)*.
- **Wachtwoord kwijt?** Op het inlogscherm: *Wachtwoord vergeten?* (vul eerst je e-mailadres in).
- **Offline:** zonder internet kun je niet inloggen of opslaan. Als opslaan mislukt, toont de app "Niet opgeslagen" en probeert hij het zelf opnieuw. Sluit het tabblad dan niet.
- **Zonder inloggen blijven gebruiken?** Laat `config.js` leeg: dan werkt de app zoals voorheen, alleen in je eigen browser.
