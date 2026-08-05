# UX-001A-07 — Arhitectura colecției Autori

**Proiect:** 844-ai.ro
**Mediu de lucru:** branch `docs/ux-001a-07-autori`
**Data definirii:** 5 august 2026
**Statut:** arhitectură în curs de documentare
**Tip structură Payload:** Collection
**Impact curent asupra bazei de date:** niciunul
**Impact asupra producției:** niciunul

---

## 1. Scop

Colecția `Autori` va administra profilurile publice ale persoanelor care contribuie editorial la platforma 844-ai.ro.

Structura va separa clar identitatea editorială publică de conturile tehnice de autentificare din colecția `Useri`.

Colecția va putea reprezenta:

- autori de articole;
- verificatori editoriali;
- verificatori medicali;
- evaluatori de instrumente AI;
- autori de cursuri;
- colaboratori externi fără acces în Admin Payload.

`Autori` nu va fi o colecție de autentificare și nu va conține parole, sesiuni, abonamente sau date Stripe.

---

## 2. Obiective

Implementarea colecției `Autori` urmărește:

1. separarea profilurilor publice de conturile `Useri`;
2. afișarea clară a responsabilității editoriale;
3. prezentarea competențelor și rolurilor fiecărui contributor;
4. susținerea verificării editoriale și medicale;
5. permiterea colaboratorilor fără acces administrativ;
6. reutilizarea profilurilor în articole, cursuri și evaluări de instrumente;
7. crearea unor pagini publice dedicate autorilor;
8. îmbunătățirea transparenței și încrederii editoriale;
9. evitarea expunerii datelor de autentificare;
10. pregătirea platformei pentru o viitoare echipă editorială.

---

## 3. Elemente care nu aparțin în Autori

Colecția `Autori` nu va administra:

- autentificarea în platformă;
- parole sau metode de resetare a parolei;
- sesiuni și tokenuri;
- rolurile de acces în Admin Payload;
- nivelurile de abonament;
- identificatori Stripe;
- date de facturare;
- preferințe private ale utilizatorului;
- adrese private sau documente de identitate;
- informații medicale personale;
- contracte și documente administrative;
- configurații secrete;
- chei API sau variabile de mediu.

Aceste informații vor rămâne în colecția `Useri` sau în sistemele tehnice și administrative dedicate.

Profilul public al unui autor trebuie să conțină numai informații aprobate explicit pentru publicare.

---

## 4. Decizia de arhitectură

`Autori` va fi implementată ca Payload Collection, nu ca Global și nu ca extensie directă a colecției `Useri`.

Colecția va permite existența mai multor profiluri editoriale publice și relaționarea acestora cu diferite tipuri de conținut.

Avantajele utilizării unei colecții separate sunt:

- fiecare autor are propriul document public;
- profilurile pot exista fără cont de autentificare;
- datele publice sunt separate de datele tehnice și private;
- același autor poate fi asociat cu articole, cursuri și instrumente AI;
- pot fi reprezentate roluri editoriale și medicale distincte;
- profilurile pot avea pagini publice și sluguri proprii;
- relațiile editoriale pot fi administrate fără expunerea colecției `Useri`.

Slugul tehnic recomandat este `autori`.

Denumirea afișată în Admin Payload este `Autori`.

---

## 5. Principii de proiectare

### 5.1. Separarea datelor publice de datele private

Colecția `Autori` va conține exclusiv informații aprobate pentru afișare publică.

Datele de autentificare, contactele private și informațiile administrative vor rămâne în sistemele dedicate.

### 5.2. Profil editorial independent de autentificare

Un profil de autor trebuie să poată exista fără un cont în colecția `Useri`.

Această regulă permite colaboratori externi, experți invitați și verificatori fără acces în Admin Payload.

### 5.3. Competențe verificabile

Titlurile profesionale, specializările și rolurile publice trebuie introduse numai pe baza informațiilor confirmate.

Colecția nu trebuie să permită formulări care sugerează calificări medicale, academice sau profesionale neverificate.

### 5.4. Responsabilitate editorială clară

Relațiile cu articolele și celelalte tipuri de conținut trebuie să distingă clar între:

- autor;
- coautor;
- verificator editorial;
- verificator medical;
- evaluator de instrumente AI;
- autor de curs.

### 5.5. Consimțământ pentru publicare

Profilul public trebuie publicat numai după confirmarea că persoana acceptă afișarea informațiilor sale.

Fotografia, biografia, calificările și linkurile externe trebuie să fie aprobate pentru utilizare publică.

### 5.6. Localizare controlată

Textele editoriale ale profilului trebuie să poată fi administrate separat în română și engleză.

Datele factuale comune, precum numele sau identificatorii profesionali, nu trebuie duplicate inutil.

### 5.7. Fallbackuri sigure

Lipsa fotografiei, a biografiei extinse sau a linkurilor externe nu trebuie să blocheze afișarea profilului.

Frontendul va utiliza valori implicite și va ascunde secțiunile fără conținut valid.

---

## 6. Localizare

Colecția `Autori` trebuie să suporte profiluri publice în limbile română și engleză.

Strategia recomandată este localizarea numai a câmpurilor editoriale care necesită traducere.

### 6.1. Câmpuri localizate

Vor fi localizate:

- biografia scurtă;
- biografia extinsă;
- titulatura publică afișată;
- descrierea competențelor;
- descrierea rolului editorial;
- afilierea prezentată public, dacă necesită adaptare lingvistică;
- etichetele și textele SEO;
- declarațiile publice privind conflictele de interese;
- textele privind consimțământul sau transparența editorială.

### 6.2. Câmpuri nelocalizate

Nu vor fi localizate automat:

- numele complet;
- slugul tehnic, dacă se utilizează aceeași adresă în ambele limbi;
- fotografia;
- adresa profesională de e-mail publică;
- URL-urile externe;
- conturile sociale;
- identificatorii profesionali;
- valorile booleene;
- ordinea de afișare;
- starea editorială;
- datele de publicare și verificare.

### 6.3. Fallbackuri între limbi

Dacă o traducere lipsește, frontendul poate utiliza temporar valoarea din limba implicită, numai dacă aceasta este publicabilă și clar identificată.

Lipsa unei biografii traduse nu trebuie să blocheze afișarea numelui, fotografiei și rolurilor factuale.

### 6.4. Rutele publice

Rutele recomandate sunt:

- `/ro/autori/[slug]`;
- `/en/authors/[slug]`.

Frontendul trebuie să genereze ruta potrivită limbii active și să păstreze legătura dintre versiunile română și engleză ale aceluiași profil.

### 6.5. Reguli de consistență

- traducerile nu trebuie să modifice faptele profesionale;
- calificările și afilierile trebuie să rămână echivalente între limbi;
- formulările medicale sau academice nu trebuie amplificate prin traducere;
- lipsa unei traduceri trebuie tratată prin fallback, nu prin inventarea conținutului;
- actualizările importante trebuie verificate în ambele limbi.

