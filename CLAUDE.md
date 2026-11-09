# Urenlogger: context voor Claude Code

Dit bestand is bedoeld voor een (lokale) Claude Code-sessie die dit project overneemt van de cloudsessie waarin het is gebouwd. Lees het eerst volledig.

## Wat dit is
Een simpele webapp voor Wouter (freelancer bij de Rechtspraak, uurtarief **€65 ex btw**) om uren te loggen, in- en uit te checken, extra kosten toe te voegen en live te zien wat hij verdient. Later ook voor collega's, met inloggen. De UI is Nederlands, kort en direct. Wouter wil beknopte antwoorden en weinig ruis.

- Eén bestand: `index.html` (vanilla JS, geen build, geen framework). Verder `sw.js` (offline), `manifest.webmanifest` (installeerbaar op telefoon), `config.js` (Supabase-gegevens), `supabase/schema.sql`, `INSTELLEN.md` (stappenplan voor Wouter), `assets/`.
- De map `urenlogger/` staat in de private repo `woutermur/WouterMur` (branch `claude/awesome-cray-1v7yw2`) naast een niet-gerelateerde Annika-site. De **gehoste** versie staat in een aparte publieke repo `wouter-sus/urenlogger` (ander GitHub-account); Wouter uploadt daar de inhoud van een zip via de GitHub-webinterface. Maak die zip van de map `urenlogger/` **zonder** `dev/` en `CLAUDE.md`.

## Huisstijl (Squared Media): niet afwijken
Bron: https://claude.ai/artifact/4ptEeWv1kUotrmkpNk6dk7 (design system, alleen leesbaar via de Artifact-tool).
- Kleuren: sage-100 `#DCE0CD` (achtergrond, met vierkantjesraster van 54px op 6% inkt), sage-300 `#B8C1A6`, ink `#182013`, ink-soft `#4A5446`, orange `#D34C1F`, concrete `#BAB3A9`, charcoal `#2E3339`. Geen andere kleuren.
- Oranje alleen op grote tekst (24px+) of als vlak; nooit voor kleine tekst (contrast 3,2:1).
- Lettertypes: Schibsted Grotesk (koppen 800, strakke spatiëring), DM Mono 500 hoofdletters +0.1em voor labels. Radius 6px (klein) en 28px (groot).
- Mascotte en logo: alleen de echte renders in `assets/` (`mascot-wave.png`, `logo-squared.png`). Nooit nateken of kleuren aanpassen. Geen emoji's in de UI.

## Functies (allemaal getest)
- In- en uitchecken met live timer en live bedrag (`€`-teken oranje). Optioneel een omschrijving.
- Twee tijdvelden **Begintijd** en **Eindtijd**: leeg = nu; een tijd van vandaag = achteraf in- of uitchecken. Begintijd aanpassen terwijl de timer loopt. Alleen vandaag, niet in de toekomst, eind na begin.
- Maandoverzicht met bladeren: verdiend (live), uren, extra kosten, totaal ex btw, en bedrag incl. btw.
- Uren handmatig toevoegen en extra kosten (ex btw). Alleen verwijderen, nog niet bewerken.
- **CSV-export in factuurindeling**: kolommen `Datum;Omschrijving;Aantal;Prijs ex btw;Btw %;Totaal ex btw`; één regel per dag voor uren, **per dag naar boven afgerond op halve uren**; één regel per kostenpost (aantal 1). Decimale komma, puntkomma, BOM. De app zelf (live bedrag, maandtotaal) rekent met echte minuten, dus kan iets lager uitkomen dan de factuur. Moneybird: Wouter koos bewust voor CSV; geen API-koppeling.
- Mascotte zegt elke dag iets anders (36 regels in `SAYINGS`: grapjes, sterkte, algemeen), wisselt om middernacht.
- **Feest bij ronde bedragen** (op verdiend bedrag deze kalendermaand, alleen uren, niet kosten): elke €50 klein, €100 medium, €250/500/750 groot, elke €1000 mega. Canvas-confetti in huisstijlkleuren, banner, springende mascotte, trillen. Hoogste behaalde niveau per maand staat in `S.celebrated[YYYY-MM]`; geen feest voor oud werk bij eerste keer, en stil bijgewerkt bij verwijderen, tariefwijziging of back-up terugzetten. Preview-knoppen staan onder "Export & back-up".
- Tarief en btw instelbaar (prompt-dialogen, bewust simpel).
- Back-up (JSON) en terugzetten.

