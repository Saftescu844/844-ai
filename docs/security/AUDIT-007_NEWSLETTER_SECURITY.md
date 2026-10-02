# AUDIT-007 — Newsletter: RBAC, privacy, consent, token security & abuse resistance

**Proiect:** 844-ai.ro
**Mediu analizat:** staging/dev (`844-ai-dev`)
**Data validării tehnice:** 29–30 august 2026
**Data validării pe staging:** 30 august 2026
**Statut:** VALIDAT PE STAGING
**Impact asupra producției:** niciunul

---

## 1. Scop

AUDIT-007 verifică securitatea și confidențialitatea fluxului de newsletter: RBAC, prevenirea enumerării abonaților, protecția la retrimiteri abuzive, securitatea tokenurilor de confirmare, expunerea emailului în URL-uri și lifecycle-ul înscrierilor neconfirmate.

Producția reală nu a fost modificată în cadrul acestui audit.

---

## 2. Rezumat findings

| Finding | Severitate | Status |
| --- | --- | --- |
| F01 — Subscriber enumeration | MEDIUM | REMEDIAT ȘI VALIDAT PE STAGING |
| F02 — Confirmation resend abuse / email bombing | MEDIUM | REMEDIAT ȘI VALIDAT PE STAGING/DB |
| F03 — Token de confirmare nelegat de ciclul concret al abonamentului | MEDIUM | REMEDIAT ȘI VALIDAT PE STAGING |
| F04 — Email recuperabil din URL-ul de confirmare | LOW/MEDIUM | REMEDIAT PENTRU LINKURILE NOI; LEGACY RĂMÂNE TRANZITORIU |
| F05 — Retenția înscrierilor neconfirmate | LOW | REMEDIAT ȘI VALIDAT PE STAGING |

---

## 3. Principii aplicate

- colecția Payload `newsletter` rămâne administrativă;
- endpointurile publice sunt implementate separat;
- răspunsurile publice pentru adrese valide nu divulgă dacă adresa este new, pending sau confirmed;
- cooldown-ul de reconfirmare este revendicat printr-un update PostgreSQL condițional;
- valorile controlate de utilizator sunt transmise ca parametri SQL;
- nu se păstrează o tranzacție DB deschisă în timpul apelului către providerul email;
- tokenurile v2 folosesc HMAC-SHA256 și sunt legate de `subscription ID + email + timestamp`;
- verificarea folosește `timingSafeEqual`;
- tokenurile expiră;
- noile linkuri de confirmare nu mai transportă emailul;
- compatibilitatea legacy este păstrată temporar pentru linkurile deja emise;
- înscrierile newsletter neconfirmate sunt eliminate automat după 30 de zile de la `createdAt`; resend-ul nu prelungește retenția.

---

## 4. F01 — Subscriber enumeration

### Problemă

Endpointul public putea răspunde diferit pentru confirmed, pending și new, permițând deducerea existenței sau stării unei adrese.

### Remediere

Pentru orice adresă sintactic validă, răspunsul public este uniform:

```json
{"ok":true,"rezultat":"verifica_emailul"}
```

Inputul invalid rămâne `HTTP 400`. Frontendul nu mai are un branch public separat pentru „already subscribed”.

### Validare

`tests/int/newsletter-subscribe-response.int.spec.ts` — `6/6 PASS`

Post-deployment:

```text
INVENTORY_BEFORE=4
CONFIRMED_RESPONSE=200 generic
COOLDOWN_RESPONSE=200 generic
PUBLIC_RESPONSES_IDENTICAL=true
AUDIT007_POSTDEPLOY_F01_PASS
INVENTORY_AFTER=4
CLEANUP_PASS
```

**F01 — REMEDIAT ȘI VALIDAT PE STAGING**

Limitare: nu se afirmă eliminarea absolută a tuturor timing side channels.

---

## 5. F02 — Confirmation resend abuse / email bombing

### Problemă

O adresă existentă dar neconfirmată putea primi un nou email de confirmare la fiecare request.

### Remediere

Cooldown de 10 minute per abonament pending, folosind `confirmationLastSentAt`.

Claim PostgreSQL:

```sql
UPDATE "newsletter"
SET "confirmation_last_sent_at" = $1
WHERE "id" = $2
  AND "confirmat" = false
  AND (
    "confirmation_last_sent_at" IS NULL
    OR "confirmation_last_sent_at" <= $3
  )
RETURNING "id"
```

