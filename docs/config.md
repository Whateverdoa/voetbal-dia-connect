# Configuratievariabelen

## Rollen (Clerk)

- **`CLERK_BOOTSTRAP_ADMIN_EMAILS`**  
  Komma-gescheiden e-mailadressen. Gebruikers met dit e-mailadres krijgen bij het eerste bezoek aan de rol-onboarding automatisch de rollen admin, coach en scheidsrechter (zonder rolkeuze-knoppen).  
  Zie `docs/roles.md` voor het volledige rollenmodel.

Voor de nieuwe app is Clerk alleen de identity provider. Autorisatie komt uit
`clubMemberships` in Convex met de club-scoped rollen `club_admin`, `planner`,
`coach` en `referee`. Client-supplied metadata verleent geen toegang tot M1
queries of mutations.

## Nieuwe Apple-app deployment

- Convex-team: `Whateverdoa`
- Convex-project: `jeugdvoetbal-apple-dev`
- Lokaal configuratiebestand: `.env.local` (door Git genegeerd)
- Targetcontrole: `npm run verify:new-app-target`
- M1 seed na de bestaande seed: `npm run seed:new-app`

Voor een cloud development deployment moeten `.env.local` of de CI-secretset
ook exact bevatten:

- `JEUGDVOETBAL_CONVEX_TEAM=Whateverdoa`
- `JEUGDVOETBAL_CONVEX_PROJECT=jeugdvoetbal-apple-dev`

De targetcontrole weigert onder andere het oude project, een persoonlijke
teamnaam, productie-deployments en een lokale Sportlink client ID.

## Sportlink

De importcode voor programma, uitslagen en rosters gebruikt de client ID vanuit
de server-side Convex-omgeving. De club beschikt over een client ID; de waarde
hoort niet in Git of in een clientapp.

- `SPORTLINK_CLIENT_ID`  
  Vereist voor Sportlink Club.Dataservice toegang.
- `SPORTLINK_BASE_URL`  
  Optioneel. Default: `https://data.sportlink.com`.
- `SPORTLINK_REFRESH_MINUTES`  
  Optioneel. Default: `5`.

## Opmerkingen

- Geen secrets committen naar Git.
- Zet `SPORTLINK_CLIENT_ID` alleen in de bedoelde Convex deployment via het
  dashboard of een gecontroleerde secretworkflow.
- Gebruik nooit een `NEXT_PUBLIC_*` variabele voor de client ID.
- Zonder `SPORTLINK_CLIENT_ID` blijft de app op de interne dataflow werken.
- Development voor de nieuwe Apple-app gebruikt seed- of snapshotdata.
- De bestaande live deployment blijft tijdens ontwikkeling de enige geplande
  Sportlink-importeur.
- Gebruik voor staging bij voorkeur een aparte test-client-ID. Als alleen de live
  client ID beschikbaar is, configureer die niet permanent in een tweede poller.
- Per club mag slechts een productieomgeving eigenaar zijn van geplande imports.