---

## 7. Reguli de acces

Regulile de acces trebuie să protejeze profilurile nepublicate și să permită citirea publică numai a informațiilor aprobate editorial.

În prima implementare, administrarea colecției va rămâne rezervată administratorului platformei.

### 7.1. Citire publică

- vizitatorii pot citi numai profilurile cu starea `publicat`;
- profilurile de tip `draft`, `inactiv` sau `arhivat` nu vor fi returnate public;
- răspunsul public trebuie să conțină exclusiv câmpuri aprobate pentru afișare;
- informațiile interne de verificare și administrare nu vor fi expuse frontendului;
- accesarea directă a unui profil nepublicat trebuie să returneze `404` sau un rezultat echivalent fără date.

### 7.2. Creare

- crearea profilurilor este permisă numai rolului `admin` în prima implementare;
- rolul `editor` nu primește inițial drept de creare;
- colaboratorii externi nu au nevoie de cont Payload pentru a avea un profil public;
- crearea prin API public trebuie blocată.

### 7.3. Actualizare

- actualizarea este permisă numai rolului `admin` în prima implementare;
- modificarea stării editoriale trebuie protejată explicit;
- câmpurile interne de verificare nu pot fi modificate public;
- accesul editorilor poate fi introdus ulterior printr-un audit RBAC separat.

### 7.4. Ștergere

- ștergerea este permisă numai administratorului;
- profilurile deja asociate cu articole sau alte documente nu trebuie șterse fără verificarea relațiilor;
- pentru profilurile istorice este preferată starea `arhivat` în locul ștergerii definitive;
- ștergerea prin API public trebuie blocată.

### 7.5. Vizibilitatea în Admin Payload

- colecția este vizibilă utilizatorilor care au acces în Admin Payload;
- dreptul de a vedea colecția nu implică automat dreptul de modificare;
- în prima implementare, numai administratorul poate crea, actualiza sau șterge profiluri.

### 7.6. Separarea de colecția Useri

- colecția `Autori` nu va utiliza autentificare proprie;
- relația opțională cu un cont `Useri` nu va fi publică;
- existența unui profil de autor nu acordă acces în Admin Payload;
- existența unui cont `Useri` nu creează automat un profil public de autor;
- rolurile editoriale publice nu trebuie confundate cu rolurile RBAC tehnice.

### 7.7. Principiul expunerii minime

Frontendul nu va primi documentul Payload complet.

O funcție dedicată va selecta și normaliza numai câmpurile necesare paginilor publice și cardurilor de autor.

---

## 8. Structura generală propusă

Colecția `Autori` va fi organizată în taburi și grupuri clare, pentru a separa informațiile publice de datele interne de verificare.

Structura logică recomandată include:

1. `identity`;
2. `publicProfile`;
3. `editorialRoles`;
4. `expertise`;
5. `professionalCredentials`;
6. `publicLinks`;
7. `transparency`;
8. `relationships`;
9. `seo`;
10. `publication`;
11. `internalVerification`.

### 8.1. Tab Identitate

Va conține informațiile factuale de identificare publică:

- numele complet;
- slugul;
- fotografia de profil;
- titulatura publică;
- afilierea principală;
- localitatea sau țara afișată public, numai când este justificat.

### 8.2. Tab Profil public

Va conține:

- biografia scurtă;
- biografia extinsă;
- descrierea rolului în platformă;
- informațiile publice suplimentare aprobate;
- ordinea de afișare în listele editoriale.

### 8.3. Tab Roluri și competențe

Va conține:

- rolurile editoriale;
- domeniile de expertiză;
- specializările;
- nivelul de implicare;
- tipurile de conținut la care poate contribui;
- marcarea verificatorului medical, unde este cazul.

### 8.4. Tab Calificări profesionale

Va conține informații verificabile precum:

- calificări academice;
- titluri profesionale;
- instituții de afiliere;
- certificări relevante;
- identificatori profesionali publici;
- sursa și data verificării calificărilor.

### 8.5. Tab Linkuri publice

Va conține:

- pagina profesională;
- profilul instituțional;
- ORCID, unde există;
- LinkedIn;
- alte profiluri profesionale aprobate;
- adresa profesională de e-mail publică, numai dacă publicarea este acceptată.

### 8.6. Tab Transparență

Va conține:

- declarația privind conflictele de interese;
- sponsorizări sau afilieri relevante;
- declarația privind utilizarea AI;
- consimțământul pentru publicarea profilului;
- data ultimei verificări publice.

### 8.7. Tab Relații editoriale și SEO

Va conține:

- relația opțională și internă cu `Useri`;
- relațiile inverse gestionate prin articole, cursuri și instrumente;
- titlul SEO;
- descrierea SEO;
- imaginea socială opțională;
- setările publice de indexare.

### 8.8. Tab Publicare și verificare internă

Va conține:

- starea editorială;
- data publicării;
- data ultimei actualizări;
- data ultimei verificări;
- persoana care a verificat profilul;
- observații interne;
- motivul arhivării sau dezactivării;
- confirmarea documentată a consimțământului.

Câmpurile interne nu vor fi incluse în răspunsurile publice ale frontendului.

---

## 9. Relația cu celelalte structuri

Colecția `Autori` va funcționa ca sursă centrală pentru identitatea editorială publică și va fi relaționată controlat cu structurile care publică sau verifică informații.

### 9.1. Relația cu Articole

Colecția `Articole` trebuie să poată utiliza relații distincte pentru:

- autor principal;
- coautori;
- verificator editorial;
- verificator medical;
- evaluator sau expert contributor.

Rolul unei persoane într-un articol trebuie definit de câmpul relației din articol, nu numai de rolurile generale declarate în profilul autorului.

Frontendul trebuie să afișeze clar contribuția fiecărei persoane.

### 9.2. Relația cu Cursuri

Colecția `Cursuri` trebuie să poată selecta:

- autorul principal;
- instructorii;
- colaboratorii;
- verificatorii conținutului.

Profilul public al autorului poate afișa cursurile publicate, dar lista trebuie construită prin interogări controlate și numai din documente publice.

### 9.3. Relația cu Tooluri

Colecția `Tooluri` poate utiliza `Autori` pentru:

- evaluatorul principal;
- verificatorul evaluării;
- expertul medical sau tehnic;
- persoana care a realizat ultima actualizare editorială.

Relația nu trebuie să sugereze că autorul reprezintă producătorul instrumentului, dacă această afiliere nu este declarată explicit.

### 9.4. Relația cu Roadmaps

Colecția `Roadmaps` poate utiliza relații către:

- autorul parcursului;
- curatorul conținutului;
- verificatorul editorial;
- expertul de domeniu.

