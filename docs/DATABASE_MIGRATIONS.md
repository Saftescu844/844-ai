# Migrații Payload/PostgreSQL

Acest document descrie fluxul controlat de modificare a schemei PostgreSQL pentru proiectul 844-ai.ro.

Nu se salvează în acest document parole, chei API, connection string-uri sau alte secrete.

---

## 1. Principii

* Modificările schemei se testează mai întâi în staging.
* Staging și producția folosesc baze PostgreSQL diferite.
* `PAYLOAD_DB_PUSH` trebuie să fie dezactivat în staging și producție.
* Nu se modifică manual schema în Supabase atunci când modificarea poate fi exprimată printr-o migrare.
* Fiecare migrare trebuie să conțină atât funcția `up`, cât și funcția `down`.
* Codul migrării se inspectează înainte de aplicare.
* Nu se rulează migrări fără confirmarea proiectului Supabase conectat.
* Nu se rulează `migrate:fresh`, `migrate:reset` sau alte comenzi distructive pe staging ori producție.

---

## 2. Mediile bazei de date

### Staging

* Supabase project: `844-ai-dev`
* Project reference: `tvtnpcqawaekhmhyfrnc`
* Git branch: `staging`

### Producție

* Supabase project: `844-ai-prod`
* Project reference: `hyapqvnubhwkwmwudeit`
* Git branch: `main`

Înainte de orice migrare se confirmă că `DATABASE_URL` indică mediul corect. Parola și connection string-ul complet nu se afișează și nu se salvează în Git.

---

## 3. Versiunile de lucru

Versiunile proiectului sunt definite prin `.nvmrc`, `package.json` și lockfile.

Versiunea Node verificată pentru proiect:

```text
22.17.0
```

Activarea mediului:

```bash
nvm use
corepack enable
```

Verificarea versiunilor:

```bash
node -v
pnpm -v
```

---

## 4. Verificarea bazei selectate

Comanda următoare afișează numai informațiile nesensibile ale conexiunii:

```bash
node --input-type=module <<'NODE'
const raw = process.env.DATABASE_URL

console.log('NODE_ENV:', process.env.NODE_ENV || '(nesetat)')
console.log('PAYLOAD_DB_PUSH:', process.env.PAYLOAD_DB_PUSH || '(nesetat)')

if (!raw) {
  console.log('DATABASE_URL: LIPSEȘTE')
  process.exit(1)
}

const url = new URL(raw)
const username = decodeURIComponent(url.username)

const directRef =
  url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i)?.[1]

const poolerRef =
  username.match(/^postgres\.([a-z0-9]+)$/i)?.[1]

console.log('DB host:', url.hostname)
console.log('DB port:', url.port || '(implicit)')
console.log('DB name:', decodeURIComponent(url.pathname.replace(/^\//, '')))
console.log('Supabase project ref:', directRef || poolerRef || '(nedetectat)')
NODE
```

Pentru staging trebuie să apară:

```text
tvtnpcqawaekhmhyfrnc
```

Dacă apare referința producției, operația se oprește.

---

## 5. Verificarea stării migrărilor

```bash
PAYLOAD_DB_PUSH=false NODE_ENV=production \
pnpm payload migrate:status
```

Se verifică:

* migrările marcate `Ran: Yes`;
* migrările marcate `Ran: No`;
* batch-ul fiecărei migrări;
* inexistența unor migrări necunoscute sau neașteptate.

Baseline-ul verificat al proiectului este:

```text
20260730_185012_baseline_current_schema
```

Acesta este înregistrat în baza de staging ca aplicat în `Batch 1`.

---

## 6. Crearea unei migrări

După modificarea controlată a configurației Payload:

```bash
PAYLOAD_DB_PUSH=false NODE_ENV=production \
pnpm payload migrate:create numele_migrarii --skip-empty
```

`numele_migrarii` trebuie să fie descriptiv și să folosească litere mici și underscore.

Exemplu:

```bash
PAYLOAD_DB_PUSH=false NODE_ENV=production \
pnpm payload migrate:create add_article_summary --skip-empty
```

Dacă nu există diferențe de schemă, `--skip-empty` nu generează o migrare goală.

---

