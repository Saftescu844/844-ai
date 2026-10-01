# AUDIT-006 — Autori: RBAC, privacy, verification & publication lifecycle

**Proiect:** 844-ai.ro
**Mediu analizat:** staging/dev (`844-ai-dev`)
**Data validării tehnice:** 29 august 2026
**Data validării pe staging:** 29 august 2026
**Statut:** VALIDAT PE STAGING
**Impact asupra producției:** niciunul

---

## 1. Scopul auditului

AUDIT-006 urmărește verificarea și întărirea mecanismelor de securitate, integritate editorială, confidențialitate și control al afirmațiilor profesionale publice pentru colecția `Autori`.

Auditul tratează în mod special relația dintre:

* drepturile de administrare a profilurilor de autor;
* starea editorială a profilului;
* consimțământul pentru publicare;
* verificarea profesională;
* calificările profesionale;
* statutul de verificator medical;
* domeniul public declarat al verificării medicale;
* expirarea în timp a verificărilor profesionale;
* datele profesionale care pot fi expuse public;
* reader-ul public folosit de frontend.

Obiectivele principale sunt:

1. confirmarea regulilor RBAC pentru colecția `Autori`;
2. prevenirea publicării profilurilor care nu satisfac criteriile editoriale și profesionale;
3. prevenirea expunerii publice a afirmațiilor medicale devenite nevalide în timp;
4. alinierea definiției de „verificator medical” între publication readiness, validările server-side, Payload Admin și boundary-ul public;
5. păstrarea profilului general al autorului atunci când expiră numai eligibilitatea sa de verificator medical;
6. prevenirea expunerii publice a calificărilor expirate;
7. validarea comportamentului atât prin teste automate, cât și runtime pe baza reală de staging/dev;
8. confirmarea cleanup-ului complet după testele runtime.

---

## 2. Principii de securitate aplicate

Implementarea respectă următoarele reguli:

* numai administratorii pot crea, actualiza sau șterge profiluri de autor;
* administratorii și editorii pot accesa zona administrativă a colecției;
* publicul poate citi numai profiluri cu `status = published`;
* un profil public trebuie să aibă consimțământ explicit pentru publicare;
* retragerea consimțământului invalidează expunerea publică;
* un profil publicat trebuie să aibă cel puțin un rol editorial;
* `verificationStatus` trebuie să fie `verified` înainte de publicare;
* `lastReviewedAt` este obligatoriu pentru publicare;
* `reviewedBy` este obligatoriu pentru trasabilitatea editorială;
* datele profesionale de contact necesită consimțământ public separat;
* imaginile proprii ale autorului nu sunt încă permise la publicare până la completarea metadatelor Media privind drepturile de utilizare;
* un verificator medical este definit unitar prin `isMedicalReviewer = true` SAU prin rolul editorial `medicalReviewer`;
* un verificator medical publicat trebuie să aibă cel puțin o calificare verificată și neexpirată;
* un verificator medical trebuie să aibă un `medicalReviewScope` valid în limba română;
* dacă verificarea profesională devine expirată prin trecerea timpului, profilul general al autorului rămâne public, dar afirmația de verificator medical este retrasă automat de la boundary-ul public;
* calificările expirate nu sunt expuse public;
* `publiclyVisible` controlează expunerea detaliilor calificării, nu eligibilitatea profesională internă;
* datele istorice nu sunt șterse automat din baza de date doar pentru că o verificare a expirat.

---

## 3. Fișiere modificate

Implementarea AUDIT-006 modifică:

* `src/collections/Autori.ts`
* `src/lib/authors.ts`
* `src/lib/authors-reader.ts`
* `tests/int/authors-normalizer.int.spec.ts`

Documentația auditului:

* `docs/security/AUDIT-006_AUTORI_SECURITY.md`

Commit de implementare:

`d199570` — `fix: harden author medical verification lifecycle`

Commit complet:

`d1995707991b3195022d155979ec96637cc7e48c`

Pull Request:

`#48` — `fix: harden author medical verification lifecycle`

Merge în `staging`:

`a2bdca7` — `Merge pull request #48 from Saftescu844/audit/audit-006-autori-security`

Merge commit complet:

`a2bdca75bbd8c1242b415aa88678d467cdeba85c`

Deployment Railway staging validat:

`1a856592-ae41-4720-a926-553e7123722e`

Proiect Railway staging:

`resilient-harmony`

Project ID:

`44c37d0f-b300-4462-b001-31259ddae5dd`

Serviciu:

`844-ai`

Environment-ul Railway din interiorul proiectului de staging se numește:

`production`

Acest nume aparține proiectului separat de staging și nu reprezintă proiectul real de producție 844-ai.ro.

Status deployment:

`Online`

Producția reală nu a fost modificată.

---

## 4. Reguli RBAC și de publicare validate

### Public / anonim

Publicul:

* nu poate crea profiluri de autor;
* nu poate actualiza profiluri de autor;
* nu poate șterge profiluri de autor;
* poate citi numai profiluri cu `status = published`;
* primește datele prin boundary-ul public normalizat;
* nu primește automat câmpurile interne de verificare și consimțământ.

Reader-ul public utilizează explicit:

`status = published`

și normalizează rezultatul înainte de expunerea către frontend.

### Editor

Rolul `editor`:

* poate accesa administrarea colecției `Autori`;
* poate citi profilurile în context administrativ;
* nu poate crea profiluri;
* nu poate actualiza profiluri;
* nu poate șterge profiluri.

Accesul la Payload Admin nu implică drepturi de modificare asupra profilurilor de autor.

### Admin

Rolul `admin`:

* poate accesa administrarea colecției;
* poate citi toate profilurile;
* poate crea profiluri;
* poate actualiza profiluri;
* poate șterge profiluri;
* controlează câmpurile interne sensibile de verificare;
* controlează starea profilului;
* controlează consimțământul pentru publicare;
* controlează verificarea profesională;
* controlează trasabilitatea editorială.

---

## 5. Publication readiness

Înainte ca un profil să poată avea:

`status = published`

backend-ul verifică o serie de condiții deterministe.

### Rol editorial

Trebuie să existe cel puțin un rol în:

`editorialRoles`

În lipsa unui rol, publicarea este respinsă.

### Verificare profesională

Este necesar:

`verificationStatus = verified`

Valorile precum:

* `pending`;
* `partiallyVerified`;
* `expired`;
* `rejected`

nu permit publicarea.

### Consimțământ

Este necesar:

`publicationConsent = true`

Dacă există date profesionale de contact destinate publicării, este necesar și:

`publicContactConsent = true`

### Trasabilitate editorială

Sunt obligatorii:

`lastReviewedAt`

și:

`reviewedBy`

Câmpul `reviewedBy` este relație către colecția:

`useri`

### Media

Profilurile publicate nu pot avea în prezent:

`profileImage`

sau:

`socialImage`

până când schema Media nu documentează complet drepturile de utilizare.

### Verificator medical

Un profil este considerat verificator medical dacă:

`isMedicalReviewer === true`

SAU dacă:

`editorialRoles`

conține:

`medicalReviewer`

În acest caz, publicarea necesită cel puțin o calificare care:

* are `verified = true`;
* nu are `yearExpires` anterior anului calendaristic curent.

Dacă există:

`nextVerificationDue`

și data validă este în trecut, publicarea este respinsă.

---

## 6. Lifecycle și consimțământ

Regulile lifecycle împiedică stări incompatibile cu istoricul de consimțământ.

Dacă:

`consentWithdrawnAt`

are valoare, profilul trebuie să fie:

`inactive`

sau:

`archived`

Un profil arhivat trebuie să conțină:

`archivalReason`

Boundary-ul public mai verifică defensiv:

* `status = published`;
* `publicationConsent = true`;
* absența `consentWithdrawnAt`.

