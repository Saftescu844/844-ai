# UX-001A-05 — Audit Payload CMS și frontend

**Proiect:** 844-ai.ro  
**Mediu analizat:** branch `staging`  
**Data auditului:** 4 august 2026  
**Statut:** în curs de documentare  
**Impact asupra producției:** niciunul

---

## 1. Scopul auditului

Auditul UX-001A-05 urmărește să stabilească situația reală a platformei înainte de introducerea noii arhitecturi editoriale și vizuale.

Obiectivele sunt:

1. inventarierea colecțiilor și funcțiilor existente în Payload CMS;
2. identificarea componentelor care pot fi reutilizate;
3. identificarea lipsurilor de structură editorială și UX;
4. verificarea principalelor riscuri de acces și expunere a datelor;
5. stabilirea arhitecturii necesare pentru:
   - `Homepage`;
   - `SiteSettings`;
   - `FlashAI`;
   - `Autori`;
6. definirea ordinii de implementare fără modificări riscante în producție.

---

## 2. Principii de lucru

Implementarea va respecta următoarele principii:

- toate modificările sunt realizate și testate mai întâi în staging;
- modificările de schemă Payload/PostgreSQL se fac numai prin migrații controlate;
- producția nu este modificată înainte de validarea completă în staging;
- funcționalitățile existente sunt reutilizate atunci când structura lor este adecvată;
- nu se introduc colecții sau câmpuri fără o utilizare clară în frontend;
- securitatea și controlul accesului au prioritate față de extinderea funcțională;
- modificările sunt mici, verificabile și documentate.

---

## 3. Situația tehnică actuală

Platforma utilizează:

- Next.js 16;
- Payload CMS 3;
- React 19;
- PostgreSQL prin Supabase;
- Railway pentru deployment;
- GitHub pentru versionare și integrarea modificărilor.

Mediile de staging și producție sunt separate.

Fluxul controlat de migrații Payload/PostgreSQL este funcțional și documentat. `PAYLOAD_DB_PUSH` este dezactivat în staging și producție, iar migrațiile sunt înregistrate explicit prin `prodMigrations`.

---

## 4. Colecțiile Payload existente

În configurația actuală sunt înregistrate următoarele colecții:

1. `Articole`
2. `Surse`
3. `Categorii`
4. `Useri`
5. `Comentarii`
6. `Tooluri`
7. `Roadmaps`
8. `Cursuri`
9. `CallouriUE`
10. `Newsletter`
11. `Media`

În prezent nu există Payload Globals.

Lipsesc structuri dedicate pentru:

- configurarea homepage-ului;
- configurarea globală a site-ului;
- fluxul editorial `Flash AI`;
- profilurile publice ale autorilor.

---

## 5. Concluzii executive

Auditul confirmă că baza tehnică a platformei este funcțională și poate fi extinsă fără reconstruirea proiectului.

Colecțiile existente pentru articole, categorii, surse, instrumente, cursuri și parcursuri educaționale pot fi păstrate și extinse.

Pentru noua arhitectură sunt necesare:

- un Global `Homepage`;
- un Global `SiteSettings`;
- o colecție `FlashAI`;
- o colecție `Autori`;
- extinderea controlată a colecțiilor existente;
- reorganizarea frontendului public în jurul structurii editoriale aprobate.

Nu este recomandată implementarea imediată a tuturor câmpurilor într-o singură modificare. Arhitectura trebuie introdusă etapizat, cu migrații și testare separată pentru fiecare structură.

---

## 6. Situația securității

Înainte de continuarea lucrărilor UX au fost corectate și validate următoarele probleme critice:

### SEC-001 — Newsletter

- citirea publică a abonaților este blocată;
- crearea directă prin API-ul generic este blocată;
- confirmarea abonării se realizează prin fluxul controlat cu HMAC și double opt-in.

### SEC-002 — Cursuri premium

- cursurile premium nu sunt expuse în lista publică;
- accesarea directă prin URL a unui curs premium neautorizat returnează `404`;
- conținutul lecțiilor premium nu mai este transmis frontendului public.

### SEC-003 — Useri și Admin Payload

- numai rolurile `admin` și `editor` pot accesa Admin Payload;
- utilizatorii obișnuiți pot vedea numai propriul profil;
- câmpurile `rol` și `nivelAbonament` nu pot fi modificate de utilizator;
- datele Stripe sunt accesibile numai administratorului;
- crearea și ștergerea utilizatorilor sunt rezervate administratorului;
- testele de escaladare a privilegiilor au fost trecute cu succes.

