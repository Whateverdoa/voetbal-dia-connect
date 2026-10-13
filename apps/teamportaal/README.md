# DIA Teamportaal

Zelfstandige app op https://team.dialive.nl, gekoppeld aan de bestaande Clerk-identiteiten en Convex-gegevens van voetbal-dia-connect. Wedstrijdbediening blijft op https://dialive.online.

## Toegang

- Openbaar: team, programma, uitslagen, stand en goedgekeurde openbare verslagen. Zonder expliciete profieltoestemming worden neutrale schilden zonder spelers-ID of naam teruggegeven.
- Speler: eigen ontwikkeling via expliciete accountkoppeling.
- Ouder: alleen gekoppelde kinderen; een account aanmaken levert geen kindkoppeling op. Meerdere ouders en kinderen zijn mogelijk.
- Coach: bestaande DIA Live-teamtoewijzing; eigen concepten, expliciete publicatie naar het gezin en teamorganisatie.
- Teammanager: organisatie en ouderkoppelingen. Geen coachfeedback, behalve voor het eigen gekoppelde kind via ouderrechten.
- Clubbeheer: staf benoemen. Beheertoegang geeft geen automatische toegang tot ontwikkeling.

De server controleert iedere query en mutatie. Er is geen rolwisselaar of ontwikkelaarsuitzondering. Nieuwe koppelingen, feedback en taken worden gedeeld opgeslagen in Convex. Lokale demo-invoer, privébronverslagen, fictieve koppelingen en foto’s worden niet geïmporteerd. Er worden geen uitnodigingsmails verstuurd.

## Routes

`/` en `/team/jo13-2` openen het team. `/start` stuurt een gezin naar het gekoppelde kind of een kindkeuze. Coaches gaan naar `/team/jo13-2/coaching`, managers naar `/team/jo13-2/organisatie`. Profielen staan op `/team/jo13-2/speler/<playerId>`.

De coach koppelt onder **Teammanager → Toegang tot het team** het gecontroleerde ouderadres aan de kinderen. De ouder logt met hetzelfde adres in. Voor een afzonderlijke speler kan een Clerk-account-ID worden gebruikt; activering zonder e-mail/passkey blijft een afzonderlijke Clerk-inrichting en wordt hier niet gesimuleerd.

## Publicatie

Coachfeedback heeft een auteursgebonden concept en een afzonderlijke gepubliceerde momentopname. Bewerken verandert de eerdere publicatie niet. Intrekken maakt deze direct onzichtbaar. Deze feedback gaat nooit automatisch naar openbare wedstrijdverslagen.

De zeven openbare verslagruimten blijven op `/team/jo13-2/verslagen`. Er staat nog geen verslagtekst in. Voeg uitsluitend een expliciet goedgekeurde openbare versie toe aan `src/lib/match-reports.ts`; nooit conceptteksten of lokale coachverslagen. De openbare verslaglinks behouden hun bestaande URL.

Foto’s worden nog niet gerenderd. De nieuwe toestemmingskeuzes betreffen uitsluitend profiel en voornaam. Ratings blijven ontbrekend zolang er geen echte toegestane cijfers beschikbaar zijn.

Het compacte teamoverzicht schaalt ook statlabels mee met de schildbreedte (3.8cqw, zonder vaste ondergrens), zodat zes labels op smalle telefoons niet overlappen. Alle overige kaartankers blijven gelijk; de spelerspagina toont het grotere schild.

## Configuratie

Vercel heeft `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` en `NEXT_PUBLIC_CONVEX_URL` nodig. Gebruik de bestaande Clerk-instantie. Het `convex` JWT-template moet `email: {{user.primary_email_address}}` en `email_verified: {{user.email_verified}}` bevatten. Alleen daadwerkelijk geverifieerde e-mailclaims geven e-mailgebonden toegang. Clerk werkt momenteel met de bestaande ontwikkelinstantie; een productie-identiteitsmigratie moet beide apps en Convex gezamenlijk meenemen.

## Controle en release

In de repo: `npx vitest run convex/teamPortal.test.ts` en `npx tsc --noEmit`. In deze map: `npm run lint`, `npm run typecheck`, `npm run build`. Controleer altijd poort en eigenaar vóór een serverstart.

De backend volgt featurebranch → PR/CI → main. Publiceer daarna uitsluitend deze map naar project `dia-teamportaal` (`prj_DDUyGzXpxapZn29LvysSuoXCrTum`, scope `inheif`). Geen Convex-deploykey in dit frontendproject. Gebruik `--prod --skip-domain`, controleer de preview en promoveer dezelfde build. Laat Vercel Authentication op previewhostnamen aan. Upload nooit `.local`, de demo-app of echte spelersbestanden.