Profilul autorului poate afișa roadmaps publice asociate, fără a expune documente în draft.

### 9.5. Relația cu FlashAI

Colecția `FlashAI` poate include opțional:

- autorul elementului;
- persoana care a verificat informația;
- expertul care a validat un element medical sau tehnic.

Pentru elementele foarte scurte, afișarea autorului poate fi compactă, dar responsabilitatea editorială trebuie să rămână trasabilă.

### 9.6. Relația cu Useri

Relația cu `Useri` va fi opțională și utilizată numai intern.

Scopurile posibile sunt:

- asocierea unui profil public cu un administrator sau editor autentificat;
- identificarea persoanei care poate gestiona propriul profil în viitor;
- trasabilitatea internă a modificărilor.

Relația nu va fi inclusă în răspunsurile publice și nu va acorda automat drepturi de acces.

### 9.7. Relația cu Media

Fotografia de profil și imaginea socială vor utiliza relații către colecția `Media`.

Resursele Media trebuie să păstreze:

- text alternativ;
- credit;
- licență sau drept de utilizare;
- sursă;
- marcarea conținutului generat cu AI, dacă este cazul.

### 9.8. Relația cu SiteSettings și Homepage

`SiteSettings` nu va stoca profiluri de autori.

Globalul `Homepage` poate selecta autori pentru secțiuni editoriale viitoare, însă profilurile și datele lor vor proveni exclusiv din colecția `Autori`.

### 9.9. Relațiile inverse

În prima implementare nu este obligatorie stocarea manuală a listelor de articole, cursuri sau instrumente în documentul autorului.

Listele publice pot fi construite prin interogarea documentelor care conțin relația către autor.

Această abordare reduce duplicarea datelor și riscul relațiilor neactualizate.

---

## 10. Identitate și profil public

Această secțiune definește câmpurile publice principale ale colecției `Autori`.

### 10.1. Câmpul fullName

- nume tehnic: `fullName`;
- tip Payload: `text`;
- obligatoriu: da;
- localizat: nu;
- indexat: da;
- lungime maximă recomandată: 150 de caractere;
- scop: numele complet afișat public.

Valoarea trebuie curățată de spațiile inutile și nu poate conține numai spații.

### 10.2. Câmpul slug

- nume tehnic: `slug`;
- tip Payload: `text`;
- obligatoriu: da;
- unic: da;
- indexat: da;
- localizat: nu în prima implementare;
- scop: identificatorul utilizat în ruta publică a autorului.

Slugul trebuie să:

- conțină numai litere mici, cifre și cratime;
- fie generat inițial din numele autorului;
- poată fi ajustat manual de administrator;
- nu se modifice automat după publicarea profilului;
- evite coliziunile cu alte profiluri.

### 10.3. Câmpul publicTitle

- nume tehnic: `publicTitle`;
- tip Payload: `text`;
- obligatoriu: nu;
- localizat: da;
- lungime maximă recomandată: 160 de caractere;
- scop: titulatura profesională afișată lângă nume.

Titlurile medicale, academice și profesionale trebuie utilizate numai după verificare.

### 10.4. Câmpul primaryAffiliation

- nume tehnic: `primaryAffiliation`;
- tip Payload: `text`;
- obligatoriu: nu;
- localizat: da;
- lungime maximă recomandată: 180 de caractere;
- scop: instituția, organizația sau afilierea profesională principală afișată public.

Afilierea trebuie prezentată factual și nu trebuie să sugereze susținerea platformei de către instituție fără acord explicit.

### 10.5. Câmpul profileImage

- nume tehnic: `profileImage`;
- tip Payload: `upload`;
- relație: colecția `media`;
- obligatoriu: nu;
- localizat: nu;
- scop: fotografia publică a autorului.

În lipsa fotografiei, frontendul va utiliza un avatar neutru sau inițialele numelui.

### 10.6. Câmpul shortBio

- nume tehnic: `shortBio`;
- tip Payload: `textarea`;
- obligatoriu: recomandat pentru publicare;
- localizat: da;
- lungime maximă recomandată: 400 de caractere;
- scop: descrierea compactă utilizată în carduri și în antetul profilului.

Câmpul nu va accepta HTML arbitrar.

### 10.7. Câmpul biography

- nume tehnic: `biography`;
- tip Payload: `richText`;
- obligatoriu: nu;
- localizat: da;
- scop: biografia publică extinsă.

Editorul trebuie limitat la funcții editoriale controlate și nu va permite scripturi, iframe-uri sau HTML arbitrar.

### 10.8. Câmpul platformRoleDescription

- nume tehnic: `platformRoleDescription`;
- tip Payload: `textarea`;
- obligatoriu: nu;
- localizat: da;
- lungime maximă recomandată: 500 de caractere;
- scop: explicarea contribuției persoanei în cadrul platformei 844-ai.ro.

### 10.9. Câmpul publicLocation

- nume tehnic: `publicLocation`;
- tip Payload: `text`;
- obligatoriu: nu;
- localizat: da;
- scop: afișarea unei localizări generale, precum orașul sau țara;
- nu va conține adrese exacte sau alte informații de localizare privată.

### 10.10. Câmpul displayOrder

- nume tehnic: `displayOrder`;
- tip Payload: `number`;
- obligatoriu: nu;
- localizat: nu;
- valoare implicită recomandată: 100;
- scop: ordinea controlată în listele editoriale de autori.

### 10.11. Reguli de afișare

- numele complet este singurul câmp public obligatoriu la nivel tehnic;
- publicarea editorială trebuie să solicite și o biografie scurtă;
- câmpurile goale nu vor produce titluri sau secțiuni fără conținut;
- fotografia trebuie să aibă text alternativ și drept de utilizare documentat;
- informațiile profesionale trebuie să fie confirmate înainte de publicare;
- frontendul va utiliza numai câmpurile normalizate și aprobate public.

---

## 11. Roluri editoriale și domenii de expertiză

Această secțiune definește rolurile generale și competențele publice ale autorului.

Rolurile generale indică tipurile de contribuții pe care persoana le poate avea în platformă. Rolul efectiv într-un document va fi stabilit prin relația din articol, curs, roadmap sau evaluare.

### 11.1. Câmpul editorialRoles

- nume tehnic: `editorialRoles`;
- tip Payload: `select` cu selecție multiplă;
- obligatoriu: da pentru publicare;
- localizat: nu;
- scop: declararea rolurilor generale ale persoanei în platformă.

Valorile inițiale recomandate sunt:

- `author` — autor;
- `coauthor` — coautor;
- `editorialReviewer` — verificator editorial;
- `medicalReviewer` — verificator medical;
- `technicalReviewer` — verificator tehnic;
- `toolEvaluator` — evaluator de instrumente AI;
- `courseAuthor` — autor de curs;
- `instructor` — instructor;
- `contentCurator` — curator de conținut;
- `externalExpert` — expert extern.

