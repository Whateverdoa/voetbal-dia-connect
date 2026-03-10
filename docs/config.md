# Configuratievariabelen

## Sportlink voorbereiding

Deze variabelen zijn voorbereid, maar worden pas actief gebruikt zodra het bestuur
`SPORTLINK_CLIENT_ID` aanlevert.

- `SPORTLINK_CLIENT_ID`  
  Vereist voor Sportlink Club.Dataservice toegang.
- `SPORTLINK_BASE_URL`  
  Optioneel. Default: `https://data.sportlink.com`.
- `SPORTLINK_REFRESH_MINUTES`  
  Optioneel. Default: `5`.

## Opmerkingen

- Geen secrets committen naar Git.
- Zonder `SPORTLINK_CLIENT_ID` blijft de app op de interne dataflow werken.
