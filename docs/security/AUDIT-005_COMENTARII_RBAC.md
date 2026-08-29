# AUDIT-005 — RBAC pentru Comentarii

**Proiect:** 844-ai.ro  
**Mediu analizat:** staging/dev (`844-ai-dev`)  
**Data validării tehnice:** 28 august 2026  
**Data validării pe staging:** 28 august 2026  
**Statut:** VALIDAT PE STAGING  
**Impact asupra producției:** niciunul

---

## 1. Scopul auditului

AUDIT-005 urmărește întărirea controlului de acces și a integrității relaționale pentru colecția `Comentarii`.

Auditul verifică atât regulile RBAC existente, cât și relațiile dintre:

* comentariu și autor;
* comentariu și articol;
* răspuns și comentariul părinte;
* comentarii și operațiile de ștergere asupra utilizatorilor și articolelor.

Obiectivele principale sunt:

1. prevenirea comentariilor pe articole nepublicate de către utilizatorii non-admin;
2. prevenirea răspunsurilor către comentarii neaprobate;
3. prevenirea răspunsurilor între comentarii aparținând unor articole diferite;
4. garantarea server-side a autorului real al comentariului;
5. garantarea stării inițiale de moderare pentru comentariile non-admin;
6. protejarea integrității relaționale la ștergerea utilizatorilor;
7. protejarea integrității relaționale la ștergerea articolelor;
8. validarea comportamentului atât izolat, cât și runtime pe baza reală de staging/dev.

---

## 2. Principii de securitate aplicate

Implementarea respectă următoarele reguli:

* utilizatorii anonimi nu pot crea comentarii;
* orice utilizator autentificat poate crea un comentariu;
* numai administratorii pot actualiza sau șterge comentarii;
* utilizatorii non-admin văd numai comentariile cu `status = aprobat`;
* administratorii pot vedea toate stările de moderare;
* utilizatorii non-admin pot comenta numai articole publicate;
* administratorii pot comenta și articole aflate în alte stări editoriale;
* utilizatorii non-admin pot răspunde numai comentariilor aprobate;
* un răspuns trebuie să aparțină aceluiași articol ca părintele său;
* administratorul poate răspunde comentariilor indiferent de starea lor de moderare, dar numai în cadrul aceluiași articol;
* pentru comentariile create de utilizatori non-admin, `autor` este impus server-side din `req.user`;
* pentru comentariile create de utilizatori non-admin, `status` este impus server-side la `asteptare`;
* numai administratorii pot furniza sau modifica manual `autor`;
* numai administratorii pot furniza sau modifica manual `status`;
* un utilizator nu poate fi șters cât timp există comentarii asociate;
* un articol nu poate fi șters cât timp există comentarii asociate.

---

## 3. Fișiere modificate

Implementarea AUDIT-005 modifică:

* `src/collections/RestulColectiilor.ts`
* `src/collections/Useri.ts`
* `src/collections/Articole.ts`

Documentația auditului:

* `docs/security/AUDIT-005_COMENTARII_RBAC.md`

Commit de implementare:

`9fae8ad` — `feat: harden comments RBAC`

Pull Request:

`#46` — `feat: harden comments RBAC`

Merge în `staging`:

`b3d5920` — `Merge pull request #46 from Saftescu844/audit/audit-005-comentarii-rbac`

Deployment Railway staging validat:

`590fa726-ebc1-41a0-850a-d6274236ac5c`

Status deployment:

`SUCCESS`

Producția nu a fost modificată.

---

## 4. Reguli de access control validate

### Public / anonim

Pentru colecția `Comentarii`:

* `create` → respins;
* `read` → numai comentarii aprobate;
* `update` → respins;
* `delete` → respins.

Publicul nu poate crea sau modera comentarii.

### Cititor

Rolul `cititor`:

* poate crea comentarii;
* poate comenta numai articole publicate;
* poate răspunde numai comentariilor aprobate;
* poate răspunde numai în cadrul aceluiași articol;
* nu poate alege un alt autor;
* nu poate seta direct starea de moderare;
* comentariul creat este atribuit automat utilizatorului curent;
* comentariul creat intră automat în `asteptare`;
* nu poate actualiza comentarii;
* nu poate șterge comentarii.

