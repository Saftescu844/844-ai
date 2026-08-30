# REG-001 — Staging regression & production readiness

**Proiect:** 844-ai.ro
**Mediu analizat:** staging/dev (`844-ai-dev`)
**Data inventarului:** 30 august 2026
**Statut:** INVENTAR FINALIZAT — REMEDIERI ÎN AȘTEPTARE
**Impact asupra producției:** niciunul

---

## 1. Scop

REG-001 verifică starea integrată a platformei după auditurile și modificările efectuate în staging și identifică elementele care trebuie rezolvate înainte ca platforma să poată fi considerată pregătită pentru o promovare controlată în producție.

Inventarul acoperă infrastructura și migrațiile, Payload Admin și SiteSettings, articole și responsabilitate editorială, Autori, Flash, Useri și Comentarii, Media, routing RO/EN, SEO și cursuri.

Producția reală nu a fost modificată.

---

## 2. Validări PASS

Au fost confirmate:

- branch local `staging` și worktree curat;
- Node.js `v22.17.0`;
- serviciile Railway staging web și `newsletter-retention` funcționale;
- `/ro` și `/admin` funcționale;
- toate cele 8 migrații înregistrate sunt aplicate în staging;
- `prodMigrations` este configurat și `PAYLOAD_DB_PUSH` rămâne dezactivat;
- Payload Admin și SiteSettings funcționează normal;
- rutele publice principale RO/EN testate răspund `200`;
- `/` redirecționează `307` către `/ro`;
- articolul publicat de test răspunde `200`;
- rutele Autorilor separă corect `/ro/autori/...` de `/en/authors/...`;
- accesul public la cursuri este limitat explicit la `gratuit=true`;
- protecția SEC-002 pentru cursurile premium nu prezintă regresie în traseul public verificat.

---

## 3. Findings

| ID | Prioritate | Finding | Status |
| --- | --- | --- | --- |
| R01 | P1 | Colecția `Autori` este nepopulată; workflow-ul editorial nu poate fi utilizat complet | OPEN |
| R02 | P1 | Fluxul Flash/autopublicare necesită formalizare înainte de production readiness | OPEN |
| R03 | P2 | Asocierea `Useri ↔ Autori` nu garantează maximum un profil profesional per cont | OPEN |
| R04 | P2 | Comentariile există în backend, dar fluxul public articol → comentarii nu este implementat | OPEN |
| R05 | P2 | Modelul conversației multilingve trebuie implementat ca thread comun RO/EN | OPEN |
| R06 | P1 | Auto-Publisher actual este un prototip de generare draft, nu Flash Engine final | OPEN |
| R07 | P1 | Flash medical necesită clasificare de risc și safety gates distincte | OPEN |
| R08 | P1 | Trasabilitatea temporală publică trebuie să distingă prima publicare de actualizarea editorială semnificativă | OPEN |
| R09 | P1 | `Autori` nu distinge persoane reale de identități editoriale/sistem | OPEN |
| R10 | P1 | Responsabilitatea editorială există în CMS, dar nu este afișată pe articolul public | OPEN |
| R11 | P2 | Nu există flux public complet de signup/login pentru comunitate | OPEN |
| R12 | P2 | `Useri` nu are încă o identitate publică dedicată pentru comentarii | OPEN |
| R13 | P2 | Fotografia specialistului trebuie să fie opțională și independentă de verificarea profesională | OPEN |
| R14 | P1 | Există `profileImageConsent`, dar publication-readiness blochează în prezent orice fotografie de profil | OPEN |
| R15 | P0 | `[lang]` nu validează centralizat limbile și acceptă segmente arbitrare, inclusiv `robots.txt` | OPEN |
| R16 | P0 | Stagingul este indexabil (`index, follow`) și nu are un `robots.txt` real | OPEN |

---

## 4. R15 — validarea limbii

Parametrul `[lang]` nu este validat centralizat.

În staging au fost confirmate:

```text
/xx                 -> 200
/xx/search          -> 404
/xx/pilon/stiri     -> 200
/robots.txt         -> 200 HTML
```

Ruta `/robots.txt` este capturată de `[lang]` și este tratată ca o limbă, generând inclusiv `<html lang="robots.txt">`.

Comportamentul este inconsistent: unele pagini validează explicit `ro` și `en`, iar altele tratează orice altă valoare ca fallback de limbă.

Remedierea trebuie să introducă un guard centralizat care acceptă numai `ro` și `en`. Orice altă valoare trebuie respinsă controlat.

---

## 5. R16 — indexarea stagingului

Stagingul este în prezent indexabil.

Au fost confirmate pagini publice care livrează:

```text
<meta name="robots" content="index, follow">
```

Nu a fost identificat un header `X-Robots-Tag: noindex`.

Nu există nici un `robots.txt` real; cererea pentru `/robots.txt` este capturată de ruta dinamică `[lang]`.

Documentația arhitecturală existentă stabilește deja că stagingul și preview-ul nu trebuie indexate.

Remedierea trebuie să facă protecția mediilor non-production independentă de setările editoriale din Payload.

Principiul țintă:

```text
production      -> politica SEO editorială normală
non-production  -> noindex, nofollow forțat tehnic
```

Pentru producție trebuie să existe și o rută `robots.txt` reală.

