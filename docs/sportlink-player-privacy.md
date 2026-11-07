# Sportlink spelersprivacy

Deze wijziging hoort bij de bestaande webapp `voetbal-dia-connect` in Vercel-team
Inheif. De releasewerkboom is gebaseerd op `ebb8f4e` van `main`, niet op de
oudere Apple-ontwikkelbranch. Dit document beschrijft de implementatie en
releasecontrole; het verleent geen toestemming voor publicatie.

## Publicatieregel

Een openbare spelersidentiteit vereist gelijktijdig:

1. Een expliciete koppeling tussen de lokale speler en een stabiele Sportlink
   `lidcode`. Bestaande spelers worden nooit alleen op naam vrijgegeven.
2. Een geslaagde, recente controle van het publieke Sportlink-artikel
   `/entity/team-indeling` voor het gekoppelde team.
3. Lokale toestemming `public_display`. Foto en gamificatie hebben aanvullend
   hun eigen toestemming nodig. Het teamportaal vereist daarnaast zijn eigen
   `publicProfile`-toestemming.

Het publieke Sportlink-artikel filtert de bronvelden zelf. De API geeft volgens
het gedocumenteerde contract geen verplicht expliciet zichtbaarheidslabel mee.
Daarom slaat de app de daadwerkelijk toegestane naam en foto op, met lidcode,
team, teamcode en een verversingsgeneratie. Zij verzint geen label op basis van
het bestaan van een naam. Een ontbrekende foto geeft nooit toestemming om een
lokale upload te publiceren. Afgeschermde namen worden niet opnieuw opgebouwd
uit andere naamvelden. Publieke weergave blijft beperkt tot de voornaam.

Afgeschermde, verdwenen, onbekende, dubbele of niet gekoppelde personen worden
uit openbare spelerslijsten verwijderd. Bij gebeurtenissen verdwijnen hun
speler-ID, naam en eventuele gerelateerde identiteit. Vrije notities,
handmatig geregistreerde namen/nummers en technische commandometadata worden
niet openbaar teruggegeven. Presentaties geven geen blessure- of
 afwezigheidsstatus terug. Teamresultaten en de stand blijven beschikbaar.

Dezelfde regel wordt gebruikt voor livewedstrijden, historie, topscorers,
spelersstatistieken, teamkaarten, presentatiekaarten, losse foto-opvragen en
openbare portaalprofielen. Bevoegde coaches en gekoppelde ouders behouden hun
bestaande taakgebonden, besloten toegang. Een coach van een ander team krijgt
geen privéwisselplan via de presentatiequery.

## Verversing en intrekking

De cron controleert maximaal 64 gekoppelde DIA-teams elke 15 minuten, met maximaal
vier gelijktijdige verzoeken en een verzoektimeout van 15 seconden. De bron is
uitsluitend `https://data.sportlink.com`; een alternatieve geprivilegieerde feed
wordt geweigerd. Een verversing maakt de vorige generatie eerst ongeldig.
Bij een fout, onverwacht antwoord of mislukte koppeling blijft die afgeschermd.
Een oudere gelijktijdige verversing kan een nieuwere beperking niet overschrijven.

Een broncontrole blijft maximaal 30 minuten geldig, gerekend vanaf het begin
van het verzoek. Een geplande interne mutatie maakt de generatie ongeldig en
invalideert daarmee ook reactieve Convex-queryresultaten. Alleen `Date.now()`
controleren zou bestaande abonnementen niet vanzelf verversen. Bij een gezonde
cron wordt een wijziging in Sportlink bij de volgende controle verwerkt;
dit is geen directe pushkoppeling. Een lokale toestemmingsintrekking of
ontkoppeling werkt meteen door via de gewijzigde documenten.

Oude generaties en ontbrekende bronvelden geven nooit publicatierecht.
Bestaande records blijven geldig: alle schemavelden zijn optioneel toegevoegd
en bestaande indexdefinities blijven behouden. Er worden geen wedstrijden,
gebeurtenissen of auditrecords verwijderd. De privacyverversing wijzigt alleen
privacyvelden van teams en spelers, geen selecties of uitslagen.

## Inschakelen op de juiste omgeving