Astfel, chiar dacă reader-ul intern utilizează `overrideAccess`, datele nepublicabile nu sunt returnate ca profil public.

---

## 7. AUDIT-006-F01 — verificarea medicală putea deveni stale prin simpla trecere a timpului

### Severitate

`MEDIUM`

### Problemă identificată

Publication readiness verifica validitatea profesională a unui verificator medical numai în momentul operației de scriere.

Pentru un verificator medical erau validate:

* existența unei calificări verificate;
* neexpirarea calificării;
* `nextVerificationDue`.

Problema era temporală.

Un profil putea fi publicat corect în ziua validării, iar ulterior:

* calificarea putea expira;
* `nextVerificationDue` putea ajunge în trecut;

fără să existe neapărat o nouă operație de update asupra documentului.

În configurația anterioară, reader-ul public nu reevaluase toate aceste condiții în momentul citirii.

Consecința era că un autor putea continua să fie prezentat public ca:

`medicalReviewer`

deși verificarea profesională nu mai era curentă.

Aceasta nu era o vulnerabilitate de autentificare și nu producea o expunere directă de PII.

Riscul era unul de:

* integritate editorială;
* încredere;
* acuratețe a afirmațiilor profesionale și medicale publice.

---

## 8. Politica aleasă pentru remedierea F01

Remedierea nu ascunde automat întregul profil al autorului atunci când expiră exclusiv eligibilitatea medicală.

Politica adoptată este:

`degrade medical capability, preserve general author profile`

Astfel:

* profilul general rămâne public;
* rolurile editoriale generale rămân publice;
* rolul `medicalReviewer` este eliminat din rezultatul public;
* `medicalReviewScope` este eliminat din rezultatul public;
* calificările expirate nu sunt expuse public;
* datele istorice rămân în baza de date.

Această abordare evită transformarea unei expirări profesionale într-o ștergere sau ascundere nejustificată a întregii identități editoriale a autorului.

---

## 9. Semantica expirării calificărilor

Pentru calificările profesionale este utilizat anul calendaristic UTC curent.

O calificare cu:

`yearExpires < currentYear`

este expirată.

O calificare cu:

`yearExpires = currentYear`

este încă considerată validă pentru anul calendaristic curent.

Această regulă păstrează aceeași semantică utilizată deja de publication readiness.

Pentru:

`nextVerificationDue`

normalizatorul încearcă parsarea datei.

Verificarea este considerată expirată dacă data:

* poate fi parsată;
* este finită;
* este mai mică decât `Date.now()`.

O valoare neparsabilă nu este reinterpretată automat de normalizator ca expirată.

Validarea formatului datelor rămâne responsabilitatea schemei Payload.

---

## 10. Eligibilitatea profesională versus vizibilitatea calificării

Eligibilitatea medicală și afișarea detaliilor unei calificări sunt tratate separat.

Pentru eligibilitatea medicală este suficientă existența unei calificări:

* verificate;
* neexpirate.

Câmpul:

`publiclyVisible`

nu este necesar pentru eligibilitatea internă.

Pentru ca detaliile calificării să fie returnate public, sunt necesare cumulativ:

* `publiclyVisible = true`;
* `verified = true`;
* calificarea să fie curentă.

Această separare evită schimbarea implicită a politicii de business conform căreia o calificare poate susține intern verificarea profesională fără ca toate detaliile sale să fie publicate.

---

## 11. Remedierea F01 în boundary-ul public

`PublicAuthorSource` include acum intern:

`nextVerificationDue`

Reader-ul public selectează acest câmp pentru evaluarea temporală.

Câmpul nu este adăugat în:

`PublicAuthorProfile`

și nu este expus ca informație publică.

Normalizatorul calculează:

`hasCurrentVerifiedCredential`

și:

`professionalVerificationIsPastDue`

Un profil poate păstra public rolul:

`medicalReviewer`

numai dacă sunt îndeplinite cumulativ:

1. profilul solicită statutul medical prin flag sau rol;
2. există o calificare verificată și curentă;
3. `nextVerificationDue` nu este expirat;
4. există un `medicalReviewScope` public valid.