Valorile sunt parametrizate. Dacă providerul eșuează după claim, cooldown-ul nu este eliberat imediat; aceasta este o decizie intenționată de abuse resistance.

### Validare

`tests/int/newsletter-confirmation-cooldown.int.spec.ts` — `4/4 PASS`

Runtime PostgreSQL:
- primul claim secvențial: `true`;
- al doilea claim imediat: `false`;
- două claim-uri concurente: exact un câștigător;
- inventar restaurat `4 → 4`.

**F02 — REMEDIAT ȘI VALIDAT PE STAGING/DB**

Risc rezidual: cooldown-ul per abonament nu înlocuiește rate limiting global/WAF pentru atacuri distribuite asupra multor adrese.

---

## 6. F03 — Token nelegat de ciclul concret al abonamentului

### Problemă

Tokenul legacy era semnat pe baza `email + timestamp`, astfel încât un token vechi putea rămâne relevant după ștergerea unei abonări și recrearea aceleiași adrese.

### Remediere

Tokenurile v2 sunt legate de:

`subscription ID + email + timestamp`

Semnătura folosește domeniul logic:

`confirm|<subscriptionId>|<email>|<timestamp>`

Noile linkuri folosesc `i`, `t`, `s`. Endpointul încarcă exact abonamentul prin ID, recuperează emailul din DB și verifică semnătura pentru acel ID și acel email.

### Validare

`tests/int/newsletter-token.int.spec.ts` — `3/3 PASS`

Post-deployment:

```text
INVENTORY_BEFORE=4
SUBSCRIPTION_A_ID=25
TOKEN_V2_ID=25
TOKEN_V2_HAS_EMAIL_PARAM=false
CONFIRM_A_STATUS=303
A_CONFIRMED=true
SUBSCRIPTION_B_ID=26
STALE_STATUS=303
B_CONFIRMED_AFTER_STALE=false
STALE_TOKEN_LIFECYCLE_ISOLATION_PASS
AUDIT007_POSTDEPLOY_F03_PASS
INVENTORY_AFTER=4
CLEANUP_PASS
PROCESS_EXIT_OK
```

**F03 — REMEDIAT ȘI VALIDAT PE STAGING**

---

## 7. F04 — Email recuperabil din URL

### Problemă

Linkul legacy includea emailul în formă Base64URL. Base64URL nu este criptare.

### Remediere

Noile linkuri v2 au forma:

`/<lang>/confirmare-newsletter?i=<id>&t=<timestamp>&s=<signature>`

Emailul este recuperat server-side din DB.

Validarea post-deployment a confirmat:

`TOKEN_V2_HAS_EMAIL_PARAM=false`

### Risc tranzitoriu

Linkurile legacy deja emise continuă să funcționeze temporar. Generatorul legacy nu mai este folosit pentru linkuri noi.

**F04 — REMEDIAT PENTRU LINKURILE NOI ȘI VALIDAT PE STAGING**

---

## 8. F05 — Retenția înscrierilor neconfirmate

**LOW — REMEDIAT ȘI VALIDAT PE STAGING**

Înscrierile cu `confirmat=false` sunt păstrate maximum 30 de zile de la `createdAt`. Retrimiterea confirmării nu prelungește retenția, iar abonamentele confirmate nu sunt eligibile pentru cleanup.

Remedierea folosește `src/lib/newsletter-pending-retention.ts` și un `DELETE` PostgreSQL atomic și parametrizat pe `confirmat=false` și `created_at < $1`. Nu a fost necesar un câmp nou sau o migrare DB.

Runnerul `scripts/cleanup-newsletter-pending.ts` a fost validat pe staging: vechi+pending → șters, recent+pending → păstrat, vechi+confirmat → păstrat; cleanup real `deleted=4`, apoi `deleted=0` la a doua rulare.

Execuția automată rulează prin serviciul Railway separat `newsletter-retention`, zilnic la `0 3 * * *` (03:00 UTC), folosind `Dockerfile.retention`. Deployment validat: `780ec4b8-ab07-46e4-93c0-81bbb9b73d66`; rularea manuală post-deployment: `SUCCESS`, `[newsletter-retention] deleted=0`.

