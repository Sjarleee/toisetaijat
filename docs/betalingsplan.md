# MobilePay betalingsintegrasjon

Avtale med MobilePay er på plass (Finland). E-postvarsling håndteres av Google Apps Script i bestillings-sheet — Resend er ikke nødvendig.

---

## Status

| Steg | Status |
|---|---|
| MobilePay forretningsavtale (Finland) | ✅ Klar |
| Test sales unit + API-nøkler | ✅ Klar |
| Test-app installert på telefon | ✅ Klar |
| Worker: `POST /api/payment/create` | ✅ Klar |
| Worker: `GET /api/payment/status` (polling + capture) | ✅ Klar |
| Nettside: tilkoblet Worker | ⬜ |

---

## Oppsett av testmiljø (gjør dette først)

### 1. Opprett test-salgsenhet i portalen

1. Logg inn på [portal.vippsmobilepay.com](https://portal.vippsmobilepay.com/)
2. Gå til **For developers** i sidebaren
3. Velg fanen **Test** → opprett ny test-salgsenhet
4. Klikk **Show keys** på salgsenheten og kopier ut alle fire verdiene:

| Nøkkel | Beskrivelse |
|---|---|
| `client_id` | "Brukernavn" for salgsenheten (GUID) |
| `client_secret` | "Passord" for salgsenheten (Base64) |
| `Ocp-Apim-Subscription-Key (primær)` | Abonnementsnøkkel — bruk denne (Hex) |
| `Ocp-Apim-Subscription-Key (sekundær)` | Utbyttbar med primær, brukes ved nøkkelrotasjon — ikke nødvendig å lagre |
| `merchantSerialNumber` (MSN) | Unik ID for salgsenheten — brukes i alle API-kall |

Lagre disse som **Cloudflare Worker Secrets** (se under). Aldri i koden eller git.

### 2. Opprett testbruker

1. I portalen: **For developers** → fanen **Test users** → **Add a new test user**
2. Systemet genererer automatisk et telefonnummer og et NIN (personnummer)
3. Noter disse — du trenger dem for å logge inn i test-appen

### 3. Installer test-appen (MT-appen) på telefon

- **iOS**: [TestFlight-lenke](https://testflight.apple.com/join/hTAYrwea) (ikke søk i TestFlight — bruk lenken direkte)
- **Android**: Se [developer.vippsmobilepay.com](https://developer.vippsmobilepay.com/docs/knowledge-base/test-environment/)

Logg inn med testbrukerens telefonnummer + NIN. PIN-kode: `1236`.

> Test-appen er oransje og kan installeres side om side med produksjonsappen.

---

## API-flyt (ePayment API)

Alle kall bruker **EUR** som valuta (finsk merchant).

### Servere

| Miljø | URL |
|---|---|
| Test (MT) | `https://apitest.vipps.no` |
| Produksjon | `https://api.vipps.no` |

### Trinn 1 — Hent access token

```
POST https://apitest.vipps.no/accesstoken/get
Headers:
  client_id: <din client_id>
  client_secret: <din client_secret>
  Ocp-Apim-Subscription-Key: <din subscription key>
  Merchant-Serial-Number: <din MSN>
```

Responsen inneholder `access_token` — bruk dette som `Bearer`-token i alle videre kall. Token er kortvarig og må hentes på nytt ved utløp.

### Trinn 2 — Opprett betaling

```
POST https://apitest.vipps.no/epayment/v1/payments
Headers:
  Authorization: Bearer <access_token>
  Ocp-Apim-Subscription-Key: <subscription key>
  Merchant-Serial-Number: <MSN>
  Idempotency-Key: <unik UUID per forsøk>
  Content-Type: application/json

Body:
{
  "amount": { "currency": "EUR", "value": 1990 },  // øre/cent, dvs. 19.90 €
  "paymentMethod": { "type": "WALLET" },
  "customer": { "phoneNumber": "35840XXXXXXX" },   // valgfritt — forhåndsutfyller i app
  "reference": "toisetaijat-<ordreId>",
  "returnUrl": "https://toisetaijat.fi/tilaus-vahvistettu?ref=<ordreId>",
  "userFlow": "WEB_REDIRECT",
  "paymentDescription": "Kirjatilaus – Toiset Aijat"
}
```

Responsen inneholder `redirectUrl` — send brukeren dit. MobilePay/Vipps-appen åpner betalingsdialogen.

### Trinn 3 — Sjekk betalingsstatus (polling)

```
GET https://apitest.vipps.no/epayment/v1/payments/<reference>
```

Sjekk feltet `state`:
- `AUTHORIZED` → betaling godkjent av bruker, klar for capture
- `ABORTED` → bruker avbrøt
- `EXPIRED` → tidsavbrudd

> Vi poller fra Worker i stedet for webhook, fordi Cloudflare Workers håndterer polling enkelt. Webhook kan legges til senere.

### Trinn 4 — Capture (trekk penger)

```
POST https://apitest.vipps.no/epayment/v1/payments/<reference>/capture
Body:
{
  "modificationAmount": { "currency": "EUR", "value": 1990 }
}
```

Gjøres umiddelbart etter `AUTHORIZED` for bok-/artikkelordre (direktesalg).

### Testbeløp som trigger spesifikke utfall

| Beløp (cent) | Utfall |
|---|---|
| 151 | Ikke nok saldo |
| 182 | Avvist av kortutsted |
| 186 | Utløpt kort |
| 201 | Ukjent resultat i 1 time |

---

## Cloudflare Worker — arkitektur

**Fil:** `functions/api/payment/create.ts`

Ansvar:
1. Ta imot bestillingsskjema fra frontend (`POST /api/payment/create`)
2. Hente access token fra MobilePay
3. Opprette betaling via ePayment API
4. Returnere `redirectUrl` til frontend

**Fil:** `functions/api/payment/status.ts`

Ansvar:
1. Ta imot `reference` fra frontend (etter redirect tilbake til siden)
2. Sjekke betalingsstatus via ePayment API
3. Kalle capture hvis `AUTHORIZED`
4. Returnere status til frontend (som viser bekreftelsesside)

E-postvarsling til eier skjer via Google Apps Script som allerede er satt opp i bestillings-sheetet.

### Cloudflare Worker Secrets

Legg inn via Cloudflare Dashboard → Workers → Settings → Variables → Secrets, eller med `wrangler secret put`:

```
MOBILEPAY_CLIENT_ID
MOBILEPAY_CLIENT_SECRET
MOBILEPAY_SUBSCRIPTION_KEY
MOBILEPAY_MSN
```

---

## Kostnader

| Komponent | Kostnad |
|---|---|
| Cloudflare Worker | Gratis (100 000 req/dag) |
| MobilePay transaksjonsgebyr | ~1,7–2,5 % per betaling (avtalte vilkår) |

---

## Nyttige lenker

- [ePayment API — oversikt](https://developer.vippsmobilepay.com/docs/APIs/epayment-api/)
- [ePayment API — Quick start](https://developer.vippsmobilepay.com/docs/APIs/epayment-api/quick-start/)
- [ePayment API — spec](https://developer.vippsmobilepay.com/api/epayment/)
- [Testmiljø](https://developer.vippsmobilepay.com/docs/knowledge-base/test-environment/)
- [API-nøkler](https://developer.vippsmobilepay.com/docs/knowledge-base/api-keys/)
- [Business portal](https://portal.vippsmobilepay.com/)
- [Demoshop](https://demo.vipps.no/)
