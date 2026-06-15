# Plan: MobilePay betalingsintegrasjon

Ikke første prioritet. Nåværende løsning (Google Forms + manuell faktura) fungerer fint for lavt volum.

## Nåværende løsning (enkel, anbefalt nå)

Google Forms-lenker for bestilling → du sender faktura manuelt → kunden betaler via nettbank.
Ingen kostnad, ingen integrasjon nødvendig.

---

## Fremtidig integrasjon

### Fase 0 — Forberedelser (du gjør dette)

1. Søk MobilePay forretningsavtale for Finland: https://portal.vippsmobilepay.com
2. Opprett gratis konto på https://resend.com (e-postvarsling, 100 e-poster/dag gratis)
3. Verifiser domenet `toisetaijat.fi` i Resend

### Fase 1 — Cloudflare Worker (backend)

Ny fil: `workers/checkout/index.ts`

- `POST /api/create-payment` — mottar bestillingsskjema, kaller Vipps ePayment API, returnerer betalings-URL
- `POST /api/vipps-webhook` — mottar betalingsbekreftelse fra Vipps, sender bestillings-e-post via Resend

Hemmeligheter lagres i Cloudflare Worker Secrets (aldri i koden eller git).

### Fase 2 — Bestillingsskjema på nettsiden

Ny side: `src/pages/tilaa/[bookId].astro`

Felt:
- Navn
- Adresse, postnummer, by, land
- E-post
- Kommentar

Flyt: "Betal med MobilePay"-knapp → kaller Worker → redirect til Vipps-app → betaling bekreftet → e-post til nettstedeier

### Fase 3 — Koble til ProductCard

`src/components/ProductCard.astro` "Tilaa"-knapp peker til `/tilaa/[bookId]` i stedet for Google Forms.

---

## Kostnader

| Komponent | Kostnad |
|---|---|
| Cloudflare Worker | Gratis (100 000 req/dag inkludert) |
| Cloudflare Pages | Gratis |
| Resend e-post | Gratis (100 e-poster/dag) |
| MobilePay transaksjonsgebyr | ~1,7–2,5 % per betaling (avtales med Vipps MobilePay) |

## Teknologier

- [Vipps MobilePay ePayment API](https://developer.vippsmobilepay.com/docs/APIs/epayment-api/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Resend](https://resend.com)
