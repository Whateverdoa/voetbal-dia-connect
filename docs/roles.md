# Rollen en toegang (DIA Live)

## Overzicht

De app kent drie rollen: **admin**, **coach** en **scheidsrechter**. Toegang wordt bepaald door:

1. **Clerk** (login): `publicMetadata.role` / `publicMetadata.roles` — bepaalt of je naar /admin, /coach of /scheidsrechter mag (middleware).
2. **Convex** (data): admin via e-mailallowlist; coach en scheidsrechter via e-mail in de tabellen `coaches` en `referees`. Toegang is volledig e-mailgebaseerd via Clerk; PIN wordt niet meer gebruikt voor inloggen of rechten.

## “Gewoon inloggen” zonder knoppen (jij: admin + coach + scheidsrechter)

Als je **één keer** inlogt en direct alle drie de rollen wilt (zonder de rolkeuze-knoppen op /onboarding/rol):

### Stap 1: E-mail in allowlist

Zet je **e-mailadres** (hetzelfde als in Clerk) in de omgevingsvariabele:

- **`CLERK_BOOTSTRAP_ADMIN_EMAILS`** — komma-gescheiden lijst, bijv. `jouw@email.nl`

(Zie ook `docs/config.md`.)

### Stap 2: Coach- en scheidsrechterrecord met jouw e-mail

Zodat /coach en /scheidsrechter data tonen (teams, wedstrijden):

- Ga als admin naar **Admin → Coaches** en maak een coach met **jouw e-mail**, of pas een bestaande coach aan en vul e-mail in.
- Ga naar **Admin → Scheidsrechters** en maak een scheidsrechter met **jouw e-mail**, of pas een bestaande aan.

Convex koppelt je login (Clerk-identiteit) aan coach/scheidsrechter op basis van dat e-mailveld.

### Stap 3: Automatische roltoewijzing

Als je e-mail in `CLERK_BOOTSTRAP_ADMIN_EMAILS` staat en je hebt nog **geen** rol in Clerk:

- De **onboarding-pagina** (/onboarding/rol) kent bij het eerste bezoek automatisch de rollen **admin**, **coach** en **scheidsrechter** toe en stuurt je door naar de startpagina.
- Je ziet de rolkeuze-knoppen dus niet; je logt in en hebt direct alle rechten.

Daarna kun je gewoon naar /admin, /coach of /scheidsrechter gaan.

## Handmatig rollen zetten (Clerk Dashboard)

Als je geen bootstrap gebruikt, kun je rollen handmatig in **Clerk Dashboard** zetten:

1. Clerk Dashboard → Users → jouw user → **Public metadata**.
2. Voeg toe (of pas aan):
   - `role`: `"admin"` (legacy, één rol)
   - `roles`: `["admin", "coach", "referee"]` (meerdere rollen)

De app leest zowel `role` als `roles`; met `roles` kun je meerdere rollen hebben. Zonder dit zou de middleware je naar /onboarding/rol sturen of toegang weigeren.

## Waar wordt wat gecontroleerd?

| Wat              | Waar                    | Hoe |
|------------------|-------------------------|-----|
| Toegang /admin   | Middleware + Convex     | Clerk: `roles` bevat "admin". Convex: e-mail in `CLERK_BOOTSTRAP_ADMIN_EMAILS`. |
| Toegang /coach   | Middleware + Convex     | Clerk: `roles` bevat "coach". Convex: `coaches.email` = identiteits-e-mail. |
| Toegang /scheidsrechter | Middleware + Convex | Clerk: `roles` bevat "referee". Convex: `referees.email` = identiteits-e-mail. |

## Oude flow (rolkeuze, e-mailkoppeling)

De knoppen op **/onboarding/rol** zijn voor gebruikers die **geen** bootstrap-admin zijn:

- Zij kiezen **één** rol (coach, scheidsrechter of admin als hun e-mail in de allowlist staat).
- Koppeling verloopt via e-mail op coach/scheidsrechter-records.

Bootstrap-admins slaan deze stap over: zij krijgen bij het eerste bezoek aan /onboarding/rol automatisch alle drie de rollen en worden doorgestuurd.
