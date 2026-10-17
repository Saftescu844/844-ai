# PR #259 — Procedura controlată de promovare în producție

**Stare la 16 octombrie 2026: DRAFT / NO-GO operațional.** Acest document este un plan de execuție și audit. **Nu acordă permisiunea** de dezactivare a automatizărilor, merge, deploy, migrare, restaurare sau modificare de date. Orice etapă operațională viitoare cere aprobare explicită separată. Fără acțiuni distructive automate.

**Referințe:** [PR #259](https://github.com/Saftescu844/844-ai/pull/259); [CI #38884230913](https://github.com/Saftescu844/844-ai/actions/runs/38884230913); [npm audit #38884230896](https://github.com/Saftescu844/844-ai/actions/runs/38884230896); [Docker #38884230891](https://github.com/Saftescu844/844-ai/actions/runs/38884230891).

## A. Identitatea precisă a mediilor — nu confunda numele Railway

| Mediu | Identificator | Serviciu | Sursa actuală |
| --- | --- | --- | --- |
| Producție | Railway project `believable-intuition`, `54c46ab1-ebab-491c-bdbe-571a3fce9ceb`; env `12b22bbd-469f-4cb8-b418-cc2c8e40af6d` | `844-ai`, `c58d786c-cf78-4276-9dea-bb54a8a66012` | `main`, `08f4ffb6e5baffed9c190f922adade3434ac6994` |
| Staging | Railway project `resilient-harmony`, `44c37d0f-b300-4462-b001-31259ddae5dd`; env `a589dc28-1c59-468c-9eb4-351fce8fa17b` | `844-ai`, `e113e429-e2a9-4271-b0a4-6554233037ee` | `staging`, `15ab49c367a91235bec640e18391b09137820d1d` |

**Atenție:** environmentul Railway din **proiectul staging** se numește intern `production`. Numele environmentului NU stabilește dacă baza este reală; folosește întotdeauna project ID.

- Supabase producție: `hyapqvnubhwkwmwudeit`; Supabase staging: `tvtnpcqawaekhmhyfrnc`. Bucket `media` separat.
- Deployment de producție cunoscut bun: `ca4b9db6-616f-4d33-92d1-72e5992c47a6` (SUCCESS, rollback disponibil la audit).
- Deployment staging validat: `b08ae22e-0ec6-4690-9513-c5da4d558e04` (SUCCESS; `npm ci`, healthcheck, interfață RO/EN).
- Serviciul auxiliar `flash-rss-production-once` este fixat separat la `ae1cf95` și execută numai mesajul inert `FLASH_RSS_PRODUCTION_ONE_SHOT_READY_NO_RUN`. Nu îl reporni/repinia în această lansare.
- **Orice SHA, backup și stare trebuie recitite imediat înainte de fereastra reală.** PR #256 rămâne independent și nu intră în release-ul de securitate.

## B. Ce se promovează și ce a fost demonstrat

PR #259 (HEAD auditat `0593f97b8a07c1866c94997ff1b93ce2d87b1790`):
- Next.js `16.4.2`, Payload `3.91.0` și componentele aferente; Node publisher `22.17.0`.
- Docker: `COPY .npmrc ./`, instalare reproductibilă `npm ci`, fără upgrade forțat npm 11; nou control Docker read-only.
- Două migrații Payload aditive, fără actualizarea sau ștergerea datelor: `20261011_182500_payload_auth_reset_requested_at` și `20261013_000001_payload_media_objectkey_compat`.
- Testele pe HEAD: 1325/1325 integrare, migrații pe DB efemeră și simularea migrării din producție, ACL, lint, Next.js build, Docker dependencies și npm audit — toate SUCCESS.
- Staging separat a trecut 1441/1441 teste, deployment + readiness și verificările manuale ale Admin, autentificării, Flash AI și afișării RO/EN.
- Inventar npm pe PR: **18 în total (0 critice, 13 ridicate, 5 moderate)**; `npm audit --omit=dev` identifică 15 în arborele de producție (10 ridicate, 5 moderate). Acestea **NU sunt rezolvate integral**.
- Docker runtime copiază `node_modules` din etapa deps, inclusiv biblioteci folosite la build/migrare; clasificarea `--omit=dev` nu înseamnă automat că alte pachete lipsesc fizic din imagine. O constatare în inventar nu dovedește singură o cale de exploatare externă.

**Decizie de securitate obligatorie:** clasifică advisories rămase după exploatabilitate reală și decide explicit acceptarea temporară sau amânarea release-ului. Nu utiliza `npm audit fix --force`, downgrade incompatibil sau eliminarea nechibzuită a dependențelor CLI folosite la migrare.

## C. Baza de date reală: istoricul actual diferă de runbookurile istorice

La verificarea read-only: producție are **25 rânduri în `payload_migrations`**, fără markerul vechi `dev/-1`, și **niciuna** dintre cele două migrații noi. Lipsesc coloanele `useri.reset_password_requested_at` și `media._objectkey`. Staging are **27 migrații**, inclusiv cele două.

**NU rula scriptul istoric `db:production:onboarding` / `production-cutover-onboarding.ts`**. Acesta a fost creat pentru o etapă anterioară, când registrul de migrații nu era inițializat; condițiile lui nu mai corespund producției actuale. Și pasajele vechi care susțin că Railway nu are Pre-deploy sunt depășite.

Configurația Railway de producție **verificată**, serviciul corect `844-ai`, are `preDeployCommand: ["npm run db:migrate:up"]`. Scriptul npm setează `PAYLOAD_DB_PUSH=false`, iar configurația Payload folosește `process.env.DATABASE_URL` și `prodMigrations`. Nu inventa și nu executa separat SQL de migrare.

Înainte de lansare trebuie să fie dovedite toate:
1. Conexiunea Railway de producție țintește **exact** proiectul Supabase prod; utilizatorul PostgreSQL are drepturi autorizate pentru DDL, conform regulilor SEC-001. Nu afișa și nu copia secrete în jurnal.
2. `PAYLOAD_DB_PUSH` nu este `true`; verifică valoarea în UI fără a o publica.
3. Registrul are exact cele 25 migrații existente; ultimele nume și cele două coloane lipsă coincid cu baseline-ul.
4. Diferența de migrații a PR-ului este exclusiv **două operațiuni ADD COLUMN IF NOT EXISTS**. Dacă apar modificări suplimentare, STOP și audit nou.
5. CI pe **HEAD-ul real al PR-ului** este verde și simulează același set de migrații.

## D. Backupuri și limita reală de recuperare

Confirmate la **16 octombrie 2026**:
- Captura utilizatorului: backup fizic Supabase prod la **01:23:13 UTC**, buton **Restore** disponibil, plus backupul precedent.
- [GitHub Database Backup run #38861661410](https://github.com/Saftescu844/844-ai/actions/runs/38861661410): SUCCESS la ~06:31–06:32 UTC, artefact criptat `db-backup-38861661410`, aproximativ 3,39 MB, retenție 90 de zile; decriptarea și catalogul `pg_restore` au fost verificate.
- Backupul GitHub cuprinde schema PostgreSQL `public`, nu și obiectele Supabase Storage. Backupul fizic nu restaurează fișierele Storage.
- Disponibilitatea butonului Restore și citirea catalogului **NU** înseamnă restaurare efectivă în acea zi. Testul real de restaurare dintr-o etapă anterioară nu garantează un backup ulterior.

**În ziua efectivă a promovării:** reconfirmă în UI un backup fizic proaspăt, ora exactă, Restore disponibil și backupul criptat recent cu verificări verzi. Definește pierderea maximă tolerată de date (RPO). Dacă backupul este vechi comparativ cu înregistrările, comentariile, newsletterul sau alte scrieri, nu presupune recuperare fără pierderi; replanifică fereastra/backupul sau obține aprobare distinctă pentru acel risc. Nu presupune PITR disponibil fără verificare explicită.

Evită încărcările/ștergerile în `media` în perioada de release și notează eventualele obiecte schimbate după backup; recuperarea DB și fișierelor Storage poate necesita reconciliere separată.

**Nu apăsa Restore, nu crea un backup manual și nu restaura nimic fără o aprobare specifică acelor acțiuni.**

## E. Automatizări și înghețarea controlată a ferestrei

1. Documentul `docs/ENVIRONMENTS.md` spune că **Railway Auto Deploy este activ pentru `main`**. Conexiunea de producție indică în continuare `main`. **Înainte de merge** trebuie verificată starea efectivă Auto Deploy în dashboard, apoi stabilită explicit suspendarea lui cu aprobare separată, astfel încât merge-ul și deploymentul să poată fi aprobate/verificate distinct.
2. Auto-Publisher este un workflow GitHub Actions **scheduled pe ramura implicită**. Cron-urile exacte sunt **05:00, 11:00, 13:00 și 17:00 UTC**, zilnic. Comentariile vechi despre orele României pot fi inexacte la trecerea dintre ora de vară și cea de iarnă.
3. **GitHub Actions scheduled runs pot porni târziu**; s-a observat o pornire la 09:26 UTC, în afara orelor nominale. Nu te baza exclusiv pe intervale presupus libere.
4. Cu aprobare separată, dezactivează temporar **numai** workflow-ul GitHub `Auto-Publisher 844-ai.ro`; verifică faptul că este dezactivat și că **nu există execuții în curs/în coadă**. Nu dezactiva `Database Backup 844-ai.ro` și nu modifica automat secretul `DATABASE_URL`.
5. Planifică o pauză editorială și de media; verifică și scrierile publice care pot continua (conturi, comentarii, newsletter). Decide modul de protejare a datelor sau acceptă explicit fereastra de risc; fără promisiunea că site-ul este complet read-only.
6. Serviciul Railway `flash-rss-production-once` rămâne inert, pin-uit și neschimbat.
7. **Dacă nu se poate confirma suspendarea Auto Deploy și lipsa joburilor Auto-Publisher active, STOP.** Nu da aprobarea de merge presupunând că deploy-ul nu va porni.

## F. Ordinea viitoare de execuție — numai după aprobări punctuale

### F1. Preflight read-only / GO gate
- Confirmă domeniul oficial, funcționarea `/ro`, `/en`, `/api-health/ready`, lista articolelor, login Admin și citirea unui Flash AI fără modificări.
- Înregistrează baseline: SHA GitHub `main`, HEAD PR #259, deployment Railway anterior `ca4b9db6`, backupurile din acea zi, 25 migrații și schema pre-migrare; confirmă că backupul și deploymentul precedent sunt restaurabile.
- Confirmă că PR #256 este separat, că #259 nu conține modificări neașteptate și că toate controalele GitHub pe HEAD sunt verzi.
- Înregistrează riscurile security rămase (10 high + 5 moderate în arborele de producție) și decizia explicită de acceptare/amânare.
- Confirma că niciun publisher/backup job nu rulează simultan cu migrările; backupul zilnic nu se dezactivează.
- Obține aprobare pentru **pauzele temporare** ale automatizărilor și separat pentru **merge**, **deploy** și orice **restaurare**. Un acord general de discuție nu este aprobare de operațiuni în producție.

### F2. Izolare aprobată înainte de merge
- Numai după aprobarea explicită: confirmă/controlează Auto Deploy al serviciului corect în Railway **producție**; nu confunda proiectul staging al cărui environment se numește tot `production`.
- Numai după aprobarea explicită: suspendă Auto-Publisher în Actions și confirmă 0 joburi în desfășurare.
- Revalidează backupurile și fereastra de recuperare. Dacă s-a schimbat `main`, HEAD PR sau istoricul migrărilor, revino la audit.
- Nu lansa nicio migrare manuală și nu modifica scripturile de pre-deploy.

### F3. Merge controlat, apoi deployment separat
- Când utilizatorul aprobă expres: treci PR #259 în Ready și efectuează merge în `main` pe SHA-ul revizuit.
- Confirmă **imediat** dacă Railway nu a pornit automat un deploy. Dacă a pornit neintenționat, oprește operațiunea conform opțiunilor disponibile și tratează ca incident, nu presupune că simpla dorință de pauză a fost aplicată.
- Obține apoi **aprobare separată pentru deploymentul manual al commitului final de merge**. În Railway, verifică proiectul, serviciul, commitul fixat și faptul că nu există alte modificări pregătite.
- Înainte de pornire, read-only: confirmă 25 migrații și cele două coloane absente; verifică încă o dată disponibilitatea backupului.
- Railway rulează **o singură dată** comanda existentă `npm run db:migrate:up` în Pre-deploy. Monitorizează exit code și numele exact al celor două migrații; dacă Pre-deploy eșuează, **STOP** — nu forța pornirea aplicației.
- Confirmă că noul deployment a devenit SUCCESS, 1/1 replică Online, `/api-health/ready` trece și versiunea instalată este exact cea aprobată.

### F4. Control post-deploy
- Read-only DB: **27 migrații** în total, exact noile două nume o singură dată fiecare; `useri.reset_password_requested_at` și `media._objectkey` prezente.
- UI: `/ro`, `/en`, comutare, un articol public cu pereche RO/EN, căutare, media publice (citire), autentificare Payload Admin, liste Articole/Flash AI și excerpt/stare editorială.
- Confirmă că drafturile nu apar public. Nu publica și nu modifica articole pentru a proba regula editorială, fără aprobare distinctă de test funcțional.
- Monitorizează loguri, 5xx, crashuri, acces DB și erori media. Confirmă că serviciul one-shot inert și PR #256 sunt neatinse.
- Numai după semnarea rezultatelor: obține aprobare pentru **reactivarea Auto-Publisher**; observă prima rulare ulterioară și verifică faptul că creează numai drafturi pentru revizuire. Decide separat reactivarea Auto Deploy.
- Dacă oricare dintre controalele obligatorii eșuează, nu declara GO.

## G. Rollback și incidente

**Nu executa niciun rollback sau Restore fără o aprobare expresă privind riscurile.**

1. **Eșec Docker/build înainte de Pre-deploy:** păstrează serviciul curent; nu modifica DB și nu reactiva automatizările până la diagnostic. Revert/înlocuire numai la decizie explicită.
2. **Eșec în Pre-deploy/migrare:** oprește promovarea. Verifică exact migrările deja înregistrate, coloanele și tranzacțiile. Nu reporni orb CLI-ul, nu rula `db:migrate:down` și nu executa DDL manual.
3. **Noua aplicație eșuează după migrările aditive:** opțiunea preferată este **rollback de cod** la deploymentul bun cunoscut `ca4b9db6`, păstrând provizoriu coloanele noi, dacă compatibilitatea este confirmată. Nu elimina coloanele prin `down`; ele sunt aditive.
4. **DB sau date compromise/incompatibile:** restaurarea bazei din Supabase este măsură **ultima instanță**, cu aprobare separată, impact asupra scrierilor după timestampul backupului și plan de sincronizare Storage. Restaurarea fizică nu este echivalentă cu revenirea containerului Railway.
5. La incident: păstrează pauza Auto-Publisher, logurile, SHA-urile, deployment ID, starea migrărilor și timestampurile; comunică explicit impactul și ruta de recuperare.

## H. Decizii deschise (NU aproba implicit)

- [ ] Verificare fresh backup fizic Supabase **la data reală a lansării**, Restore disponibil și risc RPO evaluat.
- [ ] Backup criptat GitHub recent, validat; strategie Storage și eventuale scrieri în timpul ferestrei.
- [ ] Verificare și aprobare distinctă pentru suspendarea temporară Railway Auto Deploy.
- [ ] Verificare și aprobare distinctă pentru suspendarea temporară a workflow-ului Auto-Publisher.
- [ ] Confirmare rol SQL potrivit pentru migrări, valoarea `PAYLOAD_DB_PUSH=false` și ținta Supabase prod.
- [ ] Confirmare exact două migrații pending, toate testele verzi pe commitul final.
- [ ] Evaluare/acceptare explicită a vulnerabilităților ridicate și moderate rămase.
- [ ] Aprobare explicită pentru trecerea PR #259 în Ready și pentru merge `main`.
- [ ] Aprobare separată pentru deployment și, dacă e nevoie, rollback/Restore.
- [ ] Verificări post-deploy și aprobare pentru reactivarea publisherului/Auto Deploy.

**NO-GO implicit până când toate porțile relevante sunt îndeplinite.** Runbookul descrie acțiuni viitoare, dar nu le autorizează.

## I. Documente istorice și prioritatea adevărului operațional

Documentele `docs/PRODUCTION_CUTOVER_RUNBOOK.md` și `docs/PRODUCTION_PROMOTION_READINESS.md` descriu cutoverul inițial din septembrie, cu baseline vechi. `docs/DATABASE_MIGRATIONS.md` are unele paragrafe istorice care presupun absența Pre-deploy. Pentru PR #259, **starea reală Railway și `payload_migrations` recitite la momentul lansării prevalează**. Nu executa din aceste documente istorice pașii de onboarding sau de migrare nerelevanți.