## Architectuur in het kort
- `S` = state (`rate, btw, entries[{id,start,end,note}], costs[{id,date,desc,amount}], active{start,note}|null, celebrated{}`). Elke wijziging roept `save()` aan, daarna `render()`. `tick()` draait elke 250 ms voor live getallen, bubble en mijlpaalcontrole.
- Twee modi, bepaald door `config.js` (`window.URENLOGGER_CONFIG`):
  - **Lokaal** (config leeg, de standaard): alles in `localStorage` onder `urenlogger.v1`.
  - **Cloud** (`CLOUD === true`): inlogscherm (e-mail en wachtwoord; uitnodiging en wachtwoord-vergeten via link), data in Supabase. `save()` plant een debounced `push()` die de staat vergelijkt met een snapshot van de server (`remote`) en alleen verschillen upsert/delete. `pullAll()` haalt alles op (met paginering), ook bij terugkeer naar het tabblad. Mislukte opslag: melding en automatisch opnieuw na 8 s. `supabase-js` wordt dynamisch geladen (vaste versie 2.45.4 van jsDelivr). Eenmalig aanbod om lokale uren te importeren.
- Database (`supabase/schema.sql`): `user_settings`, `entries`, `costs`, elk met `user_id` en **row level security**: iedereen ziet en wijzigt alleen eigen rijen; `anon` krijgt niets. De anon/publishable sleutel in `config.js` mag openbaar zijn; **vraag of gebruik nooit de service_role/secret-sleutel**.
- Valkuil die al eens gebeurde: `[hidden]` werd overschreven door `display:grid`; daarom staat er `[hidden]{display:none!important}`.

## Tests (`dev/tests/`)
Vereist Node en Playwright (`npm i -D playwright` + `npx playwright install chromium`), geen test-framework.
- `node dev/tests/v.js` (tijdvelden), `f.js` (feest), `d.js` (dagelijkse regel), `o.js` (uitchecken achteraf): lokale modus, openen `index.html` via `file://`.
- `cloud.js`: de hele cloudflow (26 controles) tegen een **nagebootste Supabase** (in-memory, met dezelfde eigen-rijen-regel). Draai eerst `python3 -m http.server 8766` in de map `urenlogger/`. Dit is géén test tegen echt Supabase.
- `bash dev/tests/pgtest.sh`: test `schema.sql` en de beveiliging tegen een lokale Postgres (stub voor `auth.uid()`); vereist Postgres 16 onder `/usr/lib/postgresql/16`.
Tests schrijven screenshots naar de tijdelijke map van het systeem.

## Stand van zaken (9 november 2026) en wat nog moet
Gedaan: app compleet; Wouter heeft een (toen nog lege) publieke repo `wouter-sus/urenlogger` aangemaakt voor de hosting, of de bestanden daar inmiddels staan en of Pages/Vercel aan staat is niet bevestigd; Supabase-project `urenlogger` is aangemaakt (organisatie "Squared Media", gratis, regio Frankfurt) en `schema.sql` is uitgevoerd (Wouter bevestigde "gelukt").

Nog te doen, in volgorde (zie `INSTELLEN.md`):
1. **Stap 3, door Wouter zelf in het Supabase-dashboard:** Authentication → Users → Add user → Create new user (e-mail, wachtwoord, "Auto Confirm User"); eerst alleen zichzelf, later collega's. Daarna "Allow new users to sign up" uitzetten. Claude heeft geen toegang tot zijn Supabase-account.
2. **Stap 4:** Wouter plakt de Project URL en de anon/publishable sleutel in de chat (geen geheimen; nooit de service_role/secret-sleutel); Claude zet ze in `config.js` en controleert. Tot dan staat de app bewust op lokale modus.
3. **Hosting kiezen.** Wouter vroeg om Vercel, maar het gratis Hobby-plan is volgens Vercel alleen voor persoonlijk, niet-commercieel gebruik; een werktool voor een freelancer valt daar waarschijnlijk niet onder (Pro is betaald). Netlify, Cloudflare Pages en GitHub Pages zijn gratis en commercieel toegestaan. Deze keuze is nog open.
4. **Stap 6:** het uiteindelijke webadres bij Supabase zetten onder Authentication → URL Configuration (Site URL en Redirect URLs), anders werken uitnodigings- en wachtwoord-vergeten-mails niet.
5. Echte test met het echte Supabase-project: inloggen, eerste-keer-tarief, opslaan, tweede apparaat, uitnodiging.

Ideeën (niet gevraagd, alleen noemen als relevant): regels bewerken, nettere dialogen voor tarief, wachtwoord wijzigen binnen de app, offline-wachtrij voor opslaan.