Auditul RBAC complet al colecțiilor editoriale este amânat deoarece, în prezent, numai administratorul platformei are acces la editarea conținutului.

Auditul va fi reluat înainte de:

- introducerea conturilor de editor sau colaborator;
- deschiderea fluxurilor editoriale către alte persoane;
- implementarea moderării realizate de mai mulți utilizatori.

---

## 7. Decizia de arhitectură

Arhitectura aprobată pentru etapa următoare este:

### Payload Globals

- `Homepage`
- `SiteSettings`

### Payload Collections

- `FlashAI`
- `Autori`

### Colecții existente care vor fi extinse

- `Articole`
- `Categorii`
- `Surse`
- `Tooluri`
- `Roadmaps`
- `Cursuri`
- `CallouriUE`
- `Media`

Implementarea acestor structuri va începe numai după închiderea documentată a auditului UX-001A-05.

---

## 8. Auditul detaliat al colecțiilor Payload

### 8.1. Articole

Colecția `Articole` reprezintă baza editorială principală și trebuie păstrată.

Funcționalități existente utile:

- flux de stare editorială;
- marcarea conținutului de tip breaking;
- data publicării;
- metadate pentru autopublicare;
- câmpuri SEO;
- generarea și gestionarea slugului;
- detectarea modificărilor între traduceri.

Extinderi recomandate:

- relație cu `Autori`;
- autor principal și autori secundari;
- verificator editorial;
- verificator medical, acolo unde este necesar;
- data ultimei verificări;
- timp estimat de lectură;
- nivel tehnic;
- declarație privind utilizarea AI la redactare;
- istoric al corecțiilor;
- sponsorizări și afilieri;
- nivelul dovezilor pentru conținut medical;
- statutul tehnologiei prezentate;
- marcarea conținutului selectat pentru homepage.

Implementarea câmpurilor medicale trebuie să fie condițională și utilizată numai pentru articolele relevante.

### 8.2. Categorii

Colecția `Categorii` poate fi reutilizată pentru organizarea celor cinci piloni editoriali și pentru subcategoriile tematice.

Extinderi recomandate:

- descriere scurtă;
- pictogramă;
- accent vizual;
- imagine reprezentativă;
- ordine de afișare;
- vizibilitate în meniul principal;
- selecție pentru homepage;
- articol reprezentativ;
- configurare separată pentru limbile română și engleză, unde este necesar.

Nu este necesară introducerea unei colecții distincte pentru piloni dacă structura existentă poate reprezenta corect ierarhia editorială.

### 8.3. Surse

Colecția `Surse` oferă o bază utilă pentru documentarea originii informațiilor.

Problema principală identificată este că `nivelIncredere` combină două concepte diferite:

- rolul sursei în documentare;
- credibilitatea sau autoritatea sursei.

Aceste concepte trebuie separate în câmpuri distincte.

Extinderi recomandate:

- tipul sursei;
- rolul sursei;
- nivelul de autoritate;
- instituția sau publicația;
- autorul sursei;
- data publicării;
- data ultimei verificări;
- URL original;
- identificator DOI, unde există;
- statutul accesului;
- observații editoriale;
- conflicte de interese cunoscute.

Câmpul `permiteAutoGenerare`, care are în prezent valoarea implicită permisivă, trebuie reevaluat înainte de utilizarea automatizării editoriale.

### 8.4. Tooluri

Colecția `Tooluri` este o bază potrivită pentru secțiunea „Instrumente AI verificate”.

Extinderi recomandate:

- scopurile principale;
- publicul țintă;
- avantaje;
- limitări;
- riscuri;
- politica de confidențialitate și utilizarea datelor;
- platformele disponibile;
- disponibilitatea geografică;
- modelul de preț;
- existența unei versiuni gratuite;
- evaluatorul;
- data ultimei evaluări;
- statutul verificării;
- declarația de sponsorizare sau afiliere;
- alternative recomandate;
- selectarea pentru homepage.

A fost identificată și o neconcordanță tehnică: în `defaultColumns` este utilizat numele `categorie`, în timp ce câmpul existent este `categorieTool`.

Această neconcordanță trebuie corectată într-o modificare separată și verificabilă.

### 8.5. Roadmaps