Dacă aceste condiții nu sunt îndeplinite:

`medicalReviewer`

este filtrat din rolurile publice.

De asemenea:

`medicalReviewScope`

nu este returnat.

Celelalte roluri editoriale sunt păstrate.

---

## 12. AUDIT-006-F02 — definiții inconsistente pentru „medical reviewer”

### Severitate

`MEDIUM`

### Problemă identificată

Existau două definiții diferite pentru același concept.

Publication readiness considera un profil verificator medical dacă:

`isMedicalReviewer === true`

SAU:

`editorialRoles`

conținea:

`medicalReviewer`

În schimb, validatorul:

`validateMedicalReviewScopeForPublication`

verifica inițial numai:

`isMedicalReviewer`

Această diferență permitea cazul:

`editorialRoles = ['medicalReviewer']`

și:

`isMedicalReviewer = false`

să fie recunoscut drept verificator medical de publication readiness, dar să nu intre în validatorul obligatoriu pentru:

`medicalReviewScope`

Astfel, în anumite condiții, profilul putea evita validarea domeniului medical.

Problema era server-side și nu doar una de interfață.

---

## 13. Remedierea F02 — definiție unică

Definiția aplicată acum este:

`flag OR role`

Validatorul `validateMedicalReviewScopeForPublication` determină rolul medical folosind atât:

`isMedicalReviewer`

cât și:

`editorialRoles.includes('medicalReviewer')`

Pentru update-uri parțiale sunt luate în calcul și valorile din:

`originalDoc`

Astfel, absența unui câmp din payload-ul unui update nu dezactivează accidental validarea.

---

## 14. Payload Admin pentru `medicalReviewScope`

Condiția din interfața Payload Admin pentru afișarea:

`medicalReviewScope`

a fost aliniată cu aceeași definiție.

Câmpul este afișat dacă:

`isMedicalReviewer`

este adevărat SAU dacă:

`editorialRoles`

conține:

`medicalReviewer`

Interfața nu mai ascunde scope-ul unui profil care este verificator medical prin rol editorial, dar nu prin flag.

Aceasta este o îmbunătățire UX și de consistență, dar regula decisivă de securitate rămâne implementată server-side.

---

## 15. Defense in depth pentru F02

Boundary-ul public aplică suplimentar o protecție defensivă.

Chiar dacă ar exista date istorice sau stale în baza de date, rolul:

`medicalReviewer`

nu este păstrat public dacă lipsește un:

`medicalReviewScope`

valid.

Astfel, există protecție la trei niveluri:

1. publication readiness;
2. validare server-side înainte de scriere;
3. normalizare defensivă înainte de expunerea publică.

---

## 16. Teste automate introduse pentru F01

Au fost introduse teste regression în:

`tests/int/authors-normalizer.int.spec.ts`

Scenariile F01 verifică:

### Calificare expirată

Un profil care solicită rolul de verificator medical, dar are calificarea expirată:

* nu mai expune public `medicalReviewer`;
* nu mai expune `medicalReviewScope`.

### Verificare profesională past due

Un profil cu:

`nextVerificationDue`

în trecut:

* nu mai expune public `medicalReviewer`;
* nu mai expune `medicalReviewScope`.

Testele au fost introduse inițial în stare RED.

Înainte de remediere, exact aceste scenarii eșuau.

După implementarea remedierei, testele au trecut.

---

## 17. Test automat introdus pentru F02

A fost adăugat testul regression:

`suppresses the medical-review role when the required public review scope is missing`

Fixture-ul testului conține:

* rol editorial `medicalReviewer`;
* `isMedicalReviewer = false`;
* calificare verificată și curentă;
* lipsă `medicalReviewScope`.

Înainte de protecția defensivă F02, testul eșua deoarece rolul medical rămânea public.

După remediere:

* rolul `medicalReviewer` este eliminat;
* testul trece.

---

## 18. Validare tehnică locală

