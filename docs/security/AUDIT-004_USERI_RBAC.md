# AUDIT-004 — RBAC pentru Useri

**Proiect:** 844-ai.ro
**Mediu analizat:** staging/dev (`844-ai-dev`)
**Data validării tehnice:** 28 august 2026
**Statut:** validat tehnic și runtime read-only în staging/dev; deployment staging neefectuat
**Impact asupra producției:** niciunul

---

## 1. Scopul auditului

AUDIT-004 urmărește întărirea controlului de acces pentru colecția `Useri`, colecția principală de autentificare a platformei.

Auditul verifică atât regulile RBAC definite explicit în `src/collections/Useri.ts`, cât și câmpurile și operațiile de autentificare adăugate implicit de Payload CMS.

Obiectivele principale sunt:

1. limitarea accesului utilizatorilor non-admin la propriul document;
2. rezervarea operațiilor administrative pentru rolul `admin`;
3. prevenirea modificării rolurilor și nivelurilor de abonament de către utilizatori;
4. protejarea stării de verificare a emailului;
5. prevenirea eliminării ultimului administrator;
6. protejarea operațiilor Local API inclusiv când este folosit `overrideAccess`;
7. prevenirea schimbării emailului fără un flux explicit de reverificare;
8. auditarea câmpurilor auth implicite introduse de Payload CMS.

---

## 2. Principii de securitate aplicate

Implementarea respectă următoarele reguli:

* utilizatorii anonimi nu pot citi sau modifica documentele din `Useri`;
* `cititor`, `contributor` și `editor` pot citi și actualiza numai propriul document;
* `editor` poate accesa Payload Admin, dar nu primește drepturi administrative asupra colecției `Useri`;
* numai `admin` poate crea utilizatori prin configurația actuală;
* numai `admin` poate modifica `rol`;
* numai `admin` poate modifica `nivelAbonament`;
* numai `admin` poate șterge utilizatori;
* numai `admin` poate executa operația `unlock`;
* câmpurile Stripe sunt accesibile administrativ;
* starea `_verified` nu poate fi acordată manual de un utilizator propriei identități;
* ultimul administrator nu poate fi demotat sau șters prin operațiile Payload normale;
* emailul unui cont existent nu poate fi schimbat până la implementarea unui flux explicit de reverificare.

---

## 3. Fișiere modificate

Implementarea AUDIT-004 modifică în această etapă:

* `src/collections/Useri.ts`

Documentația auditului:

* `docs/security/AUDIT-004_USERI_RBAC.md`

Commit de implementare:

`dfc6af0` — `feat: harden user RBAC`

La momentul redactării acestui document:

- nu există încă Pull Request pentru AUDIT-004;
- nu a fost efectuat deployment în staging;
- producția nu a fost modificată.

---

## 4. Reguli de access control validate

### Public / anonim

Au fost validate:

* `create` → respins;
* `read` → respins;
* `update` → respins;
* `delete` → respins;
* `unlock` → respins.

Publicul nu poate accesa documentele utilizatorilor.

### Cititor

Rolul `cititor`:

* poate citi numai propriul document;
* poate actualiza numai propriul document;
* nu poate crea utilizatori;
* nu poate șterge utilizatori;
* nu poate executa `unlock`;
* nu poate modifica `rol`;
* nu poate modifica `nivelAbonament`;
* nu poate modifica `_verified`;
* nu poate modifica emailul unui cont existent.

### Contributor

Rolul `contributor`:

* poate citi numai propriul document;
* poate actualiza numai propriul document;
* nu poate crea utilizatori;
* nu poate șterge utilizatori;
* nu poate executa `unlock`;
* nu poate modifica `rol`;
* nu poate modifica `nivelAbonament`;
* nu poate modifica `_verified`;
* nu poate modifica emailul unui cont existent.

### Editor

Rolul `editor` are acces la Payload Admin, dar accesul la colecția `Useri` rămâne limitat.

Validarea reală în Payload Admin a confirmat:

* editorul vede numai propriul utilizator;
* nu vede contul administratorului;
* nu are acțiunea `Create New`;
* câmpul `Rol` nu este modificabil;
* câmpul `Nivel Abonament` nu este modificabil;
* câmpul `Nume` poate fi modificat;
* actualizarea propriului nume a fost salvată cu succes.

Editorul nu dobândește astfel privilegii administrative doar prin accesul la interfața Payload Admin.

### Admin

Rolul `admin` păstrează:

* acces complet de citire;
* drept de creare;
* drept de actualizare;
* drept de ștergere;
* drept de `unlock`;
* drept de modificare a rolurilor;
* drept de modificare a nivelurilor de abonament;
* drept de administrare manuală a `_verified`.

Protecția ultimului administrator se aplică însă inclusiv administratorilor.

---

## 5. AUDIT-004-F01 — protecția `_verified`

### Problemă identificată

Payload CMS adaugă implicit câmpul:

`_verified`

pentru colecțiile auth cu:

`verify: true`.

Auditul implementării Payload 3.85.1 a confirmat că accesul implicit al câmpului `_verified` utilizează `defaultAccess`.

În configurația inițială, un utilizator autentificat care avea drept de update asupra propriului document putea astfel modifica direct `_verified`.

Aceasta permitea ocolirea semantică a fluxului normal de verificare prin email.

### Remediere

`Useri.ts` suprascrie explicit câmpul `_verified`.

Regula nouă este:

* `create` manual → numai `admin`;
* `update` manual → numai `admin`.

Fluxul legitim de verificare prin token nu este blocat, deoarece operația internă Payload de verificare actualizează documentul direct la nivelul adaptorului DB.

### Validare

Configurația efectivă Payload a fost verificată runtime.

Rezultat:

* anonim → `create=false`, `update=false`;
* cititor → `create=false`, `update=false`;
* editor → `create=false`, `update=false`;
* admin → `create=true`, `update=true`.

**Statut F01:** REMEDIAT ȘI VALIDAT.

---

## 6. AUDIT-004-F02 — protecția ultimului administrator

### Problemă identificată

Baza `844-ai-dev` conținea la momentul auditului:

`ADMIN_COUNT=1`

Configurația inițială permitea administratorului:

* să își schimbe propriul rol;
* să își șteargă propriul cont.

Prin urmare, baza de date putea ajunge fără niciun utilizator cu:

`rol = 'admin'`.

### Remediere

A fost introdus hook-ul:

`protectLastAdminInvariant`

de tip:

`CollectionBeforeOperationHook<'useri'>`.

Hook-ul verifică operațiile:

* `update`;
* `updateByID`;
* `delete`;
* `deleteByID`.

Pentru operațiile care demotează sau șterg administratori, sunt calculate:

* numărul total de administratori existenți;
* numărul de administratori afectați de operație.

Operația este respinsă dacă ar elimina toți administratorii existenți.

Mesaj:

`Operația este blocată deoarece ar elimina ultimul administrator al platformei.`

Cod HTTP utilizat:

`409`.

---

## 7. Protecția operațiilor bulk

Auditul implementării Payload 3.85.1 a evidențiat că operațiile bulk delete procesează documentele prin promisiuni per-document.

Un simplu `beforeDelete` aplicat numai documentului curent nu era suficient pentru a evalua corect întreaga operație înainte de mutație.

Din acest motiv, protecția F02 a fost implementată la nivel de:

`beforeOperation`

unde poate fi analizat `id` sau întregul `where` al operației.

Au fost validate logic:

* demotarea singurului admin → blocată;
* ștergerea singurului admin → blocată;
* bulk demotion a tuturor adminilor → blocată;
* bulk delete a tuturor adminilor → blocată;
* demotarea unui admin când mai există alt admin → permisă;
* ștergerea unui admin când mai există alt admin → permisă;
* update obișnuit fără modificarea rolului → permis.

---

## 8. Teste F02 fără mutații DB