Colecția `Roadmaps` poate fi reutilizată pentru parcursurile de învățare.

Extinderi recomandate:

- publicul țintă;
- nivelul de dificultate;
- descriere introductivă;
- pictogramă;
- ordine de afișare;
- stare editorială;
- durată estimată;
- relații cu `Cursuri`;
- articol introductiv;
- rezultate urmărite;
- selectare pentru homepage.

Roadmap-urile sunt deja citite în frontend, dar nu sunt prezentate utilizatorului în forma actuală a interfeței.

### 8.6. Cursuri

Colecția `Cursuri` oferă baza pentru componenta educațională a platformei.

Extinderi recomandate:

- stare editorială;
- nivel;
- public țintă;
- autor;
- ordine de afișare;
- durată totală;
- obiective de învățare;
- cunoștințe necesare;
- relații cu `Roadmaps`;
- selectare pentru homepage;
- data publicării;
- data ultimei actualizări.

Accesul la cursurile premium a fost securizat prin SEC-002 și trebuie păstrat în toate implementările viitoare.

### 8.7. CallouriUE

Colecția `CallouriUE` este relevantă pentru oportunități, finanțări și apeluri europene.

Extinderi recomandate:

- statutul apelului;
- data verificării;
- termen-limită;
- eligibilitate;
- beneficiari;
- țări sau regiuni eligibile;
- buget;
- sursa oficială;
- persoana care a verificat informația;
- marcarea informațiilor expirate;
- selectarea pentru homepage.

Datele cu termen-limită trebuie afișate numai după verificarea sursei oficiale.

### 8.8. Media

Colecția `Media` include deja dimensiuni de imagine, text alternativ și hashuri utile.

Extinderi recomandate:

- autorul imaginii;
- creditul obligatoriu;
- licența;
- sursa;
- URL-ul original;
- condițiile de utilizare;
- marcarea conținutului generat cu AI;
- instrumentul AI utilizat;
- data generării;
- descriere editorială;
- consimțământ sau drept de utilizare, unde este necesar.

Aceste câmpuri sunt necesare pentru trasabilitate, accesibilitate și respectarea drepturilor de autor.

### 8.9. Useri

Colecția `Useri` trebuie să rămână dedicată autentificării, administrării conturilor și abonamentelor.

Nu trebuie utilizată pentru profilurile publice ale autorilor.

Profilurile publice vor fi gestionate separat prin colecția `Autori`, pentru a evita expunerea datelor de autentificare și pentru a permite colaboratori fără cont administrativ.

Regulile RBAC introduse prin SEC-003 sunt validate și trebuie păstrate.

### 8.10. Comentarii

Colecția `Comentarii` oferă o bază pentru moderare, dar nu este utilizată în prezent de frontendul public.

Probleme identificate:

- utilizatorii autentificați pot vedea mai multe stări decât este necesar;
- la creare pot exista posibilități de control necorespunzător asupra autorului sau stării;
- regulile de actualizare și ștergere trebuie clarificate înainte de activarea comentariilor.

Auditul complet al acestei colecții este amânat până la introducerea efectivă a funcției publice de comentarii.

### 8.11. Newsletter

Colecția `Newsletter` este protejată prin SEC-001.

Fluxul generic Payload nu permite citirea sau crearea publică. Abonarea se realizează prin endpointul controlat, urmat de confirmarea double opt-in.

Îmbunătățiri ulterioare posibile:

- limitarea frecvenței solicitărilor;
- reducerea posibilității de enumerare a adreselor;
- evitarea includerii adresei de e-mail într-o formă reversibilă în URL;
- verificarea strictă a configurării `SITE_URL`;
- oprirea imediată a generării linkului dacă secretul HMAC lipsește.

Aceste îmbunătățiri nu blochează continuarea arhitecturii UX.

### 8.12. Organizarea fișierelor colecțiilor

Mai multe colecții sunt definite în fișierul `RestulColectiilor.ts`, care a devenit dificil de întreținut.

Se recomandă separarea ulterioară în fișiere distincte:

- `Tooluri.ts`;
- `Roadmaps.ts`;
- `Cursuri.ts`;
- `CallouriUE.ts`;
- `Newsletter.ts`.

Refactorizarea trebuie realizată separat de modificările de schemă, pentru a evita combinarea schimbărilor structurale cu schimbările funcționale.

---


---

## 9. Auditul detaliat al frontendului

### 9.1. Structura rutelor publice