1. Controleer de exacte live Convex-deployment achter het bestaande Inheif-project
   `prj_9UeK9CfSPcMNQ2HXNaCXvXAjpaeZ`. De lokaal gekoppelde Apple-devomgeving is
   geen geschikte vervanging. De laatste gevonden Vercel-release is via de CLI
   gemaakt; de Git-commit van die release is niet door de projectmetadata bewezen.
2. Leg de huidige backendrelease, schema/indexen en recordaantallen vast.
   Vergelijk ook inhoud waar nodig; gelijke aantallen bewijzen geen gelijke data.
3. Deploy eerst de afscherming. Zonder nieuwe broncontrole blijven bestaande
   spelers standaard openbaar afgeschermd. Zet de oude ruime weergave niet terug
   als rollback; herstel de functie met behoud van de afscherming.
4. Stel uitsluitend op de deployment die de bestaande Sportlink-import beheert
   `SPORTLINK_PRIVACY_SYNC_ENABLED=true` in. Gebruik de bestaande server-side
   `SPORTLINK_CLIENT_ID`. Zet deze vlag niet op een tweede permanente importer.
   `DISABLE_EXTERNAL_IMPORTS=true` en de bekende geïsoleerde Apple-dev-URL
   blokkeren externe privacyverversing altijd.
5. Controleer lidcodes via de bevoegde Sportlink-administratie. Beheer > Spelers
   biedt koppelen, ontkoppelen en broncontrole. Koppelen geeft op zichzelf geen
   toestemming. Ontkoppel bij twijfel en controleer opnieuw. Ontbreekt een
   bruikbare stabiele lidcode in de bron, dan blijft de speler afgeschermd.
6. Controleer lokale publicatietoestemming en aanvullende foto/gamificatiekeuzes.
   Starten van een ronde of koppelen mag geen toestemming automatisch verlenen.
7. Verifieer met fictieve spelers alle bronkeuzes, intrekking, bronfouten en
   directe API-aanroepen, ook voor oude wedstrijden. Herhaal de nacontrole op
   bestaande indexen en records. Activeer HDSJQE niet als onderdeel van deze fix.
8. Controleer de echte bronstructuur en het ondertekende releasebewijs voordat
   gebruik met echte spelers wordt vrijgegeven. De lokale tests simuleren de
   bron; zij bewijzen niet dat de live bronconfiguratie al is goedgekeurd.

De publieke fotoquery verstrekt geen eerder opgeslagen lokale upload meer.
Deze wijziging trekt eerder verspreide directe opslag- of externe foto-URL's
niet zelfstandig in en kan reeds gedownloade kopieën niet terughalen. Beoordeel
reeds gepubliceerde foto's afzonderlijk; verwijder geen bestanden of historische
wedstrijdgegevens zonder gericht besluit.

## Verificatie

De regressietests gebruiken uitsluitend fictieve spelers en nagebootste HTTP-
antwoorden. Zij controleren de verschillende openbare queryroutes,
bronbeperkingen, toestemming, ontbrekende en dubbele lidcodes, verlopen
snapshots, bronfouten, gelijktijdige verversingen, teamverwisseling, coachrechten,
handmatig ingevoerde namen en gezondheidsvelden.

Voer uit met de versies uit de lockfile:

```sh
npm ci --ignore-scripts
npx tsc --noEmit
npx tsc --noEmit -p convex/tsconfig.json
npm run test:pin-guard
npx vitest run
npm run build
```

Gebruik voor een lokale build geldige fictieve publieke configuratie of de
geautoriseerde configuratie van de testomgeving. Een build zonder Clerk-provider
kan bestaande coachpagina's niet prerenderen. Een geslaagde lokale build is geen
bewijs van een Convex-deploy of van de live privacywerking.

## Broncontract

[Sportlink Club Dataservice artikelen](https://sportlinkservices.freshdesk.com/nl/support/solutions/articles/9000062942),
onder Team-indeling: `lidcode`, `naam`, `rol` en `foto`; bij afgeschermd een
 afgeschermde naam, bij beperkt geen foto, bij normaal wel foto.
Geraadpleegd op 4 november 2026. Dit broncontract is geen zelfstandige juridische
publicatiegrondslag voor DIA REF.