## 7. Inspectarea migrării

Înainte de aplicare:

```bash
git status --short
git diff --check
```

Se inspectează fișierul TypeScript generat:

```bash
sed -n '1,240p' src/migrations/<fisier_migrare>.ts
```

Se verifică în special:

* ce tabele, coloane, tipuri și indexuri sunt create;
* dacă există comenzi `DROP`;
* dacă funcția `down` inversează corect funcția `up`;
* dacă migrarea atinge numai structurile intenționate;
* dacă snapshot-ul JSON și `src/migrations/index.ts` au fost actualizate.

Fișierele noi care nu sunt încă urmărite de Git nu apar în `git diff` obișnuit. Ele trebuie deschise și verificate separat.

---

## 8. Aplicarea în staging

Înainte de aplicare se rulează din nou:

```bash
PAYLOAD_DB_PUSH=false NODE_ENV=production \
pnpm payload migrate:status
```

Aplicarea migrărilor restante:

```bash
PAYLOAD_DB_PUSH=false NODE_ENV=production \
pnpm payload migrate
```

După aplicare:

```bash
PAYLOAD_DB_PUSH=false NODE_ENV=production \
pnpm payload migrate:status
```

Migrarea nouă trebuie să apară cu:

```text
Ran: Yes
```

După aplicare se testează:

* pornirea aplicației;
* autentificarea în Payload;
* colecțiile afectate;
* crearea, citirea și actualizarea datelor relevante;
* logurile aplicației și ale bazei de date.

---

## 9. Rollback în staging

Înainte de rollback se verifică exact ce migrări fac parte din ultimul batch:

```bash
PAYLOAD_DB_PUSH=false NODE_ENV=production \
pnpm payload migrate:status
```

Rollback-ul ultimului batch:

```bash
PAYLOAD_DB_PUSH=false NODE_ENV=production \
pnpm payload migrate:down
```

După rollback:

```bash
PAYLOAD_DB_PUSH=false NODE_ENV=production \
pnpm payload migrate:status
```

Se verifică:

* migrarea retrasă apare `Ran: No`;
* migrările din batch-urile anterioare rămân aplicate;
* structurile create de funcția `up` au fost eliminate sau restaurate corect;
* aplicația continuă să funcționeze.

Nu se rulează `migrate:down` dacă ultimul batch conține și alte migrări care nu trebuie retrase.

---

## 10. Promovarea către producție

O migrare poate fi promovată numai după:

1. inspectarea codului;
2. aplicarea cu succes în staging;
3. testarea aplicației;
4. testarea rollback-ului atunci când acesta este sigur;
5. commit și Pull Request către `staging`;
6. deployment și validare în staging;
7. promovarea controlată către `main`;
8. existența unui backup recent al producției;
9. verificarea variabilelor Railway pentru producție;
10. aprobarea explicită a aplicării migrării.

În producție se rulează mai întâi `migrate:status`. Migrarea se aplică separat și controlat înainte de pornirea versiunii de cod care depinde de noua schemă, cu excepția situațiilor în care este implementat și verificat un mecanism dedicat de pre-deployment.

---

## 11. Comenzi interzise fără procedură specială

Nu se execută pe staging sau producție:

```text
migrate:fresh
migrate:reset
migrate:refresh
```

Nu se activează:

```text
PAYLOAD_DB_PUSH=true
```

Orice operație de ștergere sau reconstrucție completă a schemei necesită backup verificat, plan separat și aprobare explicită.

---

## 12. Testul DB-001 efectuat

La 31 iulie 2026 a fost verificat cu succes în staging următorul flux:

1. verificarea baseline-ului;
2. generarea unei migrări temporare;
3. confirmarea stării `Ran: No`;
4. aplicarea migrării în `Batch 2`;
5. confirmarea stării `Ran: Yes`;
6. rollback-ul ultimului batch;
7. confirmarea revenirii la `Ran: No`;
8. ștergerea migrării temporare;
9. restaurarea indexului migrărilor;
10. confirmarea unui repository curat.

Migrarea temporară a creat și apoi a eliminat tabela tehnică:

```text
db001_reversible_probe
```

Producția nu a fost accesată și nu a fost modificată în timpul testului.