### 11.2. Reguli pentru editorialRoles

- trebuie selectat cel puțin un rol înainte de publicare;
- rolurile nu acordă acces în Admin Payload;
- rolurile nu înlocuiesc regulile RBAC din colecția `Useri`;
- rolul `medicalReviewer` poate fi selectat numai după verificarea calificărilor relevante;
- rolul efectiv într-un articol trebuie definit separat în colecția `Articole`;
- frontendul va afișa numai etichetele localizate asociate valorilor controlate.

### 11.3. Câmpul expertiseAreas

- nume tehnic: `expertiseAreas`;
- tip Payload: `array`;
- obligatoriu: recomandat pentru publicare;
- localizat: parțial;
- scop: prezentarea domeniilor în care autorul are experiență relevantă.

Fiecare element va conține:

- `name`: câmp `text`, obligatoriu și localizat;
- `description`: câmp `textarea`, opțional și localizat;
- `verified`: câmp `checkbox`, utilizat intern;
- `order`: câmp `number`.

### 11.4. Domenii inițiale recomandate

Structura trebuie să poată reprezenta domenii precum:

- inteligență artificială;
- machine learning;
- diagnostic și imagistică medicală;
- asistență clinică;
- sănătate mintală;
- educație;
- securitate cibernetică;
- protecția datelor;
- afaceri și productivitate;
- cercetare;
- politici publice;
- etică și utilizare responsabilă a AI.

Lista nu trebuie limitată definitiv la aceste exemple.

### 11.5. Câmpul specialties

- nume tehnic: `specialties`;
- tip Payload: `array`;
- obligatoriu: nu;
- localizat: da;
- scop: evidențierea unor specializări mai precise decât domeniile generale.

Fiecare element va conține:

- `label`: câmp `text`, obligatoriu și localizat;
- `description`: câmp `textarea`, opțional și localizat;
- `order`: câmp `number`.

### 11.6. Câmpul contributionTypes

- nume tehnic: `contributionTypes`;
- tip Payload: `select` cu selecție multiplă;
- obligatoriu: nu;
- localizat: nu;
- scop: indicarea tipurilor de conținut la care autorul poate contribui.

Valorile inițiale recomandate sunt:

- `articles`;
- `flashAI`;
- `courses`;
- `roadmaps`;
- `toolReviews`;
- `euCalls`;
- `medicalContent`;
- `editorialReview`.

### 11.7. Câmpul isMedicalReviewer

- nume tehnic: `isMedicalReviewer`;
- tip Payload: `checkbox`;
- obligatoriu: nu;
- valoare implicită: dezactivat;
- scop: identificarea rapidă a profilurilor eligibile pentru verificarea conținutului medical.

Câmpul trebuie tratat ca indicator controlat intern și nu poate fi activat fără verificarea calificărilor.

### 11.8. Câmpul medicalReviewScope

- nume tehnic: `medicalReviewScope`;
- tip Payload: `textarea`;
- obligatoriu: condițional;
- localizat: da;
- vizibil numai când `isMedicalReviewer` este activat;
- scop: descrierea limitelor domeniului în care persoana poate verifica informații medicale.

### 11.9. Reguli de publicare

- rolurile și competențele trebuie susținute de informații verificabile;
- nu se vor publica titluri profesionale neverificate;
- competențele nu trebuie formulate exagerat sau absolut;
- statutul de verificator medical trebuie revizuit periodic;
- lipsa competențelor confirmate trebuie tratată prin omiterea lor, nu prin completare presupusă;
- câmpurile interne `verified` nu vor fi transmise frontendului public.

---

## 12. Calificări profesionale și verificare

Această secțiune definește modul în care sunt documentate și verificate calificările profesionale, academice și medicale ale autorilor.

Informațiile trebuie păstrate factual, fără exagerări și fără atribuirea unor competențe care nu au fost confirmate.

### 12.1. Câmpul credentials

- nume tehnic: `credentials`;
- tip Payload: `array`;
- obligatoriu: nu;
- scop: administrarea calificărilor, titlurilor și certificărilor relevante.

Fiecare element va conține:

- `credentialType`: câmp `select`, obligatoriu;
- `title`: câmp `text`, obligatoriu și localizat;
- `institution`: câmp `text`, opțional;
- `country`: câmp `text`, opțional;
- `yearObtained`: câmp `number`, opțional;
- `yearExpires`: câmp `number`, opțional;
- `identifier`: câmp `text`, opțional și intern;
- `verificationUrl`: câmp `text`, opțional și intern;
- `verified`: câmp `checkbox`, utilizat intern;
- `verifiedAt`: câmp `date`, utilizat intern;
- `order`: câmp `number`.

### 12.2. Valorile credentialType

Valorile inițiale recomandate sunt:

- `academicDegree` — diplomă academică;
- `professionalTitle` — titlu profesional;
- `medicalLicense` — drept sau licență de practică medicală;
- `certification` — certificare profesională;
- `training` — formare relevantă;
- `membership` — apartenență profesională publică;
- `other` — altă calificare verificabilă.

### 12.3. Câmpul professionalIdentifiers

- nume tehnic: `professionalIdentifiers`;
- tip Payload: `array`;
- obligatoriu: nu;
- scop: administrarea identificatorilor profesionali publici sau verificabili.

Fiecare element va conține:

- `type`: câmp `select`;
- `value`: câmp `text`, obligatoriu;
- `publiclyVisible`: câmp `checkbox`, implicit dezactivat;
- `verificationUrl`: câmp `text`, opțional și intern;
- `verified`: câmp `checkbox`, utilizat intern.

Valorile inițiale recomandate pentru `type` sunt:

- `orcid`;
- `researcherId`;
- `professionalRegistry`;
- `medicalRegistry`;
- `institutionalProfile`;
- `other`.

### 12.4. Câmpul verificationStatus

- nume tehnic: `verificationStatus`;
- tip Payload: `select`;
- obligatoriu: da;
- valoare implicită: `pending`;
- utilizare: internă;
- scop: starea generală a verificării profilului profesional.

Valorile recomandate sunt:

- `pending` — verificare nefinalizată;
- `partiallyVerified` — unele informații sunt confirmate;
- `verified` — informațiile esențiale sunt confirmate;
- `expired` — verificarea trebuie reînnoită;
- `rejected` — informațiile nu au putut fi confirmate.

### 12.5. Câmpurile de verificare internă

Structura va include:

- `verifiedAt`: câmp `date`;
- `verifiedBy`: relație internă către `useri`;
- `verificationSource`: câmp `textarea`, intern;
- `nextVerificationDue`: câmp `date`, opțional;
- `verificationNotes`: câmp `textarea`, intern;
- `documentsReviewed`: câmp `checkbox`, intern.