### Contributor

Rolul `contributor` urmează aceleași reguli de comentare ca `cititor`.

Poate crea comentarii numai în cadrul conținutului publicat și nu poate controla manual autorul sau starea de moderare.

### Editor

Rolul `editor` urmează aceleași reguli de creare ca celelalte roluri non-admin:

* poate comenta numai articole publicate;
* poate răspunde numai comentariilor aprobate;
* nu poate crea reply-uri între articole diferite;
* nu poate seta manual `autor`;
* nu poate seta manual `status`;
* nu primește drept de moderare asupra colecției `Comentarii`.

Accesul său la Payload Admin nu îi acordă implicit privilegii de moderare.

### Admin

Rolul `admin` păstrează:

* acces complet de citire;
* drept de creare;
* drept de actualizare;
* drept de ștergere;
* drept de modificare a stării de moderare;
* drept de alegere sau modificare a autorului;
* drept de comentare și pe articole nepublicate;
* drept de reply către comentarii aflate în orice stare de moderare.

Regula de integritate:

`comentariul părinte trebuie să aparțină aceluiași articol`

se aplică inclusiv administratorilor.

---

## 5. AUDIT-005-F01 — integritatea relației `raspunsLa`

### Problemă identificată

Configurația inițială a relației:

`raspunsLa`

permitea referirea unui comentariu existent fără verificarea a două reguli de business importante:

1. comentariul părinte să aparțină aceluiași articol;
2. pentru utilizatorii non-admin, comentariul părinte să fie deja aprobat.

Astfel, un client care cunoștea ID-ul altui comentariu putea încerca:

* reply către un comentariu aflat încă în moderare;
* reply către un comentariu aparținând altui articol.

Problema era server-side, nu doar una de interfață.

### Remediere

Câmpul `raspunsLa` utilizează acum `filterOptions`.

Articolul curent este extras din:

`data.articol`

indiferent dacă valoarea este ID simplu sau obiect populat.

Dacă articolul nu poate fi determinat:

`filterOptions` returnează `false`.

Pentru administrator:

* comentariul părinte trebuie să aparțină aceluiași articol;
* starea de moderare a părintelui nu este restricționată.

Pentru non-admin:

* comentariul părinte trebuie să aparțină aceluiași articol;
* `status` trebuie să fie `aprobat`.

### Validare

Testele izolate au confirmat:

* articol lipsă → `false`;
* non-admin → același articol + `status=aprobat`;
* admin → același articol;
* obiect relațional populat → procesat corect.

Testarea runtime în `844-ai-dev` a confirmat:

* reply către comentariu în `asteptare` → blocat `400`;
* reply către comentariu aprobat din același articol → permis;
* reply către comentariu aprobat din alt articol → blocat `400`.

**Statut F01:** REMEDIAT ȘI VALIDAT PE STAGING.

---

## 6. AUDIT-005-F02 — comentarii pe articole nepublicate

### Problemă identificată

Relația:

`articol`

nu avea inițial o restricție care să limiteze utilizatorii non-admin la articole publicate.

Prin urmare, un utilizator autentificat care cunoștea ID-ul unui articol nepublicat putea încerca să creeze un comentariu asociat acelui document.

La momentul inventarului inițial al bazei:

`DRAFT=0`

`PUBLISHED=1`

Prin urmare, problema era configurațională și latentă în datele existente, dar regula de securitate lipsea.

### Remediere

Relația `articol` utilizează acum `filterOptions`.

Pentru `admin`:

`true`

Administratorul poate selecta orice articol.

Pentru toate rolurile non-admin:

`_status = published`

Prin urmare, numai articolele publicate sunt ținte valide pentru comentarii non-admin.

### Validare

Testele izolate au confirmat:

* anonim → published-only;
* cititor → published-only;
* contributor → published-only;
* editor → published-only;
* admin → fără filtrare suplimentară.

În testarea runtime a fost creat controlat un articol temporar cu:

`_status = draft`

Un utilizator temporar `cititor` a încercat să creeze un comentariu pe acel articol.

Rezultat:

`PASS non-admin comment on draft article: blocked 400`

Au fost create separat două articole temporare și publicate explicit prin:

`_status = published`

pentru testele pozitive și de cross-article.

**Statut F02:** REMEDIAT ȘI VALIDAT PE STAGING.

---

## 7. Protecția câmpurilor `autor` și `status`

### Problemă identificată

Configurația inițială avea deja un hook `beforeValidate` care, la creare de către non-admin:

* suprascria `autor` cu `req.user.id`;
* suprascria `status` cu `asteptare`.

Această protecție server-side era corectă.

Totuși, câmpurile puteau rămâne disponibile aparent pentru furnizare în request sau în interfața administrativă, ceea ce crea o discrepanță între posibilitatea aparentă de editare și politica reală.

### Remediere

Pentru `autor` a fost adăugat field access:

* `create` → numai `admin`;
* `update` → numai `admin`.

Pentru `status` a fost adăugat field access:

* `create` → numai `admin`;
* `update` → numai `admin`.

Hook-ul existent rămâne în vigoare ca mecanism trusted server-side pentru non-admin.

Astfel sunt păstrate două straturi distincte:

1. field-level access elimină valorile nepermise;
2. hook-ul setează explicit valorile corecte.

### Validare

Testele de field access au confirmat:

* anonim → `autor/status create=false, update=false`;
* cititor → `false`;
* contributor → `false`;
* editor → `false`;
* admin → `true`.

Simularea pipeline-ului de creare a confirmat:

* cititor → propriul ID + `asteptare`;
* contributor → propriul ID + `asteptare`;
* editor → propriul ID + `asteptare`;
* admin → poate păstra valorile furnizate.

Testarea runtime a încercat deliberat ca utilizatorul temporar să trimită:

* `autor` = ID-ul administratorului;
* `status` = `aprobat`.

Documentul rezultat a avut:

`autor = ID-ul utilizatorului autentificat`

și:

`status = asteptare`

Rezultat:

`PASS trusted create`

Prin urmare, valorile controlate de client nu au putut ocoli politica server-side.

---

## 8. AUDIT-005-F03 — integritatea relațiilor la ștergerea părinților

### Problemă identificată

Inspecția read-only a schemei PostgreSQL a evidențiat:

`comentarii.autor_id`

* `NOT NULL`;
* FK către `useri(id)`;
* `ON DELETE SET NULL`.

și:

`comentarii.articol_id`

* `NOT NULL`;
* FK către `articole(id)`;
* `ON DELETE SET NULL`.

Această combinație este structural contradictorie la ștergerea unui părinte referit:

* FK încearcă să seteze relația la `NULL`;
* coloana nu permite `NULL`.

Prin urmare, ștergerea unui utilizator sau articol care are comentarii asociate putea ajunge la o eroare de integritate DB.

La momentul auditului:

`TOTAL_COMMENTS=0`

Deci nu exista un incident activ în staging, dar riscul structural era real.

### Decizia de proiectare

Nu s-a ales:

* relaxarea relațiilor la nullable;
* cascade delete;
* modificarea internă a generatorului de schemă Payload;
* dependența de internals ale adaptorului Drizzle.

Politica aleasă este de tip:

`RESTRICT`

la nivelul aplicației.

Un utilizator sau articol referit de comentarii nu poate fi șters până când dependențele nu sunt rezolvate explicit.

---

## 9. AUDIT-005-F03-A — protecția ștergerii utilizatorilor

### Remediere

În `Useri.ts` a fost introdus hook-ul:

`protectUserCommentDependencies`

de tip:

`CollectionBeforeOperationHook<'useri'>`.

Hook-ul se aplică operațiilor:

* `delete`;
* `deleteByID`.

Pentru operații normale non-admin, access control-ul existent rămâne responsabil pentru refuz.

Pentru admin și pentru Local API cu:

`overrideAccess = true`

hook-ul identifică utilizatorii țintă și verifică dacă există comentarii cu:

`autor IN targetIDs`.

Dacă există cel puțin un comentariu dependent, operația este respinsă cu:

`409`

și mesajul:

`Utilizatorul nu poate fi șters cât timp există comentarii asociate.`

