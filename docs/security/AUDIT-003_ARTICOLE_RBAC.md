# AUDIT-003 — RBAC pentru Articole

**Proiect:** 844-ai.ro
**Mediu analizat:** staging
**Data validării:** 27 august 2026
**Statut:** validat funcțional pe staging
**Impact asupra producției:** niciunul

---

## 1. Scopul auditului

AUDIT-003 urmărește întărirea controlului de acces pentru colecția `Articole`, astfel încât fluxul editorial să permită lucrul colaborativ fără ca rolurile non-admin să poată modifica necontrolat versiunea publică.

Obiectivele principale sunt:

1. permiterea accesului editorial pentru rolul `editor`;
2. separarea strictă între draft și documentul publicat;
3. rezervarea publicării și retragerii din public pentru `admin`;
4. rezervarea ștergerii și restaurării versiunilor pentru `admin`;
5. protejarea operațiilor Local API chiar și în situații în care access control-ul ar putea fi ocolit prin `overrideAccess`;
6. protejarea stărilor editoriale `approved` și `blocked`;
7. protejarea funcției native Payload de programare a publicării.

---

## 2. Principii de securitate aplicate

Implementarea respectă următoarele reguli:

- `admin` păstrează control editorial complet;
- `editor` poate crea și modifica articole numai prin fluxul de draft;
- `editor` nu poate publica sau retrage articole din public;
- `editor` nu poate șterge articole;
- `editor` nu poate restaura versiuni;
- `editor` nu poate programa sau anula programarea publicării;
- publicul și rolurile fără drepturi editoriale pot citi numai articolele publicate;
- modificarea unui articol anterior `approved` sau `blocked` de către un non-admin îl readuce în starea `review`.

---

## 3. Fișiere modificate

Implementarea AUDIT-003 a modificat:

- `src/collections/Articole.ts`
- `src/app/(payload)/layout.tsx`
- `src/serverFunctions/schedulePublishAdminOnly.ts`

Commit de implementare:

`d7d5ba0` — `feat: harden article publication RBAC`

Pull Request:

`#41` — `feat: harden article publication RBAC`

Merge commit în `staging`:

`2ae08cd` — `Merge pull request #41 from Saftescu844/audit/audit-003-rbac`

---

## 4. Reguli de access control validate

### Public / anonim

- poate citi numai documentele cu `_status = published`;
- nu poate crea articole;
- nu poate actualiza articole;
- nu poate șterge articole.

### Cititor

- poate citi numai documentele cu `_status = published`;
- nu poate crea articole;
- nu poate actualiza articole;
- nu poate șterge articole.

### Editor

- poate citi întregul flux editorial;
- poate crea articole;
- poate salva și actualiza drafturi;
- nu poate publica;
- nu poate actualiza direct versiunea live;
- nu poate retrage un articol din public;
- nu poate șterge;
- nu poate restaura versiuni.

### Admin

- poate citi întregul flux editorial;
- poate crea;
- poate actualiza;
- poate publica;
- poate retrage din public;
- poate programa publicarea;
- poate șterge;
- poate restaura versiuni.

---

## 5. Protecția `beforeOperation`

Colecția `Articole` utilizează un hook `beforeOperation` pentru protejarea operațiilor sensibile inclusiv la nivelul Local API.

Au fost validate următoarele scenarii pentru rolul `editor`:

- update cu `draft: true` → permis;
- update fără `draft: true` → HTTP 403;
- încercare de publicare → HTTP 403;
- `restoreVersion` → HTTP 403;
- `delete` → HTTP 403;
- `deleteByID` → HTTP 403.

Mesajele de securitate sunt explicite și diferențiază operațiile de publicare, ștergere, restaurare și modificare live.

---

## 6. Protecția stării editoriale

Câmpul `editorialStatus` acceptă:

- `draft`
- `review`
- `approved`
- `blocked`

Pentru utilizatorii non-admin, hook-ul `beforeChange` determină starea editorială efectivă folosind atât datele noi, cât și `originalDoc`.

Au fost validate:

- `approved` → `review`
- `blocked` → `review`
- `review` → neschimbat
- `draft` → neschimbat

Astfel, un editor nu poate modifica un document aprobat sau blocat și păstra automat starea administrativă anterioară.

---

## 7. Schedule Publish

Colecția are activ:

`versions.drafts.schedulePublish = true`

Pentru această suprafață a fost introdus server function-ul:

`src/serverFunctions/schedulePublishAdminOnly.ts`