Aceste câmpuri nu vor fi incluse în răspunsurile publice.

### 12.6. Reguli pentru verificatorii medicali

Un profil poate primi rolul de verificator medical numai dacă:

- calificarea relevantă este documentată;
- dreptul profesional necesar este valabil, unde legislația îl impune;
- domeniul de verificare este delimitat;
- starea generală de verificare este `verified`;
- data verificării nu este depășită;
- nu există contradicții între titlul public și documentele confirmate.

### 12.7. Reguli de publicare

- calificările neverificate nu trebuie prezentate ca fapte confirmate;
- identificatorii personali sau sensibili nu vor fi publicați;
- documentele justificative nu vor fi încărcate în colecția publică `Media`;
- informațiile expirate trebuie revizuite sau eliminate din afișarea publică;
- o calificare contestată trebuie ascunsă până la clarificare;
- verificarea internă trebuie documentată suficient pentru audit.

### 12.8. Afișarea publică

Frontendul va afișa numai calificările marcate ca publicabile și verificate.

Stările interne, sursele de verificare și observațiile administrative nu vor fi transmise utilizatorilor.

---

## 13. Linkuri și date profesionale publice

Această secțiune definește informațiile de contact și profilurile profesionale pe care autorul a acceptat să le publice.

Niciun câmp din această secțiune nu este destinat datelor private sau comunicării administrative interne.

### 13.1. Câmpul publicEmail

- nume tehnic: `publicEmail`;
- tip Payload: `email`;
- obligatoriu: nu;
- localizat: nu;
- scop: adresă profesională destinată explicit contactului public;
- publicarea necesită consimțământul persoanei.

Adresa contului de autentificare din `Useri` nu va fi copiată sau afișată automat.

### 13.2. Câmpul website

- nume tehnic: `website`;
- tip Payload: `text`;
- obligatoriu: nu;
- localizat: nu;
- scop: pagina profesională principală a autorului;
- URL-ul trebuie să utilizeze protocolul `https`.

### 13.3. Câmpul institutionalProfile

- nume tehnic: `institutionalProfile`;
- tip Payload: `text`;
- obligatoriu: nu;
- localizat: nu;
- scop: profilul public de pe site-ul instituției sau organizației relevante;
- URL-ul trebuie verificat înainte de publicare.

### 13.4. Câmpul orcidUrl

- nume tehnic: `orcidUrl`;
- tip Payload: `text`;
- obligatoriu: nu;
- localizat: nu;
- scop: legătura către profilul ORCID public;
- valoarea trebuie să respecte formatul unui URL ORCID valid.

### 13.5. Câmpul socialLinks

- nume tehnic: `socialLinks`;
- tip Payload: `array`;
- obligatoriu: nu;
- număr maxim recomandat: 8 elemente;
- scop: profiluri profesionale sau sociale aprobate pentru publicare.

Fiecare element va conține:

- `platform`: câmp `select`, obligatoriu;
- `label`: câmp `text`, opțional și localizat;
- `url`: câmp `text`, obligatoriu;
- `enabled`: câmp `checkbox`, implicit activat;
- `order`: câmp `number`.

### 13.6. Valorile platform

Valorile inițiale recomandate sunt:

- `linkedin`;
- `github`;
- `youtube`;
- `x`;
- `facebook`;
- `instagram`;
- `researchGate`;
- `googleScholar`;
- `other`.

### 13.7. Validarea URL-urilor

- URL-urile publice trebuie să utilizeze `https`;
- protocoalele nesigure precum `javascript` și `data` trebuie respinse;
- domeniul trebuie să corespundă platformei selectate, acolo unde validarea este posibilă;
- linkurile trebuie verificate înainte de publicarea profilului;
- linkurile inactive sau expirate trebuie dezactivate ori eliminate;
- frontendul va adăuga atributele de securitate necesare linkurilor externe.

### 13.8. Protecția datelor personale

- numerele personale de telefon nu vor fi publicate în prima implementare;
- adresele fizice exacte nu vor fi stocate în profilul public;
- adresele private de e-mail nu vor fi copiate din `Useri`;
- datele publice trebuie introduse numai cu acordul persoanei;
- retragerea consimțământului trebuie să permită eliminarea rapidă a informației publice.

### 13.9. Fallback frontend

Dacă nu există linkuri publice valide, secțiunea de contact sau profiluri externe nu va fi afișată.

Lipsa datelor de contact nu trebuie să afecteze afișarea profilului, articolelor sau rolurilor editoriale.

---

## 14. Transparență, conflicte de interese și consimțământ

Această secțiune definește informațiile necesare pentru prezentarea transparentă a relațiilor profesionale, comerciale și editoriale relevante.

Datele publice trebuie să fie proporționale, clare și limitate la informațiile relevante pentru evaluarea independenței autorului.

### 14.1. Câmpul conflictOfInterestStatement

- nume tehnic: `conflictOfInterestStatement`;
- tip Payload: `textarea`;
- obligatoriu: nu;
- localizat: da;
- scop: declararea publică a conflictelor de interese relevante;
- lungime maximă recomandată: 1000 de caractere.

În lipsa unui conflict declarat, frontendul poate afișa o formulare neutră aprobată editorial.

### 14.2. Câmpul affiliationsAndSponsorships

- nume tehnic: `affiliationsAndSponsorships`;
- tip Payload: `array`;
- obligatoriu: nu;
- scop: documentarea afilierilor, colaborărilor și sponsorizărilor relevante.

Fiecare element va conține:

- `organization`: câmp `text`, obligatoriu;
- `relationshipType`: câmp `select`, obligatoriu;
- `description`: câmp `textarea`, localizat și opțional;
- `startDate`: câmp `date`, opțional;
- `endDate`: câmp `date`, opțional;
- `currentlyActive`: câmp `checkbox`;
- `publiclyVisible`: câmp `checkbox`, implicit activat când relația este relevantă;
- `verified`: câmp `checkbox`, utilizat intern.

### 14.3. Valorile relationshipType

Valorile inițiale recomandate sunt:

- `employment` — angajare;
- `consulting` — consultanță;
- `researchFunding` — finanțare pentru cercetare;
- `sponsorship` — sponsorizare;
- `partnership` — parteneriat;
- `advisoryRole` — rol consultativ;
- `ownership` — participație sau interes financiar;
- `speakerFee` — remunerare pentru prezentări;
- `other` — altă relație relevantă.

### 14.4. Câmpul aiUseDisclosure

- nume tehnic: `aiUseDisclosure`;
- tip Payload: `textarea`;
- obligatoriu: nu;
- localizat: da;
- scop: explicarea modului în care autorul utilizează instrumente AI în activitatea editorială;
- câmpul nu înlocuiește declarațiile specifice fiecărui articol sau curs.