După implementarea finală F01 + F02 au fost validate cele patru fișiere modificate.

### Git diff

`git diff --check`

Rezultat:

`PASS`

Nu au fost identificate whitespace errors.

### ESLint

Targeted ESLint pe:

* `src/collections/Autori.ts`
* `src/lib/authors-reader.ts`
* `src/lib/authors.ts`
* `tests/int/authors-normalizer.int.spec.ts`

Rezultat:

`PASS`

### TypeScript

Comandă:

`pnpm exec tsc --noEmit`

Rezultat:

`PASS`

### Teste Autori

Au fost rulate toate suitele relevante pentru autori.

Rezultat:

`7 test files passed`

și:

`73 / 73 tests passed`

Au fost incluse și testele regression pentru F01 și F02.

---

## 19. Migrații

AUDIT-006 nu modifică schema PostgreSQL.

Nu au fost generate fișiere noi în:

`src/migrations`

Nu a fost necesară nicio migrare de bază de date.

Remedierea operează exclusiv la nivel de:

* reguli Payload;
* validări;
* normalizare publică;
* selectarea internă a câmpurilor;
* teste automate.

---

## 20. Merge în staging

Branch de implementare:

`audit/audit-006-autori-security`

Commit:

`d1995707991b3195022d155979ec96637cc7e48c`

PR:

`#48`

PR-ul a fost verificat înainte de merge:

* base: `staging`;
* head: `audit/audit-006-autori-security`;
* mergeable: `MERGEABLE`;
* merge state: `CLEAN`;
* un singur commit de implementare.

PR #48 a fost merged la:

`2026-08-29T07:10:32Z`

Merge commit:

`a2bdca75bbd8c1242b415aa88678d467cdeba85c`

Commit-ul AUDIT-006 a fost confirmat ca ancestor al:

`origin/staging`

Staging local și remote au fost sincronizate exact la același hash.

---

## 21. Deployment Railway staging

Înainte de deployment a fost verificată explicit legătura Railway CLI.

Proiect:

`resilient-harmony`

Project ID:

`44c37d0f-b300-4462-b001-31259ddae5dd`

Serviciu:

`844-ai`

Service ID:

`e113e429-e2a9-4271-b0a4-6554233037ee`

URL:

`https://844-ai-production.up.railway.app`

Environment intern Railway:

`production`

Acest environment aparține proiectului separat de staging.

Deployment-ul AUDIT-006:

`1a856592-ae41-4720-a926-553e7123722e`

a devenit deployment-ul activ al serviciului.

Status final:

`Online`

---

## 22. Health-check staging

După deployment au fost verificate explicit:

`/ro`

Rezultat:

`HTTP 200`

și:

`/admin`

Rezultat:

`HTTP 200`

Serviciul Railway a rămas:

`Online`

cu deployment activ:

`1a856592-ae41-4720-a926-553e7123722e`

---

## 23. Validare runtime AUDIT-006-F02

F02 a fost validat direct folosind Payload împotriva mediului staging/dev.

Înainte de test:

`INVENTORY_BEFORE=0`

### Caz negativ

A fost construit un profil temporar cu:

* `editorialRoles = ['medicalReviewer']`;
* `isMedicalReviewer = false`;
* calificare verificată;
* calificare neexpirată;
* `verificationStatus = verified`;
* `publicationConsent = true`;
* `lastReviewedAt` valid;
* `reviewedBy` valid;
* `status = published`;
* fără `medicalReviewScope`.

Rezultat:

`F02_NEGATIVE_PASS`

Publicarea fără scope medical a fost respinsă conform regulii server-side.

### Caz pozitiv

Același profil a fost creat cu:

`medicalReviewScope`

valid în limba română.

Rezultat:

`F02_POSITIVE_PASS`

Fixture creat:

`id=8`

Profilul a fost acceptat cu:

`status = published`

Acest rezultat confirmă că testul negativ nu a fost respins din cauza unei alte condiții de publication readiness.

---