AUDIT-007 tratează situația inițială ca gap tehnic de lifecycle și retenție, nu ca o încălcare GDPR confirmată.

---

## 9. Migrare

Migrare:

`20260829_122921_audit007_newsletter_confirmation_cooldown`

UP:

```sql
ALTER TABLE "newsletter"
ADD COLUMN "confirmation_last_sent_at" timestamp(3) with time zone;
```

DOWN:

```sql
ALTER TABLE "newsletter"
DROP COLUMN "confirmation_last_sent_at";
```

Pe staging/dev migrarea a fost aplicată în batch 8 și apare `Ran: Yes`.

Migrarea nu a fost aplicată pe producția reală.

---

## 10. Teste și verificări

Teste:
- `newsletter-token.int.spec.ts`
- `newsletter-email-sender.int.spec.ts`
- `newsletter-confirmation-cooldown.int.spec.ts`
- `newsletter-subscribe-response.int.spec.ts`
- `newsletter-pending-retention.int.spec.ts`

Rezultat total: **18/18 PASS**

Alte verificări:
- `git diff --check` — PASS;
- ESLint — PASS;
- TypeScript — PASS;
- Node `v22.17.0`.

---

## 11. Merge și deployment staging

Commit implementare:

`644ff4ad1a9351c2049ad7497e1a71ed44f3f490` — `fix: harden newsletter security`

PR: `#50`

Merge commit `staging`:

`1e2bf1fca308b73fbb3e7bee4e739e8a70e35bb3`

Deployment Railway staging:

`0b62d637-5bf4-4875-a4b2-1fa80ba661da`

Metadate validate:

```text
branch=staging
commitHash=1e2bf1fca308b73fbb3e7bee4e739e8a70e35bb3
repo=Saftescu844/844-ai
reason=deploy
status=SUCCESS
```

Railway: `Online`

Proiect staging: `resilient-harmony`.

Environment-ul din acest proiect se numește intern `production`, dar nu reprezintă proiectul real de producție.

F05 retenție: commit `a2a9c19b5fd9c79256ded6b26fa633088762b72a`, PR #52, merge în `staging` `14dd0c9bba4fad2e880937fb979f16e2010c18f6`.

Runtime cron dedicat: commit `b8f210ec702fd630e7597b3e29fc6cf63e78ddd6`, PR #53, merge în `staging` `d435f4b1c648f6fceadb5b68c566fdde065a5d30`.

Serviciul Railway `newsletter-retention` rulează zilnic la `0 3 * * *`; deploymentul `780ec4b8-ab07-46e4-93c0-81bbb9b73d66` a fost validat `SUCCESS`.

---

## 12. Smoke-test post-deployment

```text
/ro     -> HTTP 200
/admin  -> HTTP 200
RO_HTML=PASS
ADMIN_HTML=PASS
```

Input newsletter invalid:

```text
POST /api-newsletter
HTTP 400
{"ok":false,"eroare":"email_invalid"}
```

---

## 13. Starea bazei după validări

Fixture-urile AUDIT-007 au fost temporare și au fost eliminate.

Validare fixture F05: `INVENTORY_BEFORE=4`, `INVENTORY_AFTER=4`, `CLEANUP_PASS`.

Cleanup real staging: 4 înscrieri pending expirate eligibile, `deleted=4`, inventar final `0`.

Rulare idempotentă ulterioară: `[newsletter-retention] deleted=0`.

---

## 14. Concluzie

**AUDIT-007 — VALIDAT PE STAGING**

F01, F02, F03 și F05 sunt remediate și validate pe staging. F04 este remediat pentru linkurile noi, cu risc tranzitoriu limitat la compatibilitatea legacy.

Au fost confirmate 18/18 teste automate, migrarea staging/dev, deploymentul web `SUCCESS`, `/ro` și `/admin` cu `HTTP 200`, validările post-deploy F01/F03/F04, validarea runtime F05, cleanup-ul real și execuția cron `SUCCESS`.

Producția reală a rămas neatinsă.

---

## 15. Următorul pas operațional

Documentația AUDIT-007 trebuie comisă separat și integrată numai în `staging`.

Nu este necesar un deployment Railway suplimentar pentru o modificare exclusivă de documentație.

AUDIT-007 este închis pe staging. Orice promovare către producția reală necesită o decizie și o validare separată.