Frontendul include în prezent rute localizate pentru:

- homepage;
- articole;
- cursuri;
- roadmaps;
- piloni editoriali;
- pagina despre platformă;
- contact;
- publicitate;
- pagini legale;
- confirmarea newsletterului.

Sunt disponibile și rutele tehnice Payload pentru:

- Admin;
- REST API;
- GraphQL.

Lipsesc în prezent rute publice dedicate pentru:

- `Flash AI`;
- căutare;
- metodologia editorială;
- profilurile autorilor;
- pagina individuală a unui instrument AI;
- istoricul corecțiilor și actualizărilor editoriale.

Pentru noua arhitectură sunt recomandate cel puțin următoarele rute:

- `/ro/flash` și `/en/flash`;
- `/ro/autori/[slug]` și `/en/authors/[slug]`;
- `/ro/instrumente-ai/[slug]` și `/en/ai-tools/[slug]`;
- `/ro/metodologie` și `/en/methodology`;
- o rută de căutare localizată.

### 9.2. Accesul la date

Fișierul `src/lib/payload.ts` centralizează principalele operații de citire din Payload CMS.

Această abordare este utilă și trebuie păstrată, deoarece:

- reduce duplicarea interogărilor;
- facilitează controlul accesului;
- permite aplicarea regulilor editoriale într-un singur loc;
- simplifică testarea și modificarea ulterioară a frontendului.

Problemele identificate sunt:

- unele interogări returnează mai multe date decât sunt necesare componentelor;
- regulile de publicare nu sunt încă uniforme pentru toate tipurile de conținut;
- selecțiile editoriale pentru homepage nu sunt separate de listele cronologice;
- fallbackurile nu sunt definite explicit;
- nu există funcții dedicate pentru `Homepage`, `SiteSettings`, `FlashAI` și `Autori`.

Noua arhitectură trebuie să introducă funcții distincte și tipizate pentru fiecare structură.

### 9.3. Homepage-ul actual

Homepage-ul actual afișează în principal cele mai recente articole.

Au fost identificate următoarele limitări:

- sunt încărcate până la 15 articole recente fără o ierarhie editorială suficientă;
- nu există o selecție controlată pentru conținutul prioritar;
- lipsesc secțiunile editoriale aprobate;
- o parte din stilizare este definită inline;
- componentele nu reflectă încă structura „Înțelege. Învață. Aplică.”;
- nu există o separare clară între știri rapide, articole importante și conținut educațional;
- roadmaps sunt citite din Payload, dar nu sunt afișate efectiv;
- instrumentele AI nu sunt prezentate ca evaluări editoriale complete;
- secțiunea de sănătate nu reflectă încă direcția strategică aprobată.

Homepage-ul trebuie reconstruit pe baza Globalului `Homepage`, fără eliminarea posibilității de fallback automat.

Ordinea aprobată este:

1. Header
2. Hero editorial
3. Trust bar
4. Flash AI
5. Înțelege / Învață / Aplică
6. AI în sănătate
7. Ce este important acum
8. Cei cinci piloni
9. Începe să înveți AI
10. Instrument AI analizat
11. Ultimele articole
12. Cum lucrăm
13. Newsletter
14. Footer

### 9.4. Cardurile de conținut

În implementarea actuală există suprapuneri și duplicări între componentele de card.

Probleme identificate:

- extrasele sunt uneori limitate prin tăiere directă a textului;
- aceeași logică este reimplementată în mai multe componente;
- etichetele tipului de conținut nu reflectă întotdeauna tipul real;
- conținutul de tip `ghid` poate fi prezentat ca „Știre”;
- metadatele afișate nu sunt uniforme;
- nu există variante clare pentru card editorial, card compact, card Flash AI și card educațional.

Se recomandă definirea unui sistem coerent de componente:

- `ArticleCard`;
- `CompactArticleCard`;
- `FlashCard`;
- `LearningPathCard`;
- `ToolReviewCard`;
- `AuthorCard`.

Fiecare componentă trebuie să primească numai datele necesare afișării sale.

### 9.5. Navigația și configurarea globală

Headerul și footerul sunt în mare parte statice.

Limitări identificate:

- meniul nu este administrabil din Payload;
- nu există acces direct la `Flash AI`;
- nu există căutare;
- selectorul de limbă nu este integrat într-o configurație globală;
- linkurile legale și editoriale nu sunt gestionate centralizat;
- nu există o bară de încredere configurabilă;
- identitatea site-ului este dispersată în cod.