A fost creat un test izolat al hook-ului cu valori simulate pentru numărul de administratori.

Rezultate:

`PASS single last-admin demotion: blocked`

`PASS single last-admin deletion: blocked`

`PASS bulk demotion of all admins: blocked`

`PASS bulk deletion of all admins: blocked`

`PASS demotion when another admin remains: allowed`

`PASS delete one admin when another remains: allowed`

`PASS ordinary profile update: allowed`

Rezultat total:

**7 / 7 PASS**

Testele nu au accesat și nu au modificat baza de date.

---

## 9. Validare F02 cu baza reală — read-only

Precheck-ul executat pe `844-ai-dev` a confirmat:

`ADMIN_COUNT=1`

Contul administrativ existent a rămas neschimbat pe durata testelor.

Hook-ul F02 a fost apoi executat cu `payload.count()` real împotriva bazei de staging/dev, fără efectuarea operațiilor de update sau delete.

Rezultate:

`PASS REAL DB last-admin demotion: blocked`

`PASS REAL DB last-admin deletion: blocked`

`PASS REAL DB bulk demotion of all admins: blocked`

`PASS REAL DB bulk deletion of all admins: blocked`

`PASS REAL DB ordinary profile update: allowed`

La final:

`ADMIN_COUNT_AFTER_READONLY_TEST=1`

Testul a demonstrat că hook-ul identifică corect administratorii din baza reală fără a risca demotarea sau ștergerea contului unic.

---

## 10. Limitarea concurenței F02

Protecția implementată acoperă operațiile Payload normale individuale și bulk.

Auditul tranzacțiilor Payload/Postgres a confirmat însă o limitare importantă.

Payload 3.85.1 păstrează tranzacția Drizzle curentă asociată cu `req.transactionID`, dar helperul intern care rezolvă instanța tranzacțională:

`getTransaction`

nu este exportat prin API-ul public al `@payloadcms/drizzle`.

Utilizarea unui import intern din:

`dist/...`

a fost respinsă deoarece ar introduce dependență de internals Payload și ar fi fragilă la upgrade.

Prin urmare, F02 nu pretinde să ofere o garanție matematică împotriva situației excepționale în care două tranzacții independente și perfect concurente încearcă simultan să elimine ultimii administratori rămași.

O garanție absolută pentru acest scenariu necesită ulterior:

* locking tranzacțional suportat public;
* sau o protecție DB-level dedicată.

Această limitare este cunoscută și documentată explicit.

---

## 11. AUDIT-004-F03 — schimbarea emailului fără reverificare

### Problemă identificată

Auditul Payload 3.85.1 a confirmat că verificarea adresei de email este inițiată la crearea utilizatorului.

La creare:

* este generat `_verificationToken`;
* este trimis emailul de verificare.

Nu a fost identificată o logică echivalentă pentru update-ul adresei de email care să:

* reseteze `_verified`;
* genereze un token nou;
* declanșeze un nou flux de verificare.

În configurația inițială, un utilizator verificat putea actualiza propriul document și implicit adresa de email.

Rezultatul putea fi un cont cu:

`_verified = true`

asociat unei adrese noi care nu fusese verificată.

### Remediere

Câmpul implicit Payload `email` este suprascris selectiv în `Useri.ts`.

Regula implementată:

`update: () => false`

Emailul poate fi stabilit la creare, unde fluxul nativ de verificare Payload rămâne funcțional, dar nu mai poate fi schimbat ulterior.

Această restricție rămâne până la implementarea unui flux dedicat:

`change email → reverificare → confirmare adresă nouă`.

---

## 12. Validarea configurației efective a emailului

După override-ul câmpului `email`, configurația efectivă Payload a fost inspectată runtime.

Au fost confirmate:

`type=email`

`required=true`

`unique=true`

`hasValidate=true`

`beforeChangeHooks=1`

Prin urmare, override-ul nu a eliminat:

* caracterul obligatoriu al emailului;
* unicitatea;
* validatorul Payload;
* hook-ul nativ de normalizare lowercase/trim.