## 24. Cleanup runtime F02

Fixture-ul pozitiv a fost șters în blocul de cleanup.

Rezultat:

`CLEANUP_DELETED id=8`

Inventar final:

`INVENTORY_AFTER=0`

Fixture-uri AUDIT rămase:

`AUDIT_FIXTURES_REMAINING=0`

Verificare integritate:

`CLEANUP_INTEGRITY_PASS`

Rezultat final:

`AUDIT_006_F02_RUNTIME_PASS`

Astfel, baza de staging/dev a revenit la inventarul inițial.

---

## 25. Validare runtime temporală AUDIT-006-F01

F01 a fost verificat printr-un test temporal real, fără modificarea directă a bazei de date și fără ocolirea hooks-urilor Payload.

A fost creat un profil temporar complet valid pentru publicare.

Fixture:

`id=9`

Profilul avea:

* rol general `author`;
* rol `medicalReviewer`;
* `isMedicalReviewer = false`;
* `medicalReviewScope` valid;
* calificare verificată și neexpirată;
* `verificationStatus = verified`;
* consimțământ de publicare;
* trasabilitate editorială validă;
* `nextVerificationDue` setat la aproximativ 20 de secunde în viitor.

Reader-ul utilizat în test a fost:

`getPublicAuthor()`

Acesta este același reader utilizat de paginile publice de autor din frontend.

---

## 26. F01 — starea înainte de expirare

Imediat după creare și înainte de termenul:

`nextVerificationDue`

reader-ul public a confirmat:

`medicalReviewer = present`

și:

`medicalReviewScope = present`

Rolul general:

`author`

era de asemenea prezent.

Rezultat:

`F01_BEFORE_EXPIRY_PASS`

Aceasta confirmă că fixture-ul era profesional valid înainte de expirare.

---

## 27. F01 — starea după expirare

Testul a așteptat trecerea efectivă a:

`nextVerificationDue`

fără a modifica documentul între cele două citiri.

După expirare, același:

`getPublicAuthor()`

a returnat în continuare profilul general.

Rezultat:

`profile = present`

Dar:

`medicalReviewer = absent`

și:

`medicalReviewScope = absent`

În același timp:

`author = present`

Rezultat:

`F01_AFTER_EXPIRY_PASS`

Acesta este testul decisiv pentru F01.

El demonstrează că simpla trecere a timpului produce degradarea automată a afirmației medicale publice, fără a necesita un update asupra documentului și fără a elimina profilul general al autorului.

---

## 28. Cleanup runtime F01

După testul temporal:

`CLEANUP_DELETED id=9`

Inventar înainte:

`INVENTORY_BEFORE=0`

Inventar după:

`INVENTORY_AFTER=0`

Fixture-uri AUDIT rămase:

`AUDIT_FIXTURES_REMAINING=0`

Verificare integritate:

`CLEANUP_INTEGRITY_PASS`

Rezultat final:

`AUDIT_006_F01_RUNTIME_PASS`

Exit code al scriptului:

`0`

Baza `844-ai-dev` a revenit exact la inventarul anterior testului.

---

## 29. Reader-ul public

Reader-ul public utilizat de frontend este implementat în:

`src/lib/authors-reader.ts`

Funcțiile principale sunt:

`getPublicAuthorInLocale()`

și:

`getPublicAuthor()`

Reader-ul:

* normalizează slug-ul;
* caută numai `status = published`;
* utilizează `fallbackLocale = false`;
* utilizează `depth = 0`;
* selectează explicit numai câmpurile necesare;
* trece rezultatul prin `normalizePublicAuthorProfile()`.

Pentru fallback RO/EN, profilul este normalizat defensiv și înainte de merge-ul localizat.

---

## 30. Boundary-ul public și privacy

`PUBLIC_AUTHOR_SELECT`

include date publice și un număr limitat de câmpuri interne necesare exclusiv pentru verificarea boundary-ului.

Printre acestea se află:

* `publicationConsent`;
* `publicContactConsent`;
* `consentWithdrawnAt`;
* `nextVerificationDue`;
* `status`.

Aceste câmpuri pot fi citite intern pentru luarea deciziei de expunere, dar nu sunt automat parte din:

`PublicAuthorProfile`

returnat frontendului.

Această separare permite aplicarea regulilor de securitate fără transformarea câmpurilor interne în API public.

---

## 31. Ce NU reprezintă F01 și F02

F01 și F02 nu au demonstrat:

* bypass de autentificare;
* escaladare de privilegii;
* acces neautorizat la date personale;
* SQL injection;
* acces direct la baza de date;
* expunere de secrete;
* modificare neautorizată a profilurilor.

Ambele findings sunt probleme de integritate și coerență în ciclul de viață al afirmațiilor profesionale publice.

Severitatea `MEDIUM` reflectă impactul potențial asupra încrederii și a reprezentării corecte a competențelor medicale.

---

## 32. Limitări și observații

Regula:

`yearExpires < currentYear`

operează la granularitate de an calendaristic.

Schema actuală nu modelează o dată exactă de expirare pentru calificările care folosesc numai `yearExpires`.

Pentru verificarea profesională generală există:

`nextVerificationDue`

care permite verificarea temporală la nivel de dată.

Normalizatorul tratează o dată `nextVerificationDue` neparsabilă în aceeași manieră defensivă ca publication readiness: numai o dată validă și finită poate fi clasificată drept past due prin comparație temporală.

Auditul nu modifică această politică.

---

## 33. Starea bazei de date după validare

Ambele teste runtime au utilizat fixture-uri temporare.

F02:

`0 → fixture id=8 → 0`

F01:

`0 → fixture id=9 → 0`

La final:

`AUDIT_FIXTURES_REMAINING=0`

Nu au rămas documente AUDIT-006 în colecția `Autori`.

Nu au fost aplicate migrații.

Nu au fost realizate modificări manuale directe în PostgreSQL.

---

## 34. Starea repository-ului după validare

Staging validat:

`a2bdca7`

Branch-ul de implementare a fost păstrat:

`audit/audit-006-autori-security`

Pentru documentarea validării a fost creat branch-ul separat:

`docs/audit-006-staging-validation`

Modificarea de documentație nu necesită redeployment runtime pentru a valida logica deja testată.

---

## 35. Concluzie

AUDIT-006 a identificat și remediat două probleme distincte de integritate profesională în colecția `Autori`.

### F01

Verificarea medicală putea deveni stale după publicare numai prin trecerea timpului.

Remedierea mută reevaluarea critică și la boundary-ul public.

Un profil cu verificare medicală expirată:

* rămâne profil public general;
* pierde rolul public `medicalReviewer`;
* pierde `medicalReviewScope`;
* nu mai expune calificările expirate.

Comportamentul a fost confirmat prin test temporal real pe staging.

### F02

Definiția de verificator medical era inconsistentă între publication readiness și validatorul scope-ului medical.

Remedierea utilizează acum aceeași regulă:

`isMedicalReviewer === true OR editorialRoles includes medicalReviewer`

în toate punctele relevante.

Cazul de bypass prin rol editorial a fost confirmat ca blocat runtime pe staging.

### Rezultat final

AUDIT-006 este:

`VALIDAT PE STAGING`

Au fost confirmate:

* testele automate;
* TypeScript;
* ESLint;
* publication readiness;
* boundary-ul public;
* deployment-ul Railway staging;
* health-check-urile;
* F01 runtime temporal;
* F02 runtime negativ și pozitiv;
* cleanup-ul complet al bazei de staging/dev.

Producția reală nu a fost modificată.

---

## 36. Următorul pas operațional

Documentația AUDIT-006 poate fi integrată în `staging` printr-un PR separat de documentație.

Promovarea oricărei modificări către producție rămâne o operațiune distinctă și necesită validare și aprobare separată.

AUDIT-006 nu autorizează implicit niciun deployment în producție.