### 14.5. Câmpul publicationConsent

- nume tehnic: `publicationConsent`;
- tip Payload: `checkbox`;
- obligatoriu pentru publicare: da;
- valoare implicită: dezactivat;
- utilizare: internă;
- scop: confirmarea că persoana acceptă publicarea profilului.

### 14.6. Câmpurile pentru consimțământ

Structura internă va include:

- `consentConfirmedAt`: câmp `date`;
- `consentConfirmedBy`: relație către `useri`;
- `consentScope`: câmp `textarea`;
- `profileImageConsent`: câmp `checkbox`;
- `publicContactConsent`: câmp `checkbox`;
- `consentWithdrawnAt`: câmp `date`, opțional;
- `consentNotes`: câmp `textarea`, intern.

### 14.7. Retragerea consimțământului

Dacă persoana retrage consimțământul:

- profilul trebuie trecut rapid în starea `inactiv` sau `arhivat`;
- datele de contact și fotografia trebuie eliminate din afișarea publică;
- articolele istorice pot păstra numele autorului numai dacă există o bază editorială și juridică justificată;
- observațiile interne trebuie să documenteze acțiunea;
- eliminarea nu trebuie să distrugă automat istoricul editorial.

### 14.8. Reguli de publicare

- conflictele relevante nu trebuie ascunse;
- relațiile expirate trebuie actualizate;
- declarațiile trebuie redactate factual și fără acuzații;
- informațiile sensibile fără relevanță editorială nu vor fi publicate;
- consimțământul trebuie confirmat înainte de schimbarea stării în `publicat`;
- câmpurile interne de verificare și consimțământ nu vor fi transmise frontendului.

### 14.9. Afișarea în frontend

Frontendul va afișa numai declarațiile și relațiile marcate ca publice și relevante.

Informațiile de transparență pot fi prezentate într-o secțiune distinctă a profilului, fără a încărca excesiv cardurile compacte de autor.

---

## 15. Flux editorial și ciclul de viață

Profilurile de autor trebuie să parcurgă un flux editorial controlat înainte de afișarea publică.

Starea profilului va controla atât vizibilitatea publică, cât și posibilitatea utilizării sale în relațiile editoriale.

### 15.1. Câmpul status

- nume tehnic: `status`;
- tip Payload: `select`;
- obligatoriu: da;
- valoare implicită: `draft`;
- indexat: da;
- localizat: nu;
- scop: controlul ciclului de viață al profilului.

Valorile recomandate sunt:

- `draft` — profil în pregătire;
- `pendingVerification` — profil trimis pentru verificare;
- `verified` — profil verificat, dar încă nepublicat;
- `published` — profil public;
- `inactive` — profil retras temporar din afișare;
- `archived` — profil păstrat pentru istoricul editorial.

### 15.2. Reguli pentru schimbarea stării

- profilurile noi sunt create în starea `draft`;
- trecerea la `pendingVerification` necesită completarea informațiilor esențiale;
- starea `verified` necesită finalizarea verificării interne;
- starea `published` necesită consimțământ pentru publicare;
- numai administratorul poate schimba starea în prima implementare;
- profilurile `inactive` și `archived` nu sunt citibile public.

### 15.3. Condiții minime pentru publicare

Un profil poate fi publicat numai dacă sunt completate și validate:

- numele complet;
- slugul unic;
- cel puțin un rol editorial;
- biografia scurtă în cel puțin limba română;
- starea verificării profesionale;
- consimțământul pentru publicare;
- data ultimei verificări;
- informațiile de transparență relevante;
- dreptul de utilizare pentru fotografia publică, dacă există.

### 15.4. Câmpurile temporale

Structura va include:

- `publishedAt`: câmp `date`, completat la prima publicare;
- `lastReviewedAt`: câmp `date`, data ultimei verificări editoriale;
- `profileUpdatedAt`: furnizat de mecanismul Payload;
- `inactiveAt`: câmp `date`, opțional;
- `archivedAt`: câmp `date`, opțional;
- `nextReviewDue`: câmp `date`, opțional.

### 15.5. Câmpul reviewedBy

- nume tehnic: `reviewedBy`;
- tip Payload: `relationship`;
- relație: colecția `useri`;
- obligatoriu: condițional pentru publicare;
- utilizare: exclusiv internă;
- scop: trasabilitatea persoanei care a verificat profilul.

Relația nu va fi inclusă în răspunsurile publice.

### 15.6. Câmpul archivalReason

- nume tehnic: `archivalReason`;
- tip Payload: `textarea`;
- obligatoriu: condițional pentru starea `archived`;
- localizat: nu;
- utilizare: internă;
- scop: documentarea motivului arhivării.

### 15.7. Utilizarea profilurilor inactive

Un profil trecut în starea `inactive` sau `archived`:

- nu va apărea în listele publice de autori;
- nu va avea pagină publică accesibilă;
- poate rămâne asociat documentelor istorice;
- nu trebuie selectat pentru conținut editorial nou;
- nu va fi șters automat din relațiile existente.

### 15.8. Actualizarea profilurilor publicate

- modificările factuale importante trebuie reverificate;
- schimbarea calificărilor sau afilierilor trebuie documentată;
- retragerea consimțământului trebuie tratată imediat;
- modificarea slugului după publicare trebuie evitată;
- schimbarea slugului necesită redirect permanent în frontend;
- actualizările nu trebuie să afecteze relațiile editoriale existente.

### 15.9. Ștergerea definitivă

Ștergerea definitivă trebuie utilizată numai pentru:

- profiluri create accidental;
- duplicate fără relații editoriale;
- date introduse eronat înainte de publicare;
- solicitări justificate care impun eliminarea completă.

Pentru autorii cu istoric editorial este preferată arhivarea, nu ștergerea.

---

## 16. SEO și prezentarea publică

Această secțiune definește metadatele și componentele publice utilizate pentru profilurile de autor.

### 16.1. Câmpul metaTitle

- nume tehnic: `metaTitle`;
- tip Payload: `text`;
- obligatoriu: nu;
- localizat: da;
- lungime maximă recomandată: 70 de caractere;
- scop: titlul SEO al paginii publice;
- fallback: numele complet, titulatura și numele platformei.

### 16.2. Câmpul metaDescription

- nume tehnic: `metaDescription`;
- tip Payload: `textarea`;
- obligatoriu: nu;
- localizat: da;
- lungime maximă recomandată: 170 de caractere;
- scop: descrierea profilului pentru motoare de căutare și distribuire socială;
- fallback: biografia scurtă.

### 16.3. Câmpul socialImage

- nume tehnic: `socialImage`;
- tip Payload: `upload`;
- relație: colecția `media`;
- obligatoriu: nu;
- localizat: nu;
- scop: imaginea utilizată la distribuirea profilului;
- fallback: fotografia de profil, apoi imaginea globală din `SiteSettings`.