Accesul efectiv pentru update este:

* anonim → `false`;
* cititor → `false`;
* editor → `false`;
* admin → `false`.

**Statut F03:** REMEDIAT ȘI VALIDAT.

---

## 13. Auditul câmpurilor auth implicite Payload

Au fost inspectate sistematic câmpurile auth adăugate de Payload 3.85.1.

Au fost verificate:

`_verified`

`_verificationToken`

`resetPasswordToken`

`resetPasswordExpiration`

`salt`

`hash`

`loginAttempts`

`lockUntil`

`sessions`

Pentru câmpurile sensibile, Payload aplică deja protecții native.

Au fost confirmate:

* `_verificationToken` → `create=false`, `update=false`;
* `resetPasswordToken` → `create=false`, `update=false`;
* `resetPasswordExpiration` → `create=false`, `update=false`;
* `salt` → `create=false`, `update=false`;
* `hash` → `create=false`, `update=false`;
* `loginAttempts` → `create=false`, `update=false`;
* `lockUntil` → `create=false`, `update=false`;
* `sessions` → update direct dezactivat.

Nu au fost identificate alte vulnerabilități RBAC în aceste câmpuri în cadrul auditului curent.

---

## 14. Verificări tehnice

După modificările F01, F02 și F03 au fost executate:

`pnpm exec tsc --noEmit --pretty false`

Rezultat:

**PASS**

A fost executat:

`git diff --check`

Rezultat:

**PASS**

Working tree la finalul validării tehnice:

`M src/collections/Useri.ts`

Nu există alte modificări de cod în working tree asociate AUDIT-004.

Baza `844-ai-dev` a fost reverificată după testele F02.

Rezultat:

`ADMIN_COUNT=1`

Administratorul existent a rămas neschimbat.

---

## 15. Starea deploymentului

La momentul acestei documentări:

* AUDIT-004 este pe branch-ul `audit/audit-004-useri-rbac`;
- implementarea de cod este comisă în `dfc6af0` — `feat: harden user RBAC`;
- nu există încă Pull Request;
* nu a fost făcut merge în `staging`;
* producția nu a fost modificată.

Prin urmare, statutul actual nu este încă:

`VALIDAT PE STAGING`

în sensul unui deployment real.

Validarea realizată până acum este tehnică și runtime read-only folosind baza `844-ai-dev`.

---

## 16. Concluzie

AUDIT-004 confirmă că modelul RBAC al colecției `Useri` a fost întărit în trei zone importante.

F01 împiedică utilizatorii să își acorde singuri starea de email verificat prin modificarea `_verified`.

F02 împiedică operațiile Payload individuale și bulk să elimine ultimul administrator rămas.

F03 împiedică schimbarea adresei unui cont deja verificat fără un flux explicit de reverificare.

Rolurile non-admin rămân limitate la propriul document și nu pot modifica rolul, nivelul de abonament sau alte câmpuri administrative.

Câmpurile auth implicite Payload au fost auditate separat și nu au evidențiat alte probleme RBAC care necesită remediere în această etapă.

**Statut tehnic AUDIT-004:** VALIDAT ÎN STAGING/DEV — DEPLOYMENT STAGING ÎNCĂ NEEXECUTAT.

---

## 17. Follow-up

Rămân două follow-up-uri tehnice documentate.

Primul este implementarea unui flux controlat de schimbare a adresei de email:

`request email change → verificare adresă nouă → activare adresă nouă`.

Al doilea este evaluarea unei garanții DB-level sau a unui mecanism public de locking tranzacțional pentru protejarea invariantului ultimului administrator inclusiv în cazul tranzacțiilor independente perfect concurente.

Aceste follow-up-uri nu blochează validarea tehnică actuală a AUDIT-004, dar trebuie reconsiderate înaintea unor extinderi viitoare ale sistemului de administrare a utilizatorilor.

Orice modificare ulterioară trebuie testată mai întâi în staging înainte de promovarea în producție.