### Protecția operațiilor bulk

Pentru ștergerea pe bază de `where`, hook-ul rezolvă toate documentele țintă înainte de operația de ștergere.

Operația este blocată dacă oricare dintre utilizatorii selectați are comentarii asociate.

### Validare

Testele izolate au confirmat:

* operație non-delete → permisă;
* non-admin normal delete → delegat access control-ului;
* admin delete fără comentarii → permis;
* admin delete cu comentarii → blocat;
* `overrideAccess` delete cu comentarii → blocat;
* bulk delete fără dependențe → permis;
* bulk delete cu cel puțin o dependență → blocat;
* bulk fără documente țintă → permis.

Testarea runtime pe staging a confirmat:

`PASS admin delete user with comments: blocked 409`

și:

`PASS overrideAccess delete user with comments: blocked 409`

**Statut F03-A:** REMEDIAT ȘI VALIDAT PE STAGING.

---

## 10. AUDIT-005-F03-B — protecția ștergerii articolelor

### Remediere

În `Articole.ts` a fost introdus hook-ul:

`protectArticleCommentDependencies`

de tip:

`CollectionBeforeOperationHook<'articole'>`.

Hook-ul se aplică:

* `delete`;
* `deleteByID`.

Hook-ul existent:

`enforceArticlePublicationRBAC`

rulează înainte și păstrează ștergerea articolelor exclusiv pentru administratori.

Pentru un administrator, noul hook verifică dacă articolul sau articolele țintă au comentarii asociate.

Dacă există dependențe:

`409`

cu mesajul:

`Articolul nu poate fi șters cât timp există comentarii asociate.`

### Protecția operațiilor bulk

Pentru ștergeri cu `where`, toate articolele țintă sunt identificate înainte de mutație.

Dacă oricare dintre ele are comentarii asociate, operația este blocată.

### Validare

Testele izolate au confirmat:

* editor delete → blocat de RBAC existent cu `403`;
* `overrideAccess` fără admin → blocat de RBAC existent cu `403`;
* admin delete fără comentarii → permis;
* admin delete cu comentarii → blocat `409`;
* admin bulk delete fără dependențe → permis;
* admin bulk delete cu dependențe → blocat `409`;
* bulk fără articole țintă → permis.

Rezultat izolat:

**7 / 7 PASS**

Testarea runtime pe staging a confirmat:

`PASS admin delete article with comments: blocked 409`

**Statut F03-B:** REMEDIAT ȘI VALIDAT PE STAGING.

---

## 11. Comportamentul `filterOptions` Payload

În timpul auditului a fost verificată implementarea Payload CMS 3.85.1 pentru relațiile cu:

`filterOptions`.

Auditul sursei Payload a confirmat că filtrul nu este doar o convenție UI.

La validarea relației, Payload verifică documentul relaționat împotriva filtrului returnat de `filterOptions`.

Prin urmare, restricțiile implementate pentru:

* `articol`;
* `raspunsLa`;

sunt aplicate server-side la validarea relației.

Acest lucru este important deoarece protecția nu depinde de Payload Admin sau de lista de opțiuni afișată utilizatorului.

---

## 12. Pipeline-ul de creare Payload

Pentru verificarea protecției `autor/status` a fost auditat pipeline-ul de creare Payload 3.85.1.

Ordinea relevantă observată este:

1. collection `access.create`;
2. field `beforeValidate`, inclusiv field access;
3. collection `beforeValidate`;
4. collection `beforeChange`;
5. field `beforeChange`;
6. persistență.

Field access pentru create/update elimină din `siblingData` valoarea unui câmp dacă actorul nu are permisiune.

Ulterior, hook-ul collection-level pentru `Comentarii` setează valorile trusted:

* `autor = req.user.id`;
* `status = asteptare`.

Această ordine confirmă că utilizatorul non-admin nu poate păstra o valoare arbitrară pentru cele două câmpuri.

---

## 13. Inventarul staging înainte de testarea runtime

Înainte de testarea cu mutații controlate, baza `844-ai-dev` a fost inventariată read-only.

Rezultat:

`TOTAL_COMMENTS=0`

Utilizatori:

* `cititor = 0`;
* `contributor = 0`;
* `editor = 1`;
* `admin = 1`.

Articole:

* total = `1`;
* published = `1`;
* draft/non-published = `0`.

Articolul existent nu a fost folosit pentru teste distructive.

Au fost create fixture-uri dedicate exclusiv auditului.

---

## 14. Testarea runtime reală pe staging

Testarea runtime a fost executată împotriva:

`844-ai-dev`

prin environment-ul Railway staging.

Scriptul a inclus un safety check explicit asupra utilizatorului din `DATABASE_URL`:

`postgres.tvtnpcqawaekhmhyfrnc`

Dacă baza nu corespundea staging/dev, scriptul se oprea înainte de orice mutație.

### Fixture-uri temporare

Au fost create:

* un utilizator temporar cu rol `cititor`;
* două articole temporare publicate;
* un articol temporar draft;
* două comentarii temporare.

Articolele destinate testelor publice au urmat fluxul real al proiectului:

1. create ca draft;
2. publish explicit prin `_status = published`.

Această cale a fost aleasă după ce testarea inițială a demonstrat că simplul:

`draft: false`

nu produce automat `_status = published` în configurația actuală.

### Rezultate

F02:

`PASS non-admin comment on draft article: blocked 400`

Protecția autor/status:

`PASS trusted create`

Comentariul malițios trimis cu autor administrativ și status aprobat a fost persistat cu:

* autorul utilizatorului autentificat;
* `status = asteptare`.

F01:

`PASS reply to pending comment: blocked 400`

Moderare:

`PASS admin moderation`

F01 pozitiv:

`PASS valid same-article reply`

F01 cross-article:

`PASS cross-article reply: blocked 400`

F03-A:

`PASS admin delete user with comments: blocked 409`

F03-A cu bypass Local API:

`PASS overrideAccess delete user with comments: blocked 409`

F03-B:

`PASS admin delete article with comments: blocked 409`

Rezultat final:

**PASS AUDIT-005 STAGING RUNTIME**

Exit code:

`0`

---

## 15. Cleanup și verificarea stării bazei

Scriptul runtime a păstrat un recovery file temporar cu ID-urile fixture-urilor create.

Cleanup-ul s-a executat în ordinea:

1. comentarii;
2. articole;
3. utilizator.

Rezultatele finale:

* toate comentariile temporare au fost șterse;
* toate cele trei articole temporare au fost șterse;
* utilizatorul temporar a fost șters;
* recovery file a fost eliminat.

După cleanup, inventarul read-only a confirmat revenirea exactă la starea inițială:

`TOTAL_COMMENTS=0`

Utilizatori:

* `cititor = 0`;
* `contributor = 0`;
* `editor = 1`;
* `admin = 1`.

Articole:

* total = `1`;
* published = `1`;
* draft/non-published = `0`.

Nu au rămas fixture-uri AUDIT-005 în baza de staging/dev.

---

## 16. Verificări tehnice

Au fost executate:

`pnpm exec tsc --noEmit --pretty false`

Rezultat:

**PASS**

A fost executat:

`git diff --check`

Rezultat:

**PASS**

Nu au fost generate fișiere de migrare.

### ESLint țintit

Cele trei fișiere de producție modificate au fost verificate țintit.

Rezultat:

* `0` erori;
* `2` warnings existente în `Articole.ts`, de tip `@typescript-eslint/no-explicit-any`.

Aceste warnings nu au fost introduse sau remediate în scope-ul AUDIT-005.

### Lint global

`pnpm lint`

nu este în stare green la nivelul întregului repository.

Rezultat observat:

* `355` probleme;
* `7` erori;
* `348` warnings.

Cele `7` erori sunt preexistente și sunt `react/no-unescaped-entities` în:

* `src/app/(frontend)/[lang]/politica-confidentialitate/page.tsx`;
* `src/app/(frontend)/[lang]/politica-cookie-uri/page.tsx`.

Aceste fișiere nu fac parte din AUDIT-005.

Problema de lint global rămâne baseline tehnic separat și nu a fost ascunsă sau remediată incidental în acest audit.

---

## 17. Deployment staging