Globalul `SiteSettings` trebuie să controleze:

- numele și identitatea site-ului;
- logo-ul;
- navigația principală;
- limbile disponibile;
- bara de încredere;
- linkul către metodologie;
- configurarea newsletterului;
- footerul;
- linkurile legale;
- informațiile de contact;
- linkurile sociale;
- textele editoriale globale.

### 9.6. Pagina unui articol

Pagina articolului oferă baza necesară pentru afișarea conținutului editorial, dar trebuie extinsă.

Elemente recomandate:

- autor și profil public;
- verificator editorial;
- verificator medical, dacă este cazul;
- data publicării;
- data ultimei actualizări;
- data ultimei verificări;
- timpul de lectură;
- nivelul tehnic;
- sursele utilizate;
- nivelul dovezilor;
- statutul tehnologiei;
- declarația privind utilizarea AI;
- sponsorizări și afilieri;
- istoricul corecțiilor;
- articole asociate;
- avertisment medical contextual.

Metadatele medicale nu trebuie afișate pentru articolele care nu aparțin domeniului sănătății.

### 9.7. Sănătate și încredere editorială

Direcția strategică aprobată este:

> AI ca a doua opinie digitală și instrument de sprijin pentru decizia clinică.

Domeniile emblematice sunt:

- Diagnostic și imagistică;
- Asistență clinică;
- AI pentru pacienți;
- Sănătate mintală.

În implementarea actuală, zona de sănătate nu include complet toate aceste direcții. Subcategoria sănătății mintale nu este reprezentată suficient în logica frontendului.

Conținutul medical trebuie să afișeze clar:

- nivelul dovezilor;
- stadiul tehnologiei;
- limitele și riscurile;
- existența validării clinice;
- producătorul;
- finanțarea;
- conflictele de interese;
- sursele;
- data verificării;
- istoricul actualizărilor.

Platforma nu trebuie să prezinte instrumentele AI ca înlocuitori ai medicului sau ai deciziei clinice.

### 9.8. Instrumentele AI

În frontendul actual, linkurile instrumentelor sunt tratate într-un mod prea general.

A fost identificată problema că linkurile pot primi atributul `sponsored` chiar și atunci când nu există o relație comercială sau de afiliere.

Atributul trebuie aplicat numai atunci când relația este declarată explicit.

Alte lipsuri:

- nu există pagină internă de detaliu pentru fiecare instrument;
- avantajele și limitările nu sunt structurate;
- riscurile privind datele nu sunt afișate;
- modelul de preț nu este suficient detaliat;
- evaluarea și data verificării nu sunt vizibile;
- alternativele nu sunt prezentate.

Instrumentele trebuie prezentate ca evaluări editoriale, nu doar ca linkuri externe.

### 9.9. Cursuri și roadmaps

Frontendul include rute pentru cursuri și roadmaps, dar componenta educațională este incompletă.

Probleme identificate:

- roadmaps sunt încărcate, dar nu sunt afișate pe homepage;
- cursurile nu au un flux editorial complet;
- lipsesc nivelul, publicul țintă, obiectivele și prerechizitele;
- relațiile dintre cursuri și roadmaps nu sunt prezentate;
- durata totală și progresul nu sunt structurate;
- starea editorială nu este suficient de clară;
- pagina educațională nu diferențiază suficient începătorii de utilizatorii avansați.

Accesul premium securizat prin SEC-002 trebuie menținut.

### 9.10. Localizare și limbă

Frontendul utilizează rute localizate, dar documentul HTML rădăcină păstrează în prezent `lang="en"` indiferent de limba paginii.

Acest comportament trebuie corectat pentru:

- accesibilitate;
- cititoare de ecran;
- motoare de căutare;
- pronunția corectă a textului;
- metadatele sociale și editoriale.

Valorile recomandate sunt:

- `ro` pentru paginile în limba română;
- `en` pentru paginile în limba engleză.

Conținutul și metadatele trebuie să respecte limba rutei active.

### 9.11. Structura semantică și accesibilitatea

Au fost identificate următoarele probleme:

- elemente `<main>` imbricate;
- stiluri inline dispersate;
- lipsa unui sistem coerent pentru stările de focus;
- suport insuficient pentru `prefers-reduced-motion`;
- comportament responsive incomplet;
- unele acordioane nu expun corect atributele ARIA;
- ierarhia titlurilor trebuie verificată;
- elementele interactive nu au întotdeauna stări clare pentru tastatură.