### 16.4. Câmpul robots

- nume tehnic: `robots`;
- tip Payload: `select`;
- obligatoriu: da;
- valoare implicită: `indexFollow`;
- scop: controlul indexării paginii publice.

Valorile recomandate sunt:

- `indexFollow`;
- `noindexFollow`;
- `noindexNofollow`.

Profilurile care nu sunt în starea `published` trebuie tratate automat ca `noindex`.

### 16.5. Ruta publică

Rutele aprobate sunt:

- `/ro/autori/[slug]`;
- `/en/authors/[slug]`.

Un slug inexistent, nepublicat, inactiv sau arhivat trebuie să returneze `404`.

### 16.6. Cardul compact de autor

Componenta conceptuală recomandată este `AuthorCard`.

Cardul poate afișa:

- fotografia sau avatarul fallback;
- numele complet;
- titulatura publică;
- afilierea principală;
- unul sau două roluri editoriale relevante;
- biografia scurtă;
- linkul către profilul complet.

Cardul nu va afișa observații interne, stări de verificare tehnice sau date de consimțământ.

### 16.7. Pagina publică a autorului

Pagina completă poate include:

- identitatea și fotografia;
- titulatura și afilierea;
- biografia;
- rolurile editoriale;
- domeniile de expertiză;
- calificările publice verificate;
- declarațiile de transparență;
- linkurile profesionale;
- articolele publicate;
- cursurile și evaluările publice asociate;
- data ultimei verificări publice.

### 16.8. Date structurate

Frontendul poate genera date structurate de tip `Person`, folosind numai informațiile publice și verificate.

Datele structurate nu trebuie să includă:

- identificatori interni;
- relația către `Useri`;
- adrese private;
- observații de verificare;
- informații nepublicate;
- calificări neconfirmate.

### 16.9. Relațiile publice cu conținutul

Listele de articole, cursuri, roadmaps și instrumente trebuie să includă numai documente publicate.

Interogările trebuie paginate și limitate, fără încărcarea întregului conținut editorial în pagina autorului.

### 16.10. Fallbackuri frontend

- lipsa fotografiei utilizează un avatar neutru;
- lipsa biografiei extinse păstrează biografia scurtă;
- lipsa metadatelor utilizează fallbackurile aprobate;
- secțiunile fără conținut valid nu sunt randate;
- lipsa temporară a relațiilor editoriale nu blochează profilul;
- erorile nu trebuie să expună structura internă Payload.

---

## 17. Implementare, migrare și impact tehnic

Introducerea colecției `Autori` reprezintă o modificare de schemă Payload și trebuie realizată exclusiv prin fluxul controlat de migrații.

### 17.1. Fișierul colecției

Structura recomandată este definirea colecției într-un fișier separat:

`src/collections/Autori.ts`

Fișierul trebuie să conțină:

- configurația colecției;
- taburile și grupurile aprobate;
- validările câmpurilor;
- regulile de acces;
- configurarea slugului;
- condițiile de publicare;
- hookurile strict necesare și documentate.

### 17.2. Înregistrarea în Payload

Colecția va fi importată și înregistrată explicit în `src/payload.config.ts`.

Înregistrarea trebuie să păstreze neschimbate configurația bazei de date, editorul, colecțiile existente și fluxul `prodMigrations`.

### 17.3. Impactul asupra bazei de date

Payload va crea tabelele necesare pentru:

- documentele colecției `Autori`;
- valorile localizate;
- rolurile cu selecție multiplă;
- domeniile de expertiză;
- calificările profesionale;
- linkurile și afilierile;
- relațiile către `Media` și `Useri`.

Nu se va utiliza `PAYLOAD_DB_PUSH` în staging sau producție.

### 17.4. Migrarea inițială

Migrarea trebuie să:

- creeze numai structurile necesare colecției `Autori`;
- nu modifice datele colecțiilor existente fără necesitate;
- nu creeze automat profiluri din colecția `Useri`;
- nu copieze adrese de e-mail sau alte date private;
- permită rollback controlat;
- fie inspectată manual înainte de commit;
- fie testată mai întâi în `844-ai-dev`.

### 17.5. Relațiile cu colecțiile existente

Prima migrare pentru `Autori` nu trebuie să modifice simultan colecțiile `Articole`, `Cursuri`, `Tooluri`, `Roadmaps` sau `FlashAI`.

Relațiile editoriale către autori vor fi introduse ulterior, în modificări de schemă separate și verificabile.

### 17.6. Popularea inițială

Migrarea nu va introduce automat profiluri editoriale.

După deploymentul în staging, primul profil va fi creat manual din Admin Payload, folosind exclusiv date aprobate pentru publicare.

### 17.7. Integrarea frontendului

Frontendul va fi integrat într-un PR separat de introducerea colecției și migrației.

Ordinea recomandată este:

1. introducerea colecției și migrației;
2. testarea accesului și localizării în staging;
3. crearea unui profil controlat de test;
4. introducerea funcțiilor tipizate de citire;
5. implementarea `AuthorCard`;
6. implementarea rutelor publice ale autorilor;
7. introducerea relațiilor în colecțiile editoriale;
8. afișarea autorilor în articole și alte tipuri de conținut.

### 17.8. Separarea responsabilităților

PR-ul inițial de schemă nu trebuie să includă:

- modificări ample ale frontendului;
- integrarea simultană în toate colecțiile editoriale;
- refactorizări fără legătură;
- modificări ale colecției `Useri`;
- activarea unor roluri noi în Admin Payload;
- modificări în producție.

### 17.9. Deploymentul în staging

Deploymentul inițial va fi realizat manual numai în Railway staging.

După deployment trebuie verificate:

- rularea migrației;
- apariția colecției `Autori` în Admin Payload;
- crearea și salvarea unui profil;
- localizarea română și engleză;
- relațiile către Media;
- regulile de acces;
- lipsa regresiilor în colecțiile existente.

### 17.10. Producția

Producția nu va fi modificată până când schema, accesul, localizarea și frontendul asociat nu sunt validate complet în staging.

Promovarea va utiliza aceeași migrare versionată și același cod verificat în staging.

---

## 18. Criterii de testare și acceptare

Implementarea colecției `Autori` va fi considerată validă numai după trecerea testelor de schemă, acces, localizare, publicare și regresie în staging.

### 18.1. Validarea configurației Payload

- colecția este înregistrată o singură dată;
- slugul tehnic este `autori`;
- denumirea din Admin Payload este `Autori`;
- taburile și grupurile corespund arhitecturii aprobate;
- câmpurile obligatorii și condiționale sunt configurate corect;
- slugul este unic și validat;
- câmpurile interne nu sunt incluse în răspunsurile publice;
- TypeScript și buildul de producție trec fără erori noi.