Funcția interceptează `schedule-publish` și permite operația numai rolului `admin`.

În Payload Admin:

- editorului nu îi este afișată opțiunea `Schedule Publish`;
- adminului îi este afișată și funcționalitatea rămâne disponibilă.

---

## 8. Verificări tehnice

Înainte de integrarea în staging au fost executate:

`pnpm exec tsc --noEmit --pretty false`

Rezultat: fără erori TypeScript.

`git diff --check`

Rezultat: fără probleme.

`git diff --cached --check`

Rezultat: fără probleme.

Au fost executate și teste directe asupra funcțiilor `access`, `beforeOperation` și `beforeChange`.

---

## 9. Validare reală în Payload Admin — editor

Validarea a fost efectuată pe deploymentul Railway staging asociat PR #41.

Editorul:

- vede colecția `Articole`;
- vede butonul `Create New`;
- poate deschide și modifica drafturi;
- poate utiliza `Save Draft`;
- nu vede `Publish`;
- nu vede `Unpublish`;
- nu vede `Schedule Publish`;
- nu vede `Delete`.

Meniul secundar al articolului afișează pentru editor numai operații nesensibile precum:

- `Copy to locale`
- `Create New`
- `Duplicate`

---

## 10. Separarea draft / live

Articol de test:

Slug:

`articol-de-test-separare-dev-t0hwo7cn`

Versiunea publică avea titlul:

`Articol de test separare dev`

Editorul a salvat un draft cu titlul:

`Articol de test separare dev [AUDIT EDITOR RBAC 3]`

După `Save Draft`, pagina publică a fost reîncărcată și a rămas:

`Articol de test separare dev`

Rezultat:

**separarea dintre draft și versiunea live este validată în staging.**

---

## 11. Preview

Preview-ul articolului funcționează separat de pagina publică.

Ruta verificată:

`/ro/preview/articol/1`

Preview-ul afișează explicit mesajul:

`PREVIEW — această versiune nu este pagina publică.`

Draftul editorului este vizibil în preview fără a modifica articolul publicat.

---

## 12. Versions și restoreVersion

Editorul poate vedea istoricul versiunilor.

Interfața Payload afișează însă și butonul:

`Restore this version`

A fost efectuat un test real de restaurare folosind contul de editor.

Rezultat:

- Payload a afișat dialogul de confirmare;
- după confirmare, restaurarea a fost respinsă;
- UI a afișat mesajul de eroare că articolul nu s-a putut restaura;
- documentul curent a rămas neschimbat.

Backend-ul blochează deci corect operația `restoreVersion`.

### Follow-up UX

Butonul `Restore this version` este încă vizibil rolului `editor`, deși operația este blocată corect de backend.

Acest lucru nu reprezintă o vulnerabilitate de securitate, dar trebuie tratat ulterior ca îmbunătățire UX/RBAC pentru a nu afișa editorului o acțiune pe care nu are dreptul să o execute.

---

## 13. Validare reală în Payload Admin — admin

După întărirea RBAC, contul `admin` păstrează funcționalitățile administrative.

Au fost confirmate vizual:

- `Publish changes`
- `Schedule Publish`
- `Delete`
- `Unpublish`

Nu a fost identificată o regresie de permisiuni pentru administrator.

---

## 14. Deployment staging

Repository:

`Saftescu844/844-ai`

Branch Railway conectat:

`staging`

Auto Deploy:

dezactivat.

Deploymentul PR #41 a fost lansat controlat folosind:

`Deploy latest commit`

Rezultat:

`Deployment successful`

Deploymentul este `ACTIVE` în staging.

---

## 15. Concluzie

AUDIT-003 confirmă că fluxul RBAC pentru colecția `Articole` este funcțional și protejat pe staging.

Rolul `editor` poate participa la fluxul editorial și poate salva drafturi, dar nu poate modifica direct versiunea publicată și nu poate executa operații administrative sensibile.

Rolul `admin` păstrează controlul complet asupra publicării, programării, retragerii din public, restaurării versiunilor și ștergerii.

Separarea draft/live a fost verificată atât prin teste tehnice, cât și prin utilizarea reală a Payload Admin și a frontendului staging.

**Statut final AUDIT-003:** VALIDAT PE STAGING.

---

## 16. Follow-up

Rămâne deschis un follow-up UX:

- ascunderea acțiunii `Restore this version` pentru rolul `editor`.

Orice modificare viitoare asupra acestei suprafețe trebuie testată în staging înainte de integrarea în producție.
