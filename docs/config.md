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

- Convex-team: `mike-ten-hoonte` (confirmed owner account signed in through the
  `Whateverdoa` GitHub account)
- Convex-project: `jeugdvoetbal-apple-dev`
- Lokaal configuratiebestand: `.env.local` (door Git genegeerd)
- Targetcontrole: `npm run verify:new-app-target`
- Bewaakte Clerk-koppeling: `npm run configure:clerk-dev`
- Zelfstandige synthetische M1/M2-seed: `npm run seed:new-app`

Voor een cloud development deployment moeten `.env.local` of de CI-secretset
ook exact bevatten:

- `JEUGDVOETBAL_CONVEX_TEAM=mike-ten-hoonte`
- `JEUGDVOETBAL_CONVEX_PROJECT=jeugdvoetbal-apple-dev`

De targetcontrole vereist exact het bevestigde team en project en weigert onder
andere het oude project, productie-deployments en een lokale Sportlink client ID.
De nieuwe-app-seed maakt uitsluitend een minimale developmentclub, testteam,
lokale scheidsrechters en M1/M2-workflowrecords. Hij importeert geen spelers,
coachcontacten, Sportlinkdata of records uit de bestaande `seed:init`.

Configureer Clerk pas nadat in het Clerk Dashboard een aparte development-app
is aangemaakt, Native API is ingeschakeld en de Apple bundle is geregistreerd.
De configurator accepteert uitsluitend een `pk_test_` publishable key en leidt
het bijbehorende issuer-domein uit die sleutel af. Een optioneel meegegeven
`CLERK_JWT_ISSUER_DOMAIN` wordt als kruiscontrole gebruikt en bij afwijking
geweigerd.
Daarna draait hij de targetcontrole en schrijft hij alleen
`CLERK_JWT_ISSUER_DOMAIN` naar `brainy-buffalo-707`:

```bash
JEUGDVOETBAL_CLERK_PUBLISHABLE_KEY='pk_test_...' \
npm run configure:clerk-dev
```

De publishable key is clientconfiguratie en wordt door dit script niet naar Git
of Convex geschreven. Een Clerk secret key is voor deze stap niet nodig.

## APNs voor de Apple development-app

Gebruik uitsluitend een sandbox APNs-sleutel die toegang heeft tot App ID
`com.jeugdvoetbal.app`. Bewaar het gedownloade `.p8`-bestand buiten Git. De
configurator accepteert alleen Apple key/team-ID's van tien hoofdletters of
cijfers, de exacte bundle-ID, `sandbox`, en een parseerbare P-256 privésleutel.
Hij controleert eerst opnieuw het geïsoleerde Convex-doel en schrijft de waarden
via stdin, zodat de privésleutel niet in shell-argumenten of succeslogs staat:

```bash
APNS_KEY_ID='ABCDEFGHIJ' \
APNS_TEAM_ID='KLMNOPQRST' \
APNS_PRIVATE_KEY_FILE='/absolute/path/AuthKey_ABCDEFGHIJ.p8' \
APNS_BUNDLE_ID='com.jeugdvoetbal.app' \
APNS_ENVIRONMENT='sandbox' \
npm run configure:apns-dev
```

Gebruik `APNS_PRIVATE_KEY` alleen in een secret-enabled CI-omgeving. Geef nooit
tegelijk `APNS_PRIVATE_KEY` en `APNS_PRIVATE_KEY_FILE` mee. De configurator leest
alle vijf waarden na het schrijven terug en meldt alleen welke variabelen zijn
geverifieerd, nooit hun inhoud.

## Afzonderlijke web- en mobile-API deployment

Het ontwikkelproject voor de Apple-app gebruikt dezelfde Next.js-code, maar een
eigen Vercel-project of vergelijkbare deployment. Configureer daar:

- `JEUGDVOETBAL_APPLE_ENVIRONMENT=development`
- `JEUGDVOETBAL_CONVEX_TEAM=mike-ten-hoonte`
- `JEUGDVOETBAL_CONVEX_PROJECT=jeugdvoetbal-apple-dev`
- `NEXT_PUBLIC_CONVEX_URL=https://brainy-buffalo-707.eu-west-1.convex.cloud`
- `NEXT_PUBLIC_CONVEX_SITE_URL=https://brainy-buffalo-707.eu-west-1.convex.site`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...`
- `CLERK_SECRET_KEY=sk_test_...`

De publishable key mag in de clientbuild staan. De secret key wordt alleen in
de server-side deploymentsecretstore gezet en niet in chat, Git, Xcode of
Convex. Zet voor deze ontwikkeldeployment geen `CONVEX_DEPLOY_KEY` en geen
`SPORTLINK_CLIENT_ID`; schema/functions worden uitsluitend via de lokaal
bewaakte Convex-workflow gepusht en Sportlink blijft eigendom van de bestaande
live importer.

De build valideert deze scheiding automatisch zodra
`JEUGDVOETBAL_APPLE_ENVIRONMENT` aanwezig is. Handmatige preflight:

```bash
npm run verify:new-app-web-target
```

Na deployment controleert een tokenloze probe dat de publieke mobile adapter
bereikbaar is en niet naar een loginpagina of gecachete foutrespons omleidt:

```bash
JEUGDVOETBAL_API_BASE_URL='https://mobile-dev.your-domain.nl/v1/mobile' \
npm run verify:mobile-api-deployment
```

Een geldige preflight geeft voor `POST /auth/session` exact de
versie-onafhankelijke `401 UNAUTHENTICATED`-envelope terug, met
`cache-control: no-store` en dezelfde `x-request-id`. De probe gebruikt geen
Clerk-token en muteert geen data.

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