Implementarea AUDIT-005 a fost integrată prin:

* commit `9fae8ad` — `feat: harden comments RBAC`;
* Pull Request `#46`;
* merge commit `b3d5920`.

Railway staging:

* proiect: `resilient-harmony`;
* serviciu: `844-ai`;
* source repository: `Saftescu844/844-ai`;
* source branch: `staging`.

Deployment validat:

`590fa726-ebc1-41a0-850a-d6274236ac5c`

Status:

`SUCCESS`

Verificarea HTTP post-deployment:

`/ro` → `HTTP 200`

`/admin` → `HTTP 200`

Codul local și `origin/staging` au fost confirmate la:

`b3d5920`

**Statut final AUDIT-005: VALIDAT PE STAGING.**

Producția nu a fost modificată.

---

## 18. Limitări cunoscute

### Concurență la protecția F03

Protecțiile F03 folosesc modelul:

`read/count dependencies → delete`

Acesta este corect pentru operațiile Payload normale și bulk validate în audit.

Există însă o fereastră teoretică TOCTOU în care un comentariu ar putea fi creat concurent după verificarea dependențelor și înainte de ștergerea părintelui.

Constrângerea PostgreSQL existentă ar continua să împiedice pierderea integrității datelor, însă în acel caz excepțional răspunsul ar putea proveni de la DB în locul mesajului controlat `409`.

O garanție absolută ar necesita ulterior:

* locking tranzacțional adecvat;
* sau o constrângere / politică DB-level dedicată.

Această limitare este cunoscută și nu invalidează protecția operațiilor normale testate.

### Cicluri în `raspunsLa`

AUDIT-005 validează:

* existența părintelui;
* același articol;
* starea de moderare pentru non-admin.

Auditul curent nu introduce o regulă explicită pentru detectarea ciclurilor logice de tip reply, inclusiv auto-referință sau cicluri create prin modificări administrative.

Acest aspect trebuie analizat separat dacă modelul de comentarii va permite în viitor modificarea structurii reply după creare sau threading mai complex.

### `overrideAccess`

`overrideAccess: true` reprezintă în continuare o frontieră de încredere pentru Local API.

AUDIT-005 protejează explicit F03-A inclusiv în acest scenariu.

Pentru operațiile interne care utilizează `overrideAccess`, responsabilitatea de a furniza un context coerent rămâne la codul server-side de încredere.

Nu au fost identificate în audit apeluri existente care să constituie un bypass activ al politicii de comentarii.

---

## 19. Concluzie

AUDIT-005 a întărit modelul de securitate al colecției `Comentarii` în trei zone principale.

F01 garantează integritatea relației de reply:

* părintele trebuie să aparțină aceluiași articol;
* utilizatorii non-admin pot răspunde numai comentariilor aprobate.

F02 împiedică utilizatorii non-admin să atașeze comentarii articolelor nepublicate.

F03 protejează relațiile obligatorii dintre comentarii și părinții lor principali:

* utilizator;
* articol.

Protecțiile pentru `autor` și `status` împiedică falsificarea identității autorului și auto-aprobarea comentariilor de către actorii non-admin.

Validările au inclus:

* audit de configurație;
* inspecție Payload CMS 3.85.1;
* teste logice izolate;
* verificare TypeScript;
* verificare lint țintită;
* deployment Railway staging;
* testare runtime cu mutații controlate pe `844-ai-dev`;
* cleanup complet și verificare read-only post-test;
* healthcheck `/ro` și `/admin`.

**Statut final AUDIT-005: VALIDAT PE STAGING.**

Producția nu a fost modificată.

---

## 20. Follow-up

Rămân trei follow-up-uri tehnice documentate:

1. evaluarea unei protecții tranzacționale sau DB-level pentru eliminarea completă a ferestrei TOCTOU din F03;
2. evaluarea unei reguli explicite anti-cycle pentru relația `raspunsLa` dacă modelul de threading devine mai complex;
3. rezolvarea separată a baseline-ului global ESLint existent în repository.

Aceste follow-up-uri nu blochează validarea actuală a AUDIT-005.

Orice modificare ulterioară trebuie testată mai întâi în staging înainte de promovarea în producție.