Recomandări:

- o singură regiune `<main>` pe pagină;
- focus vizibil pentru toate controalele;
- navigare completă cu tastatura;
- atribute `aria-expanded` și `aria-controls`;
- respectarea preferinței pentru mișcare redusă;
- contrast verificabil;
- text alternativ relevant;
- componente semantice reutilizabile.

### 9.12. Stilizare și design system

CSS-ul actual nu formează încă un design system complet.

Sunt necesare:

- variabile pentru spațiere;
- scară tipografică;
- dimensiuni standard pentru containere;
- reguli pentru culori și contraste;
- stiluri pentru titluri și corp de text;
- variante pentru carduri;
- butoane primare și secundare;
- etichete editoriale;
- stări de hover, focus, active și disabled;
- breakpointuri coerente;
- reguli pentru imagini și media;
- reguli pentru conținut editorial lung.

Implementarea design systemului trebuie realizată înainte sau împreună cu reconstrucția homepage-ului, nu prin adăugarea continuă de stiluri inline.

### 9.13. Video și conținut încorporat

URL-urile utilizate pentru iframe-uri video trebuie validate.

Riscurile identificate sunt:

- introducerea unor domenii nepermise;
- conținut încorporat neverificat;
- probleme de confidențialitate;
- inconsistență între formatele URL.

Se recomandă:

- o listă explicită de furnizori acceptați;
- validarea URL-ului la salvare;
- transformarea URL-urilor în format embed controlat;
- titlu obligatoriu pentru iframe;
- încărcare întârziată;
- documentarea implicațiilor de confidențialitate.

### 9.14. Performanță și cantitatea de date

Interogările frontend trebuie revizuite odată cu introducerea noilor structuri.

Principii recomandate:

- selectarea numai a câmpurilor necesare;
- limitarea adâncimii relațiilor;
- evitarea încărcării întregului conținut pentru carduri;
- paginare pentru liste;
- fallback controlat;
- optimizarea imaginilor;
- evitarea cererilor duplicate;
- folosirea cache-ului numai unde este compatibil cu actualizarea editorială;
- invalidarea coerentă după publicare.

### 9.15. Concluzia auditului frontend

Frontendul actual oferă o bază funcțională, dar este orientat în principal către afișarea cronologică a articolelor.

Pentru obiectivul editorial al platformei este necesară trecerea la o arhitectură controlată prin Payload, în care:

- homepage-ul este curatoriat;
- setările globale sunt administrabile;
- conținutul rapid este separat prin `FlashAI`;
- autorii au profiluri publice;
- instrumentele sunt evaluate editorial;
- conținutul medical include dovezi și limite;
- traseele educaționale sunt vizibile;
- accesibilitatea și design systemul sunt tratate sistematic.

Această reorganizare poate fi realizată incremental, fără reconstruirea completă a aplicației.

---

## 10. Priorități și ordine de implementare

### 10.1. Prioritatea P0 — Riscuri critice

Următoarele probleme critice au fost deja rezolvate și validate în staging:

- SEC-001 — protecția colecției `Newsletter`;
- SEC-002 — protecția cursurilor premium;
- SEC-003 — securizarea colecției `Useri` și a accesului în Admin Payload.

Nu sunt necesare alte intervenții P0 înainte de continuarea arhitecturii UX.

Auditul RBAC al colecțiilor editoriale rămâne amânat cât timp numai administratorul platformei are acces la Payload.

### 10.2. Prioritatea P1 — Arhitectura editorială de bază

Următoarea etapă trebuie să definească în detaliu:

1. Globalul `SiteSettings`;
2. colecția `Autori`;
3. colecția `FlashAI`;
4. Globalul `Homepage`.

Fiecare structură trebuie documentată înainte de implementare, incluzând:

- scopul;
- câmpurile;
- tipurile Payload;
- validările;
- relațiile;
- regulile de acces;
- localizarea;
- utilizarea în frontend;
- fallbackurile;
- impactul asupra bazei de date;
- strategia de migrare;
- criteriile de testare.

### 10.3. Ordinea recomandată pentru implementarea Payload

Ordinea recomandată este:

#### Etapa 1 — `SiteSettings`

Motiv:

- oferă configurația globală necesară pentru header, footer, navigație, limbi, trust bar și informațiile editoriale comune;
- are dependențe reduse față de celelalte structuri;
- poate fi testat separat în frontend.

#### Etapa 2 — `Autori`

Motiv:

- separă profilurile publice de conturile de autentificare;
- va putea fi utilizat ulterior de `Articole`, `Cursuri`, `Tooluri` și alte colecții;
- trebuie să existe înainte de introducerea relațiilor editoriale cu autorii.

#### Etapa 3 — `FlashAI`

Motiv:

- reprezintă un flux editorial distinct;
- are nevoie de categorii, surse și eventual autori;
- necesită rute și componente frontend proprii;
- poate fi testat independent înainte de integrarea în homepage.

#### Etapa 4 — `Homepage`

Motiv:

- depinde de conținutul și configurațiile celorlalte structuri;
- va agrega articole, Flash AI, categorii, roadmaps, cursuri și instrumente;
- trebuie implementat după stabilizarea relațiilor și fallbackurilor.

### 10.4. Regula pentru modificările de schemă

Fiecare structură va fi implementată într-un branch și PR separat.

Pentru fiecare modificare de schemă sunt obligatorii:

1. crearea branch-ului din `staging`;
2. modificarea configurației Payload;
3. generarea migrației;
4. inspectarea manuală a migrației;
5. verificarea TypeScript;
6. build de producție;
7. `git diff --check`;
8. PR către `staging`;
9. deployment manual în Railway staging;
10. verificarea stării migrațiilor;
11. testarea în Admin Payload;
12. testarea frontendului relevant;
13. curățarea datelor temporare;
14. documentarea rezultatului.

Producția nu va fi modificată înainte de validarea cumulată a noii arhitecturi în staging.

### 10.5. Prioritatea P2 — Integrarea frontendului

După implementarea structurilor Payload se vor realiza:

- citirea tipizată a Globalurilor și colecțiilor;
- header și footer configurabile;
- rutele `Flash AI`;
- profilurile publice ale autorilor;
- componentele de card;
- homepage-ul curatoriat;
- fallbackurile editoriale;
- metadatele medicale condiționale;
- paginile instrumentelor AI;
- integrarea roadmaps și cursurilor.

Integrarea frontend trebuie împărțită în modificări mici și verificabile.

### 10.6. Prioritatea P3 — Design system și accesibilitate

După stabilizarea structurii de date și a componentelor principale se vor introduce:

- variabilele de design;
- scara tipografică;
- sistemul de spațiere;
- variantele de carduri și butoane;
- stările de focus;
- regulile responsive;
- suportul pentru mișcare redusă;
- corectarea structurii semantice;
- verificarea contrastului;
- îmbunătățirea navigării cu tastatura.

Design systemul nu trebuie să blocheze definirea arhitecturii Payload, dar trebuie stabilizat înainte de finalizarea homepage-ului public.

---

## 11. Decizii și elemente amânate

Următoarele elemente nu fac parte din implementarea imediată:

- activarea publică a comentariilor;
- auditul RBAC complet al colecțiilor editoriale;
- conturi pentru colaboratori sau editori suplimentari;
- automatizare editorială bazată pe `permiteAutoGenerare`;
- refactorizarea completă a fișierului `RestulColectiilor.ts`;
- sistem complet de progres educațional;
- plăți și administrarea publică a abonamentelor;
- migrarea în producție a noii arhitecturi.

Aceste elemente vor fi reevaluate atunci când există o nevoie operațională clară.

---

## 12. Criterii de închidere pentru UX-001A-05

Auditul UX-001A-05 este considerat finalizat deoarece:

- colecțiile Payload existente au fost inventariate;
- funcțiile reutilizabile au fost identificate;
- lipsurile de structură editorială au fost documentate;
- frontendul actual a fost analizat;
- problemele critice de securitate au fost tratate;
- structurile noi necesare au fost aprobate;
- ordinea de implementare a fost stabilită;
- elementele amânate au fost delimitate;
- procesul de implementare și migrare a fost definit.

---

## 13. Rezultatul auditului

**Statut UX-001A-05:** finalizat.

Următoarea activitate este definirea arhitecturii tehnice și editoriale pentru:

1. `SiteSettings`;
2. `Autori`;
3. `FlashAI`;
4. `Homepage`.

Definirea arhitecturii va fi realizată înainte de orice modificare de schemă sau migrare a bazei de date.