### 18.2. Validarea migrației

- migrarea este generată prin fluxul controlat Payload;
- modificările SQL sunt inspectate manual;
- sunt create numai structurile necesare colecției `Autori`;
- colecțiile și datele existente nu sunt afectate;
- migrarea `up` rulează cu succes în `844-ai-dev`;
- migrarea apare ca executată în status;
- rollbackul este posibil și documentat înainte de integrarea finală.

### 18.3. Validarea accesului public

- profilurile în starea `published` pot fi citite public;
- profilurile `draft`, `pendingVerification`, `verified`, `inactive` și `archived` nu sunt expuse public;
- accesarea directă a unui profil nepublicat returnează `404` sau un rezultat echivalent;
- crearea, actualizarea și ștergerea publică sunt blocate;
- documentul public nu conține relația către `Useri`, observații interne sau date de consimțământ.

### 18.4. Validarea accesului administrativ

- administratorul poate crea, modifica, publica, dezactiva și arhiva profiluri;
- rolul `cititor` nu poate accesa colecția în Admin Payload;
- rolul `editor` nu poate modifica profiluri în prima implementare;
- schimbarea stării este rezervată administratorului;
- ștergerea este blocată pentru utilizatorii neautorizați.

### 18.5. Validarea localizării

- câmpurile localizate pot fi salvate separat în română și engleză;
- modificarea unei limbi nu suprascrie cealaltă limbă;
- câmpurile factuale nelocalizate rămân comune;
- fallbackurile funcționează când o traducere lipsește;
- rutele publice păstrează prefixele `/ro` și `/en`.

### 18.6. Validarea slugului și rutelor

- slugul este generat inițial din numele autorului;
- slugurile duplicate sunt respinse;
- caracterele nepermise sunt normalizate sau respinse;
- schimbarea numelui nu modifică automat slugul unui profil publicat;
- un profil public este accesibil prin ruta localizată corectă;
- un slug inexistent returnează `404`.

### 18.7. Validarea relațiilor Media

- fotografia poate fi selectată din colecția `Media`;
- profilul poate fi salvat fără fotografie;
- lipsa fotografiei activează fallbackul frontend;
- textul alternativ, creditul și dreptul de utilizare rămân disponibile;
- imaginile din Supabase Storage continuă să fie afișate.

### 18.8. Validarea publicării

- un profil incomplet nu poate fi publicat;
- publicarea necesită consimțământ confirmat;
- publicarea unui verificator medical necesită calificări verificate;
- data publicării este completată corect;
- profilurile inactive și arhivate dispar din listele publice;
- arhivarea nu distruge relațiile editoriale istorice.

### 18.9. Validarea transparenței și calificărilor

- calificările neconfirmate nu sunt afișate public;
- conflictele de interese marcate public sunt afișate;
- datele interne de verificare nu sunt expuse;
- retragerea consimțământului elimină datele publice relevante;
- linkurile profesionale nesigure sau invalide sunt respinse;
- adresa din colecția `Useri` nu este expusă automat.

### 18.10. Validarea frontendului

- `AuthorCard` funcționează cu și fără fotografie;
- pagina publică afișează numai secțiunile cu date valide;
- profilul folosește metadatele și fallbackurile aprobate;
- listele de conținut asociat includ numai documente publicate;
- interogările sunt limitate și paginate;
- structura Payload brută nu este transmisă componentelor.

### 18.11. Teste de regresie

- Admin Payload continuă să funcționeze;
- colecția `Useri` și regulile SEC-003 rămân intacte;
- articolele, cursurile și instrumentele existente nu sunt modificate;
- Newsletter SEC-001 rămâne protejat;
- cursurile premium SEC-002 rămân protejate;
- migrațiile existente rămân intacte;
- homepage-ul și imaginile existente continuă să funcționeze.

### 18.12. Criteriul final de acceptare

Colecția `Autori` poate fi considerată pregătită pentru integrarea editorială numai după documentarea tuturor testelor obligatorii ca trecute în staging.

Validarea în staging nu autorizează automat promovarea în producție sau modificarea celorlalte colecții.

---

## 19. Decizii finale și statut

Arhitectura colecției `Autori` este definită și pregătită pentru etapa ulterioară de implementare controlată.

### 19.1. Decizii aprobate

- `Autori` va fi implementată ca Payload Collection separată de `Useri`;
- slugul tehnic va fi `autori`;
- denumirea din Admin Payload va fi `Autori`;
- profilurile publice pot exista fără cont de autentificare;
- câmpurile editoriale vor suporta limbile română și engleză;
- administrarea inițială va fi rezervată administratorului;
- numai profilurile în starea `published` vor fi citibile public;
- datele interne de verificare și consimțământ nu vor fi expuse;
- fotografiile și imaginile vor utiliza colecția `Media`;
- modificarea schemei va fi aplicată exclusiv prin migrare controlată.

### 19.2. Structuri incluse

Arhitectura include:

- identitatea publică;
- biografia și profilul editorial;
- rolurile și domeniile de expertiză;
- calificările profesionale;
- verificarea competențelor;
- linkurile profesionale publice;
- transparența și conflictele de interese;
- consimțământul pentru publicare;
- fluxul editorial și ciclul de viață;
- SEO și prezentarea publică;
- relațiile cu celelalte structuri editoriale;
- criteriile de testare și acceptare.

### 19.3. Elemente excluse

Colecția `Autori` nu va administra:

- autentificarea;
- parolele și sesiunile;
- rolurile RBAC tehnice;
- abonamentele și datele Stripe;
- datele private de contact;
- documentele de identitate;
- documentele profesionale justificative publice;
- cheile API și configurațiile secrete;
- drepturile automate de acces în Admin Payload.

### 19.4. Ordinea implementării

Implementarea va fi realizată în etape separate:

1. definirea colecției în cod;
2. generarea și inspectarea migrației;
3. verificarea TypeScript și build;
4. PR separat către `staging`;
5. deployment manual în Railway staging;
6. rularea și verificarea migrației;
7. testarea accesului și localizării;
8. crearea unui profil controlat de test;
9. integrarea frontendului într-un PR separat;
10. introducerea ulterioară a relațiilor în colecțiile editoriale.

### 19.5. Relația cu etapele următoare

Arhitectura `Autori` va fi utilizată ulterior de:

- `Articole`;
- `Cursuri`;
- `Roadmaps`;
- `Tooluri`;
- `FlashAI`;
- paginile publice ale autorilor;
- componentele de transparență editorială.

Relațiile efective vor fi introduse numai după implementarea și validarea colecției în staging.

### 19.6. Statut

**Statut UX-001A-07:** arhitectură finalizată.

Următoarea activitate din arhitectura editorială este definirea colecției `FlashAI`, înainte de proiectarea Globalului `Homepage`.