---

## 6. Model editorial aprobat

Platforma va separa explicit două tipuri de responsabilitate editorială.

### Articol editorial

Articolul editorial are responsabilitate umană explicită și poate utiliza:

- autor principal;
- coautori;
- verificator editorial;
- verificator medical, când este necesar;
- contributori experți.

### Flash 844 AI

Flash 844 AI este un material relativ scurt, dar suficient de informativ pentru a explica ce s-a întâmplat, de ce contează, cui îi este relevant și ce întrebări sau direcții poate deschide.

Identitatea editorială standard pentru materialele Flash automatizate va fi `Redacția 844 AI`.

`Redacția 844 AI` va exista ca profil real în colecția `Autori`, nu ca text decorativ și nu ca persoană fictivă.

Autopublicarea completă va fi permisă numai pentru categorii și situații cu risc adecvat. Conținutul medical interpretativ sau clinic va avea reguli și controale mai stricte.

---

## 7. Autori și identitate profesională

Separarea responsabilităților rămâne:

```text
Useri  = autentificare, securitate și RBAC
Autori = identitate publică, profesională și editorială
```

Colecția `Autori` trebuie să distingă explicit:

```text
profileType
├── person
└── editorialSystem
```

Pentru `person` se păstrează regulile privind verificarea profesională, consimțământul și lifecycle-ul profilului.

Pentru `editorialSystem` nu se vor simula consimțământul unei persoane, calificări profesionale sau o verificare profesională inexistentă. Se vor cere în schimb identitate publică clară, descrierea rolului, trasabilitate internă și transparență privind utilizarea AI, unde este cazul.

Un cont `Useri` va putea fi asociat cu maximum un profil `Autori`. Relația poate rămâne opțională pentru specialiștii care au profil public, dar nu au cont pe platformă.

`Redacția 844 AI`, fiind o identitate editorială de sistem, nu necesită un cont `Useri` propriu.

---

## 8. Fotografii de profil și Media

Fotografia specialistului este opțională și independentă de verificarea profesională.

Dacă specialistul nu dorește afișarea unei fotografii, profilul public rămâne complet valid și va utiliza un avatar neutru cu inițiale.

Dacă se publică o fotografie reală a specialistului, aceasta trebuie să fie furnizată sau autorizată de acesta și asociată cu `profileImageConsent=true`.

Nu se va utiliza un portret AI fotorealist pentru a simula fotografia unei persoane reale.

Pentru imaginile editoriale și celelalte materiale Media este suficientă o trasabilitate pragmatică. Schema trebuie să poată diferenția cel puțin:

- surse externe permise;
- imagine proprie;
- imagine furnizată de autor/specialist;
- imagine generată cu AI.

Nu este necesar un sistem juridic complex de asset management. Unde este relevant, se pot păstra suplimentar creditul și URL-ul sursei.

Finding R14 va fi remediat astfel încât existența unei fotografii autorizate să nu mai blocheze automat publicarea profilului.

---

## 9. Comentarii și comunitate

Modelul de identitate pentru comentarii va păstra separarea dintre cont și profilul profesional:

```text
Comentariu -> Useri -> profil Autori opțional
```

Utilizatorul obișnuit va avea un nume public dedicat pentru comunitate. Emailul, datele de abonament, informațiile Stripe și celelalte câmpuri interne din `Useri` nu vor fi expuse public.

Dacă un utilizator are un profil `Autori` public și verificat, comentariile sale pot afișa identitatea profesională, badge-ul verificat și acțiunea `Vezi profilul`.

Badge-ul profesional poate proveni numai din verificarea controlată a profilului `Autori`, nu dintr-un titlu introdus liber de utilizator.

Pentru versiunile RO și EN ale aceluiași material editorial se va utiliza un singur thread de discuție.

Limba originală a comentariului trebuie păstrată. Dacă se oferă traducere cu AI, aceasta trebuie marcată clar și nu trebuie să înlocuiască textul original.

Fluxul public complet de signup, login și publicare a comentariilor trebuie implementat înainte ca funcția de comunitate să fie considerată production-ready.

---

## 10. Ordinea remedierilor

Implementarea va fi împărțită în schimbări mici, independente și verificabile:

```text
REG-001A — Routing + staging SEO
R15 + R16

REG-001B — Model Autori
R09 + R13 + R14

REG-001C — Atribuire editorială
R01 + R10 + R08

REG-001D — Flash architecture
R02 + R06 + R07

REG-001E — Comunitate
R11 + R12 + R03 + R04 + R05
```

Fiecare etapă va fi implementată pe branch separat pornit din `staging`, verificată local, integrată prin PR și validată în staging înainte de continuare.

Nu se fac modificări în producția reală în cadrul acestor etape fără o decizie și o validare separate.

---

## 11. Production readiness

REG-001 nu autorizează promovarea în producție.

Înainte de orice promovare trebuie:

1. remediate findings-urile relevante pentru release;
2. rulate testele automate aferente;
3. validate în staging eventualele migrații necesare;
4. executat smoke-test post-deployment;
5. confirmată funcționalitatea editorială și publică;
6. verificată explicit separarea dintre staging și producție;
7. luată separat decizia de promovare.

**Producția reală rămâne neatinsă până la validarea completă.**
