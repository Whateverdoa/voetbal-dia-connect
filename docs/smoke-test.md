# DIA Live Smoke Test Checklist

Manual verification checklist for DIA Live functionality.

## Prerequisites

- [ ] Convex dev server running (`npm run dev:backend` or `npx convex dev`)
- [ ] Frontend dev server running (`npm run dev:frontend`)
- [ ] Access to Convex dashboard (https://dashboard.convex.dev)

---

## Phase 1: Seed Data & Basic Setup

### 1. Seed Script Execution

```bash
npx convex run seed:init
```

### Expected output (first run)

```json
{
  "message": "Seed data created successfully!",
  "created": true,
  "data": {
    "clubId": "<id>",
    "teams": [
      { "id": "<id>", "name": "JO11-1", "playerCount": 14 },
      { "id": "<id>", "name": "JO12-1", "playerCount": 14 },
      { "id": "<id>", "name": "JO13-2", "playerCount": 14 }
    ],
    "coaches": [
      { "id": "<id>", "name": "Coach Mike", "pin": "1234" },
      { "id": "<id>", "name": "Coach Lisa", "pin": "5678" }
    ],
    "match": {
      "id": "<id>",
      "code": "<6-char-code>",
      "opponent": "VV Oranje"
    }
  }
}
```

- [ ] Script completes without errors
- [ ] Returns `created: true` on first run
- [ ] Match code is 6 characters (uppercase letters + digits, no O/0/I/1)

### Verify idempotency (run again)

```bash
npx convex run seed:init
```

- [ ] Returns `created: false`
- [ ] Message: "Seed data already exists. DIA club found."
- [ ] No duplicate data created

---

### 2. Convex Dashboard Verification

Open https://dashboard.convex.dev and select your project.

#### Clubs table

- [ ] 1 record: "DIA" with slug "dia"

#### Teams table

- [ ] 3 records:
  - [ ] JO11-1 (slug: jo11-1)
  - [ ] JO12-1 (slug: jo12-1)
  - [ ] JO13-2 (slug: jo13-2)
- [ ] All linked to DIA club via `clubId`

#### Coaches table

- [ ] 2 records:
  - [ ] Coach Mike (PIN: 1234, manages JO12-1)
  - [ ] Coach Lisa (PIN: 5678, manages JO11-1 and JO13-2)
- [ ] PINs are unique

#### Players table

- [ ] 42 records total (14 per team × 3 teams)
- [ ] Each player has:
  - [ ] Dutch first name
  - [ ] Shirt number (1-14)
  - [ ] `active: true`
- [ ] No duplicate names across teams

#### Matches table

- [ ] 1 record:
  - [ ] Team: JO12-1
  - [ ] Opponent: "VV Oranje"
  - [ ] Status: "scheduled"
  - [ ] isHome: true
  - [ ] coachPin: "1234"
  - [ ] publicCode: 6-char code

#### MatchPlayers table

- [ ] 14 records (one per JO12-1 player)
- [ ] All linked to the match
- [ ] All have `onField: false`, `isKeeper: false`

---

## Phase 2: Coach Interface

### 3. Coach Login Flow

#### Test valid PIN - Coach Mike

1. Navigate to http://localhost:3000/coach
2. Enter PIN: `1234`
3. Click "Inloggen"

Expected:

- [ ] Dashboard loads
- [ ] Shows "Welkom, Coach Mike!"
- [ ] Shows team: "JO12-1"
- [ ] Shows 1 scheduled match vs VV Oranje
- [ ] Match card shows public code
- [ ] Shows "Nieuwe wedstrijd" button

#### Test valid PIN - Coach Lisa

1. Navigate to http://localhost:3000/coach
2. Enter PIN: `5678`
3. Click "Inloggen"

Expected:

- [ ] Dashboard loads
- [ ] Shows "Welkom, Coach Lisa!"
- [ ] Shows teams: "JO11-1 • JO13-2"
- [ ] Shows "Nog geen wedstrijden voor dit team" (no matches for her teams)

#### Test invalid PIN

1. Navigate to http://localhost:3000/coach
2. Enter PIN: `9999`
3. Click "Inloggen"

Expected:

- [ ] Error message: "Ongeldige PIN code" (in Dutch)
- [ ] Stays on login page
- [ ] No dashboard shown

#### Test short PIN

1. Navigate to http://localhost:3000/coach
2. Enter PIN: `12` (only 2 digits)

Expected:

- [ ] "Inloggen" button is disabled
- [ ] Cannot submit form

#### Test logout

1. Login with valid PIN
2. Click "Uitloggen" button

Expected:

- [ ] Returns to login page
- [ ] Session cleared

---

### 4. Match Creation

1. Login as Coach Mike (PIN: 1234)
2. Click "Nieuwe wedstrijd" for JO12-1
3. Fill in match details:
   - Opponent: "FC Test"
   - Home/Away: Thuis
   - Date/Time: Select future date
4. Select players for lineup (at least 7)
5. Click "Wedstrijd aanmaken"

Expected:

- [ ] Form validates required fields
- [ ] Success screen shows with public code
- [ ] New match appears in dashboard
- [ ] Match status is "scheduled"
- [ ] Public code is 6 characters

---

### 5. Match Control Panel

1. Login as Coach Mike
2. Click on a scheduled match to open control panel

Expected:

- [ ] Shows match header with opponent name
- [ ] Shows current score (0-0 for new match)
- [ ] Shows status badge ("Gepland")
- [ ] Shows player list (Op het veld / Bank)
- [ ] Shows control buttons

#### Start Match Flow

1. Set lineup (toggle players to field)
2. Click "Start wedstrijd"

Expected:

- [ ] Status changes to "LIVE"
- [ ] Status badge shows red with pulse animation
- [ ] Quarter indicator shows "K1"
- [ ] Match controls become active

---

### 6. Goal Recording (2-tap flow)

1. With match in LIVE status
2. Click "Doelpunt" button

Expected:

- [ ] Modal opens with "Doelpunt" title
- [ ] Shows "GOAL!" button (big, green)
- [ ] Shows "Tegendoelpunt" button (red)
- [ ] Shows "Annuleren" button

#### Our Goal

1. Click "GOAL!"
2. Select scorer from player list
3. Optionally select assist
4. Click "Registreren"

Expected:

- [ ] Score updates (+1 for home if home match)
- [ ] Event appears in timeline
- [ ] Modal closes

#### Opponent Goal

1. Click "Doelpunt"
2. Click "Tegendoelpunt"

Expected:

- [ ] Score updates immediately (+1 for opponent)
- [ ] Event appears in timeline
- [ ] Modal closes (1-tap flow)

---

### 7. Substitution

1. With match in LIVE status
2. Click "Wissel" button

Expected:

- [ ] Modal opens with "Wissel" title
- [ ] Shows "Eruit (op het veld)" section with field players
- [ ] Shows "Erin (bank)" section with bench players
- [ ] "Wissel bevestigen" button is disabled

#### Make Substitution

1. Select player to come off (from field)
2. Select player to come on (from bench)
3. Click "Wissel bevestigen"

Expected:

- [ ] Visual summary shows "Player A → Player B"
- [ ] Player states swap (field ↔ bench)
- [ ] Event appears in timeline
- [ ] Modal closes

---

### 8. Quarter Management

1. With match in LIVE status (K1)
2. Click "Einde kwart" or quarter control

Expected:

- [ ] Quarter advances (K1 → K2)
- [ ] After K2, halftime option appears

#### Halftime

1. End quarter 2
2. Click "Rust" or halftime button

Expected:

- [ ] Status changes to "Rust"
- [ ] Status badge shows orange
- [ ] Can resume to K3

#### End Match

1. Complete all quarters (typically K4)
2. Click "Einde wedstrijd"

Expected:

- [ ] Status changes to "Afgelopen"
- [ ] Status badge shows dark gray
- [ ] Match controls disabled
- [ ] Final score locked

---

## Phase 3: Public Experience Enhancements

### 9. Live Connection Indicator

1. Open public view with match code
2. Observe connection indicator

Expected:

- [ ] Green dot visible with "Live verbinding actief" text
- [ ] Dot has pulse animation when connected
- [ ] Wifi icon displayed

#### Test disconnection (optional - requires network manipulation)

1. Disconnect network briefly
2. Observe indicator change

Expected:

- [ ] Red dot appears with "Verbinding verbroken" text
- [ ] WifiOff icon displayed
- [ ] Reconnects automatically when network restored

---

### 10. Quarter Progress Display

1. Open public view during live match
2. Observe quarter progress indicator

Expected:

- [ ] Shows Q1-Q4 labels for 4-quarter format
- [ ] Shows H1-H2 labels for 2-half format
- [ ] Current quarter highlighted with ring
- [ ] Past quarters show completed style (white/30)
- [ ] Future quarters show dimmed style (white/10)
- [ ] Connector lines between quarters visible

#### Test halftime display

1. During halftime status

Expected:

- [ ] Current quarter shows orange styling
- [ ] "RUST" indicator may appear

---

### 11. Share Button

1. Open public view with match code
2. Click "Deel" button

Expected:

- [ ] Button shows "Deel" with share icon
- [ ] On click: Web Share API opens (mobile) OR copies to clipboard (desktop)
- [ ] After copy: Shows "Gekopieerd!" with checkmark
- [ ] After 2 seconds: Reverts to "Deel"
- [ ] Shared text includes match code and team names

---

### 12. Sound Toggle

1. Open public view
2. Find sound toggle button

Expected:

- [ ] Shows "Geluid uit" by default (first visit)
- [ ] VolumeX icon when disabled
- [ ] Gray background when disabled

#### Enable sound

1. Click toggle button

Expected:

- [ ] Changes to "Geluid aan"
- [ ] Volume2 icon when enabled
- [ ] Green (dia-green) styling when enabled
- [ ] Preference saved to localStorage

#### Verify persistence

1. Refresh page

Expected:

- [ ] Sound preference persists (stays enabled/disabled)

---

### 13. Goal Celebration Animation

1. Open public view during live match
2. Have coach record a goal (our team)

Expected:

- [ ] "GOAL!" overlay appears in green
- [ ] Football emoji (⚽) displayed
- [ ] Confetti-like animation (colored dots)
- [ ] Bounce and pulse animations active
- [ ] Overlay disappears after ~2 seconds
- [ ] Score updates with highlight animation

#### Test opponent goal

1. Have coach record opponent goal

Expected:

- [ ] "TEGEN" overlay appears in red
- [ ] No confetti effect
- [ ] Disappears after ~2 seconds

---

### 14. Score Animation

1. Open public view during live match
2. Observe score when goal is recorded

Expected:

- [ ] Score number scales up briefly (scale-125)
- [ ] Yellow highlight color on changed score
- [ ] Animation lasts ~1.5 seconds
- [ ] Returns to normal size/color

---

## Phase 1 (continued): Public View

### 15. Public Match View (Basic)

#### Access via match code

1. Get the match code from seed output or Convex dashboard
2. Navigate to http://localhost:3000
3. Enter the 6-character code
4. Click "Bekijk wedstrijd"

Expected:

- [ ] Match page loads
- [ ] Shows "JO12-1 vs VV Oranje" (or reverse for away)
- [ ] Status shows "Nog niet begonnen" or "Gepland"
- [ ] Score shows "0 - 0"
- [ ] No lineup visible (showLineup: false)

#### Test invalid code

1. Navigate to http://localhost:3000
2. Enter code: `XXXXXX`
3. Click "Bekijk wedstrijd"

Expected:

- [ ] Error message: "Wedstrijd niet gevonden"
- [ ] Stays on home page or shows error state

#### Live Match Public View

1. Start a match from coach interface
2. Open public view with match code

Expected:

- [ ] Shows "LIVE" status with pulse
- [ ] Score updates in real-time when coach records goals
- [ ] Shows current quarter
- [ ] Lineup visible if coach enabled it

---

## Phase 4: Playing Time & Admin Features

### 16. Playing Time Tracker

1. Start a live match
2. Navigate to match control panel
3. Find the "Speeltijd overzicht" panel

Expected:

- [ ] Shows "Speeltijd overzicht" header with ⏱️ emoji
- [ ] Displays "Gemiddeld" (average) minutes
- [ ] Displays "Verschil" (spread) between max and min
- [ ] Displays "Spelers" count
- [ ] Shows fairness legend: "Goed" (green), "Meer nodig" (yellow), "Te weinig" (red)

#### Player List Display

- [ ] Shows "Alle spelers (minst gespeeld eerst)" section
- [ ] Players sorted by least playing time first
- [ ] Each player shows number, name, and minutes played
- [ ] Keeper marked with "K" badge
- [ ] On-field players marked with "Veld" badge

#### Color Indicators

- [ ] Green background for players with fair playing time (within 3 min of average)
- [ ] Yellow background for players needing more time (3-6 min below average)
- [ ] Red background for players with critically low time (>6 min below average)
- [ ] Progress bars show relative playing time

#### On-Field / Bench Sections

- [ ] "Op het veld" section shows count and on-field players
- [ ] "Bank" section shows count and bench players
- [ ] Empty states show Dutch messages ("Geen spelers op het veld", "Geen spelers op de bank")

---

### 17. Substitution Suggestions

1. During a live match with players having unequal playing time
2. Find the "Wissel suggesties" panel

Expected:

- [ ] Shows "Wissel suggesties" header with 💡 emoji
- [ ] Shows field/bench count: "X op veld, Y op bank"

#### Suggestion Cards

- [ ] Each suggestion shows priority number (1, 2, 3...)
- [ ] Shows Dutch reason text explaining the suggestion
- [ ] Player out section (red background) with name, number, minutes
- [ ] Player in section (green background) with name, number, minutes
- [ ] Arrow (→) between player out and player in
- [ ] Down arrow (↓) for player going off
- [ ] Up arrow (↑) for player coming on

#### Urgency Styling

- [ ] High urgency (>8 min difference): Red border
- [ ] Medium urgency (5-8 min difference): Yellow border
- [ ] Low urgency (<5 min difference): Blue border

#### One-Tap Execution

1. Click "Wissel uitvoeren" button on a suggestion

Expected:

- [ ] Button shows 🔄 emoji and "Wissel uitvoeren"
- [ ] While executing: Shows "Bezig..." and spinner
- [ ] Button disabled during execution
- [ ] Substitution executes successfully
- [ ] Suggestion disappears or updates after execution

#### Empty State

- [ ] When no suggestions: Shows "Geen suggesties nodig" with ✓
- [ ] Shows "Speeltijd is redelijk verdeeld" when times are balanced
- [ ] Shows "Geen spelers op de bank" when bench is empty

#### Error Handling

- [ ] Shows Dutch error message on failure: "Wissel mislukt: [error]"
- [ ] Shows "Sessie verlopen. Herlaad de pagina." for PIN errors
- [ ] Error auto-clears after 5 seconds

---

### 18. Admin Panel

Navigate to http://localhost:3000/admin

#### Teams Tab

1. Select a club
2. Test team CRUD operations

Expected:

- [ ] Shows "Laden..." while loading
- [ ] Shows "Geen teams." when empty
- [ ] Shows "Selecteer eerst een club." when no club selected
- [ ] Team list shows name and slug
- [ ] "Nieuw team" section with name and slug inputs
- [ ] Placeholder: "Naam (bijv. JO12-1)"
- [ ] Placeholder: "Slug (optioneel)"
- [ ] "Toevoegen" button (disabled when name empty)

##### Create Team

1. Enter team name and optional slug
2. Click "Toevoegen"

Expected:

- [ ] Team created successfully
- [ ] Shows "✅ Team aangemaakt"
- [ ] Inputs cleared after creation
- [ ] Auto-generates slug from name if not provided

##### Edit Team

1. Click edit (pencil) icon on a team
2. Change the name
3. Click save (checkmark) icon

Expected:

- [ ] Edit mode shows input with current name
- [ ] Shows save and cancel buttons
- [ ] Shows "✅ Team bijgewerkt" on success
- [ ] Cancel exits edit mode without saving

##### Delete Team

1. Click delete (trash) icon on a team

Expected:

- [ ] Shows Dutch confirmation: "Verwijderen? Alle spelers worden ook verwijderd!"
- [ ] Shows "Ja" and "Nee" buttons
- [ ] "Ja" deletes team, shows "✅ Team verwijderd"
- [ ] "Nee" cancels deletion

#### Players Tab

1. Select a team from dropdown
2. Test player CRUD operations

Expected:

- [ ] Shows "Selecteer team..." dropdown
- [ ] Shows "Laden..." while loading
- [ ] Shows "Geen spelers in dit team." when empty
- [ ] Player list shows number (#X), name, and active status
- [ ] Toggle button for active/inactive status
- [ ] "Nieuwe speler" section with number and name inputs

##### Create Player

1. Enter player number and name
2. Click "Toevoegen"

Expected:

- [ ] Shows "✅ Speler toegevoegd"
- [ ] Player appears in list

##### Edit Player

1. Click edit icon
2. Change number or name
3. Click save

Expected:

- [ ] Shows "✅ Speler bijgewerkt"

##### Toggle Active Status

1. Click toggle icon on a player

Expected:

- [ ] Active players show green toggle, normal opacity
- [ ] Inactive players show gray toggle, reduced opacity
- [ ] Shows "🟢 Speler actief" or "⚪ Speler inactief"

##### Delete Player

1. Click delete icon
2. Confirm with "Ja"

Expected:

- [ ] Shows "Verwijderen?"
- [ ] Shows "✅ Speler verwijderd" on success

#### Coaches Tab

1. Test coach CRUD operations

Expected:

- [ ] Shows "Laden..." while loading
- [ ] Shows "Geen coaches." when empty
- [ ] Coach list shows name, PIN, and assigned teams
- [ ] "Nieuwe coach" section with name, PIN, and team selection

##### Create Coach

1. Enter name and PIN
2. Select teams (click team buttons to toggle)
3. Click "Toevoegen"

Expected:

- [ ] Selected teams highlighted in dia-green
- [ ] Shows "✅ Coach aangemaakt"
- [ ] Shows "Geen teams beschikbaar" if no teams exist

##### Edit Coach

1. Click edit icon
2. Change name, PIN, or team assignments
3. Click save

Expected:

- [ ] Shows "✅ Coach bijgewerkt"

##### Delete Coach

1. Click delete icon
2. Confirm with "Ja"

Expected:

- [ ] Shows "Coach verwijderen?"
- [ ] Shows "✅ Coach verwijderd" on success

---

### 19. Match History Page

Navigate to http://localhost:3000/team/[slug]/history (e.g., /team/jo12-1/history)

Expected:

- [ ] Shows team name in header
- [ ] Shows club name below team name
- [ ] Breadcrumb: DIA > [Team Name] > Geschiedenis

#### Season Summary

- [ ] Shows "Seizoen Overzicht" header with TrendingUp icon
- [ ] Stats grid: "Gespeeld", "Gewonnen", "Gelijk", "Verloren", "Doelsaldo"
- [ ] Goal difference shown with +/- prefix
- [ ] "Topscorers" section with ranked players (gold/silver/bronze badges)
- [ ] Shows "Nog geen wedstrijden gespeeld dit seizoen" when empty

#### Match List

- [ ] Shows "Wedstrijden (X)" header with count
- [ ] Each match card shows:
  - [ ] Date in Dutch format (e.g., "za 15 feb 2026")
  - [ ] Opponent with "vs" (home) or "@" (away) prefix
  - [ ] Score (e.g., "2 - 1")
  - [ ] Result badge: W (green), G (gray for draw), V (red for loss)
  - [ ] Scorers with ⚽ emoji
- [ ] Shows "Nog geen afgelopen wedstrijden" when empty

#### Loading State

- [ ] Shows spinner with "Team laden..."

#### Not Found State

- [ ] Shows "Team niet gevonden" for invalid slug
- [ ] Shows the invalid slug in monospace font
- [ ] "Terug naar home" button

---

## Data Integrity Checks

### Player distribution

- [ ] JO11-1: 14 players
- [ ] JO12-1: 14 players
- [ ] JO13-2: 14 players

### Coach-team relationships

- [ ] Coach Mike can only access JO12-1 matches
- [ ] Coach Lisa can access JO11-1 and JO13-2 matches
- [ ] Neither coach can access the other's teams

### Public code uniqueness

- [ ] Match public codes are unique (no duplicates)
- [ ] Codes contain only allowed characters (A-Z except O/I, 2-9)

---

## UI/UX Verification

### Dutch language

- [ ] Login button: "Inloggen"
- [ ] Error message: "Ongeldige PIN code"
- [ ] Dashboard greeting: "Welkom, [name]!"
- [ ] Logout button: "Uitloggen"
- [ ] Back link: "← Terug naar home"
- [ ] Scheduled section: "Gepland"
- [ ] Finished section: "Afgelopen"
- [ ] No matches: "Nog geen wedstrijden voor dit team"
- [ ] New match: "Nieuwe wedstrijd"
- [ ] Goal modal: "Doelpunt", "GOAL!", "Tegendoelpunt"
- [ ] Substitution: "Wissel", "Eruit", "Erin", "Wissel bevestigen"
- [ ] Status badges: "Gepland", "Opstelling", "LIVE", "Rust", "Afgelopen"

### Responsive design

- [ ] Coach login page works on mobile viewport (375px width)
- [ ] PIN input has large touch target
- [ ] Dashboard is readable on mobile
- [ ] Match control panel works on mobile
- [ ] Goal modal buttons are large enough for touch
- [ ] Substitution panel scrolls properly on small screens

### Touch targets

- [ ] All buttons have minimum 44px touch target
- [ ] Player selection buttons are at least 56px
- [ ] Action buttons (submit, cancel) are at least 48px

### Brand colors

- [ ] "DIA Live" text uses dia-green color
- [ ] Primary buttons use dia-green background
- [ ] Focus states use dia-green border
- [ ] LIVE status uses red with pulse animation

---

## Test Results Summary

| Category | Pass | Fail | Notes |
|----------|------|------|-------|
| Seed Script | | | |
| Dashboard Data | | | |
| Coach Login | | | |
| Match Creation | | | |
| Match Control | | | |
| Goal Recording | | | |
| Substitution | | | |
| Quarter Management | | | |
| Public View (Basic) | | | |
| Connection Indicator | | | |
| Quarter Progress | | | |
| Share Button | | | |
| Sound Toggle | | | |
| Goal Celebration | | | |
| Score Animation | | | |
| **Phase 4** | | | |
| Playing Time Tracker | | | |
| Substitution Suggestions | | | |
| Admin Panel - Teams | | | |
| Admin Panel - Players | | | |
| Admin Panel - Coaches | | | |
| Match History Page | | | |
| Data Integrity | | | |
| UI/UX | | | |

**Tested by:** _______________  
**Date:** _______________  
**Environment:** localhost / staging / production

---

## Known Issues / Notes

_Document any issues found during testing:_

1. 
2. 
3. 

---

## Cleanup (if needed)

To reset seed data for fresh testing:

1. Open Convex dashboard
2. Delete all records from tables in order:
   - matchPlayers
   - matchEvents
   - matches
   - players
   - coaches
   - teams
   - clubs
3. Re-run `npx convex run seed:init`
