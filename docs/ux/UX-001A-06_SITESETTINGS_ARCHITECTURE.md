# UX-001A-06 — Arhitectura Globalului SiteSettings

**Proiect:** 844-ai.ro
**Mediu de lucru:** branch `docs/ux-001a-06-sitesettings`
**Data definirii:** 4 august 2026
**Statut:** arhitectură în curs de documentare
**Tip structură Payload:** Global
**Impact curent asupra bazei de date:** niciunul
**Impact asupra producției:** niciunul

---

## 1. Scop

Globalul `SiteSettings` va centraliza configurațiile publice și editoriale care se aplică întregii platforme 844-ai.ro.

Structura va permite administrarea din Payload CMS a elementelor care sunt în prezent definite static sau dispersat în frontend:

- identitatea site-ului;
- navigația principală;
- selectorul de limbă;
- bara de încredere;
- informațiile despre metodologie;
- configurarea newsletterului;
- footerul;
- datele de contact;
- legăturile sociale;
- legăturile legale;
- textele globale reutilizabile;
- setările editoriale generale.

`SiteSettings` nu va conține conținut editorial specific unei pagini și nu va înlocui Globalul `Homepage`.

---

## 2. Obiective

Implementarea `SiteSettings` urmărește:

1. eliminarea configurărilor globale dispersate în cod;
2. administrarea headerului și footerului din Payload;
3. păstrarea unei identități coerente în toate paginile;
4. gestionarea centralizată a navigației;
5. configurarea corectă a limbilor română și engleză;
6. afișarea consecventă a elementelor de încredere editorială;
7. reducerea necesității unui deployment pentru modificări editoriale minore;
8. păstrarea unor fallbackuri sigure în frontend;
9. separarea configurațiilor globale de selecțiile editoriale ale homepage-ului;
10. pregătirea platformei pentru extindere fără duplicarea setărilor.

---

## 3. Elemente care nu aparțin în SiteSettings

Următoarele informații nu vor fi administrate prin `SiteSettings`:

- selecțiile de articole pentru homepage;
- ordinea secțiunilor homepage-ului;
- elementele `FlashAI`;
- profilurile autorilor;
- articolele;
- cursurile;
- roadmaps;
- instrumentele AI;
- apelurile europene;
- conturile de utilizator;
- configurațiile secrete;
- cheile API;
- parolele;
- variabilele de mediu;
- configurația bazei de date;
- configurația Railway;
- configurația Brevo;
- datele Stripe.

Aceste informații rămân în colecțiile, Globalurile sau sistemele tehnice dedicate.

---

## 4. Decizia de arhitectură

`SiteSettings` va fi implementat ca Payload Global, nu ca o colecție.

Platforma are nevoie de o singură configurație globală activă pentru fiecare mediu, cu valori localizate pentru limbile română și engleză.

Avantajele utilizării unui Global sunt:

- există un singur document logic;
- nu este necesară selectarea unui document activ;
- nu există riscul mai multor configurații concurente;
- frontendul poate solicita direct configurația globală;
- administrarea este mai simplă;
- grupurile de câmpuri pot fi organizate clar;
- structura este potrivită pentru header, footer și configurările comune.

Slug tehnic recomandat: `site-settings`.

Denumire afișată în Admin Payload: `Setări site`.

---

## 5. Principii de proiectare

### 5.1. Administrabil, dar controlat

Elementele editoriale și vizuale globale trebuie să poată fi gestionate din Payload, însă detaliile tehnice sensibile nu trebuie expuse administratorului.

Nu vor fi introduse câmpuri care permit:

- injectarea de HTML arbitrar;
- introducerea de JavaScript;
- modificarea claselor CSS;
- modificarea directă a structurii DOM;
- introducerea de scripturi externe;
- configurarea cheilor sau secretelor;
- ocolirea regulilor de securitate din frontend.

### 5.2. Fallbackuri sigure

Frontendul trebuie să continue să funcționeze dacă:

- Globalul nu a fost încă populat;
- unele câmpuri opționale sunt goale;
- o relație către Media lipsește;
- un link este dezactivat;
- o traducere lipsește;
- Payload nu răspunde temporar.

Fallbackurile trebuie definite în cod și documentate.

### 5.3. Separarea conținutului de prezentare

Payload va administra conținutul și ordinea logică, dar nu va controla direct implementarea vizuală.

Frontendul va controla componentele, dimensiunile, comportamentul responsive, optimizarea imaginilor și accesibilitatea.

### 5.4. Modificări mici și verificabile

Implementarea SiteSettings trebuie separată de:

- reconstrucția homepage-ului;
- introducerea colecției Autori;
- introducerea colecției FlashAI;
- refactorizarea completă a headerului și footerului;
- implementarea design systemului general.

Prima etapă va introduce structura și citirea controlată. Integrarea frontendului va fi realizată separat.

---

## 6. Localizare

`SiteSettings` trebuie să suporte limbile română și engleză.

Strategia recomandată este utilizarea câmpurilor Payload localizate pentru textele care se traduc.

Vor fi localizate:

- textele de navigație;
- etichetele butoanelor;
- textele din bara de încredere;
- titlurile și descrierile newsletterului;
- textele footerului;
- textele editoriale globale;
- etichetele linkurilor;
- mesajele de accesibilitate administrabile;
- textele de contact afișate public.

Nu vor fi localizate automat:

- identificatorii tehnici;
- adresele de e-mail;
- numerele de telefon;
- conturile sociale;
- setările booleene;
- valorile de ordine;
- tipurile de elemente;
- URL-urile externe identice pentru ambele limbi;
- fișierele Media comune ambelor limbi.

Pentru linkurile interne localizate trebuie păstrată compatibilitatea cu prefixele `/ro` și `/en`.

Frontendul va construi sau valida ruta potrivită limbii active.

---

## 7. Reguli de acces

În etapa actuală, numai administratorul platformei gestionează configurația globală a site-ului.

### 7.1. Citire

- citirea publică este permisă pentru configurația utilizată de frontend;
- Globalul trebuie să conțină exclusiv informații care pot fi expuse public;
- nu vor fi stocate parole, chei API, tokenuri sau alte secrete;
- frontendul va primi numai câmpurile necesare afișării.

### 7.2. Actualizare

- actualizarea este permisă numai rolului `admin`;
- rolul `editor` nu primește acces la actualizare în prima implementare;
- regula poate fi reevaluată înainte de introducerea unei echipe editoriale.

### 7.3. Admin Payload

- Globalul este vizibil numai utilizatorilor care au acces în Admin Payload;
- modificarea efectivă rămâne rezervată administratorului;
- accesul trebuie implementat explicit în configurația Globalului.

### 7.4. Principiul expunerii minime

Chiar dacă Globalul este public citibil, răspunsul utilizat de frontend trebuie normalizat și limitat la câmpurile publice necesare.

Structura internă Payload nu trebuie transmisă direct componentelor frontend.

---

## 8. Structura generală propusă

Globalul `SiteSettings` va fi împărțit în următoarele grupuri logice:

1. `identity`
2. `navigation`
3. `languageSettings`
4. `trustBar`
5. `methodology`
6. `newsletter`
7. `footer`
8. `contact`
9. `socialLinks`
10. `legalLinks`
11. `editorialDefaults`
12. `accessibility`
13. `metadata`

În Admin Payload, câmpurile trebuie organizate în taburi clare, pentru a evita afișarea unei liste foarte lungi.

### 8.1. Tab Identitate

- numele platformei;
- descrierea scurtă;
- logo-ul principal;
- logo-ul alternativ;
- faviconul;
- denumirea scurtă utilizată în interfață.

### 8.2. Tab Navigație

- meniul principal;
- acțiunile din header;
- selectorul de limbă;
- configurarea navigației mobile;
- activarea și configurarea barei de încredere.

### 8.3. Tab Metodologie și încredere

- linkul către metodologie;
- declarațiile editoriale globale;
- textele privind verificarea informațiilor;
- mesajele de transparență;
- etichetele globale de încredere.

### 8.4. Tab Newsletter

- titlul secțiunii;
- descrierea;
- eticheta câmpului de e-mail;
- textul butonului;
- textul de consimțământ;
- mesajele globale de confirmare și eroare.

### 8.5. Tab Footer și contact

- secțiunile footerului;
- datele de contact;
- legăturile sociale;
- legăturile legale;
- textul de copyright.

### 8.6. Tab Setări editoriale

- etichetele globale reutilizabile;
- textele implicite;
- fallbackurile editoriale;
- configurările de afișare fără impact asupra securității.

---

## 9. Relația cu celelalte structuri

### 9.1. Relația cu Homepage

`SiteSettings` controlează elementele globale care apar și pe homepage:

- identitatea platformei;
- headerul;
- navigația;
- selectorul de limbă;
- bara de încredere;
- configurarea globală a newsletterului;
- footerul.

Globalul `Homepage` va controla separat:

- hero-ul editorial;
- selecțiile de conținut;
- ordinea secțiunilor;
- articolele evidențiate;
- selecțiile Flash AI;
- cursurile, roadmaps și instrumentele promovate;
- fallbackurile editoriale specifice homepage-ului.

### 9.2. Relația cu Autori

`SiteSettings` nu va stoca profiluri de autori și nu va utiliza colecția `Useri` pentru prezentarea lor publică.

Poate conține numai linkuri globale către metodologia editorială și către pagina care explică rolurile autorilor și verificatorilor.

### 9.3. Relația cu FlashAI

`SiteSettings` poate conține:

- eticheta globală a secțiunii;
- textul explicativ general;
- linkul către arhiva Flash AI;
- etichete globale reutilizabile.

Elementele editoriale efective vor fi gestionate exclusiv în colecția `FlashAI`.

### 9.4. Relația cu Media

Logo-urile, faviconul și imaginile globale vor utiliza relații către colecția `Media`.

Nu se vor stoca URL-uri directe pentru fișiere care pot fi administrate prin Payload Media.

Câmpurile Media utilizate de `SiteSettings` trebuie să păstreze text alternativ, credite și informații privind drepturile de utilizare.

### 9.5. Relația cu frontendul

Frontendul nu va consuma direct structura brută a Globalului.

Datele vor fi citite, validate și normalizate printr-o funcție dedicată înainte de a fi transmise componentelor.

---

## 10. Cerințe pentru frontend

Frontendul va utiliza o funcție tipizată dedicată pentru citirea și normalizarea Globalului.

Denumirea conceptuală recomandată este:

`getSiteSettings(locale)`

### 10.1. Responsabilitățile funcției

Funcția trebuie să:

- citească Globalul Payload pentru limba activă;
- returneze numai datele necesare frontendului;
- normalizeze câmpurile opționale;
- aplice fallbackurile sigure;
- valideze linkurile interne și externe;
- limiteze adâncimea relațiilor Media;
- trateze erorile fără blocarea întregului site;
- permită cache și revalidare controlată;
- nu transmită structura Payload brută componentelor.

### 10.2. Componente consumatoare

Configurația normalizată va fi utilizată de:

- `Header`;
- navigația desktop;
- navigația mobilă;
- selectorul de limbă;
- `TrustBar`;
- secțiunea globală de newsletter;
- `Footer`;
- componentele pentru linkuri sociale și legale;
- generarea metadatelor globale.

### 10.3. Fallbackuri frontend

Frontendul trebuie să includă valori implicite pentru:

- numele platformei;
- navigația principală;
- limbile disponibile;
- linkul către metodologie;
- textele esențiale ale newsletterului;
- linkurile legale obligatorii;
- textul de copyright.

Lipsa unei imagini sau a unui text opțional nu trebuie să împiedice randarea paginii.

### 10.4. Tratarea erorilor

O eroare temporară la citirea Globalului nu trebuie să producă o pagină complet indisponibilă.

Frontendul va utiliza fallbackurile locale și va înregistra eroarea pentru diagnosticare, fără expunerea detaliilor tehnice către utilizator.

### 10.5. Cache și actualizare

Strategia de cache trebuie să permită actualizarea controlată după modificarea setărilor din Payload.

Durata și mecanismul de revalidare vor fi stabilite la implementare, în funcție de arhitectura actuală Next.js și de fluxul de publicare.

---

## 11. Identitatea site-ului

Grupul tehnic recomandat este `identity`.

Acesta va conține informațiile publice care identifică platforma și resursele Media utilizate în interfața globală.

### 11.1. Câmpul siteName

- nume tehnic: `siteName`;
- tip Payload: `text`;
- obligatoriu: da;
- localizat: da;
- lungime maximă recomandată: 80 de caractere;
- scop: denumirea completă a platformei;
- fallback frontend: `844-ai.ro`.

### 11.2. Câmpul shortName

- nume tehnic: `shortName`;
- tip Payload: `text`;
- obligatoriu: da;
- localizat: da;
- lungime maximă recomandată: 30 de caractere;
- scop: denumirea compactă utilizată în header, navigația mobilă și metadate;
- fallback frontend: `844 AI`.

### 11.3. Câmpul tagline

- nume tehnic: `tagline`;
- tip Payload: `textarea`;
- obligatoriu: nu;
- localizat: da;
- lungime maximă recomandată: 160 de caractere;
- scop: descrierea scurtă globală a platformei;
- fallback recomandat în limba română: `Înțelege. Învață. Aplică inteligența artificială.`

### 11.4. Câmpul logoPrimary

- nume tehnic: `logoPrimary`;
- tip Payload: `upload`;
- relație: colecția `media`;
- obligatoriu: nu în migrarea inițială;
- localizat: nu;
- scop: logo-ul principal pentru fundaluri deschise;
- fallback frontend: reprezentare textuală a numelui platformei.

### 11.5. Câmpul logoAlternative

- nume tehnic: `logoAlternative`;
- tip Payload: `upload`;
- relație: colecția `media`;
- obligatoriu: nu;
- localizat: nu;
- scop: variantă pentru fundaluri întunecate sau contexte speciale;
- fallback frontend: `logoPrimary`.

### 11.6. Câmpul favicon

- nume tehnic: `favicon`;
- tip Payload: `upload`;
- relație: colecția `media`;
- obligatoriu: nu;
- localizat: nu;
- scop: pictograma globală a site-ului;
- fallback: faviconul static existent în frontend.

### 11.7. Reguli de validare

- textele obligatorii nu pot conține numai spații;
- valorile trebuie normalizate prin eliminarea spațiilor inutile de la început și sfârșit;
- fișierele pentru logo și favicon trebuie să provină exclusiv din colecția `Media`;
- lipsa unui fișier Media nu trebuie să blocheze randarea site-ului;
- imaginile trebuie să aibă text alternativ și informații privind drepturile de utilizare;
- frontendul trebuie să limiteze dimensiunile și să păstreze proporțiile logo-ului.

---

## 12. Navigația principală și headerul

Grupul tehnic recomandat este `navigation`.

Structura va administra meniul principal și acțiunile globale din header, fără să permită introducerea de cod sau HTML arbitrar.

### 12.1. Câmpul primaryNavigation

- nume tehnic: `primaryNavigation`;
- tip Payload: `array`;
- obligatoriu: nu;
- număr maxim recomandat: 8 elemente;
- localizarea se aplică textelor și destinațiilor din fiecare element;
- scop: administrarea meniului principal desktop și mobil.

Fiecare element va conține:

- `label`: câmp `text`, obligatoriu și localizat;
- `linkType`: câmp `select`, cu valorile `internal` și `external`;
- `href`: câmp `text`, obligatoriu și localizat;
- `openInNewTab`: câmp `checkbox`, implicit dezactivat;
- `showInDesktop`: câmp `checkbox`, implicit activat;
- `showInMobile`: câmp `checkbox`, implicit activat;
- `enabled`: câmp `checkbox`, implicit activat.

### 12.2. Validarea linkurilor

- linkurile interne trebuie să înceapă cu `/`;
- linkurile interne nu trebuie să conțină domeniul complet al site-ului;
- linkurile externe trebuie să utilizeze protocolul `https`;
- protocoalele `javascript`, `data` și alte scheme nesigure trebuie respinse;
- câmpul `openInNewTab` trebuie utilizat numai când este justificat;
- frontendul va adăuga atributele de securitate necesare linkurilor externe.

### 12.3. Câmpul headerActions

- nume tehnic: `headerActions`;
- tip Payload: `array`;
- obligatoriu: nu;
- număr maxim recomandat: 3 elemente;
- scop: acțiuni precum căutare, autentificare sau acces rapid la o secțiune importantă.

Fiecare acțiune va conține:

- `label`: câmp `text`, obligatoriu și localizat;
- `actionType`: câmp `select`;
- `href`: câmp `text`, localizat și condițional;
- `icon`: câmp `select`, limitat la pictograme implementate în frontend;
- `style`: câmp `select`, cu variante controlate precum `link`, `secondary` și `primary`;
- `enabled`: câmp `checkbox`, implicit activat.

### 12.4. Valorile actionType

Valorile inițiale recomandate sunt:

- `link`;
- `search`;
- `languageSwitcher`;
- `login`.

Valorile nu vor executa cod din Payload. Frontendul va asocia fiecare tip unei componente implementate și verificate.

### 12.5. Navigația mobilă

Navigația mobilă va reutiliza elementele din `primaryNavigation` și `headerActions`.

Nu se recomandă o listă complet separată pentru mobil în prima implementare, deoarece ar putea produce diferențe neintenționate între versiunile desktop și mobil.

Câmpurile `showInDesktop` și `showInMobile` permit excepții controlate.

### 12.6. Fallback frontend

Dacă lista administrată lipsește sau este invalidă, frontendul va utiliza navigația implicită aprobată:

- Știri AI;
- Sănătate;
- Educație;
- Instrumente AI;
- Afaceri.

Căutarea și selectorul de limbă vor rămâne componente controlate de frontend, chiar dacă activarea lor este configurată prin `SiteSettings`.

---

## 13. Limbile și selectorul de limbă

Grupul tehnic recomandat este `languageSettings`.

Acesta va controla limbile afișate public și comportamentul selectorului de limbă, fără să înlocuiască configurația tehnică de localizare Payload și Next.js.

### 13.1. Câmpul availableLanguages

- nume tehnic: `availableLanguages`;
- tip Payload: `array`;
- obligatoriu: da;
- număr minim: 1 element;
- număr maxim inițial recomandat: 2 elemente;
- scop: definirea limbilor disponibile în interfața publică.

Fiecare element va conține:

- `code`: câmp `select`, cu valorile inițiale `ro` și `en`;
- `label`: câmp `text`, de exemplu `Română` sau `English`;
- `shortLabel`: câmp `text`, de exemplu `RO` sau `EN`;
- `enabled`: câmp `checkbox`, implicit activat;
- `order`: câmp `number`, utilizat pentru ordinea de afișare.

### 13.2. Câmpul defaultLanguage

- nume tehnic: `defaultLanguage`;
- tip Payload: `select`;
- obligatoriu: da;
- valori inițiale: `ro` și `en`;
- valoare implicită recomandată: `ro`;
- scop: limba utilizată atunci când ruta sau preferința utilizatorului nu oferă o alegere validă.

### 13.3. Câmpul showLanguageSwitcher

- nume tehnic: `showLanguageSwitcher`;
- tip Payload: `checkbox`;
- obligatoriu: nu;
- valoare implicită: activat;
- scop: controlul vizibilității selectorului în header și navigația mobilă.

### 13.4. Reguli de consistență

- `defaultLanguage` trebuie să existe în lista `availableLanguages`;
- limba implicită trebuie să fie activată;
- codurile de limbă nu trebuie duplicate;
- cel puțin o limbă trebuie să rămână activă;
- dezactivarea unei limbi nu trebuie să șteargă conținutul localizat existent;
- frontendul trebuie să ignore limbile necunoscute sau neimplementate.

### 13.5. Comportamentul frontendului

Selectorul trebuie să păstreze, când este posibil, pagina echivalentă în cealaltă limbă.

Dacă nu există o traducere sau o rută echivalentă, utilizatorul va fi direcționat către homepage-ul limbii selectate.

Atributul HTML `lang` trebuie să fie setat dinamic la `ro` sau `en`, în funcție de limba activă.

### 13.6. Fallbackuri

Dacă configurația Globalului lipsește sau este invalidă, frontendul va utiliza:

- limbi disponibile: `ro` și `en`;
- limbă implicită: `ro`;
- selector de limbă: activ;
- etichete scurte: `RO` și `EN`.

---

## 14. Bara de încredere

Grupul tehnic recomandat este `trustBar`.

Bara de încredere va comunica pe scurt principiile editoriale ale platformei și va oferi acces direct la metodologia completă.

### 14.1. Câmpul enabled

- nume tehnic: `enabled`;
- tip Payload: `checkbox`;
- valoare implicită: activat;
- scop: controlul afișării globale a barei de încredere.

### 14.2. Câmpul items

- nume tehnic: `items`;
- tip Payload: `array`;
- obligatoriu: nu;
- număr maxim recomandat: 4 elemente;
- scop: afișarea principiilor editoriale esențiale.

Fiecare element va conține:

- `label`: câmp `text`, obligatoriu și localizat;
- `icon`: câmp `select`, limitat la pictograme implementate în frontend;
- `description`: câmp `textarea`, opțional și localizat;
- `enabled`: câmp `checkbox`, implicit activat;
- `order`: câmp `number`.

### 14.3. Valorile recomandate pentru icon

Valorile inițiale recomandate sunt:

- `verified`;
- `sources`;
- `updated`;
- `transparent`;
- `independent`;
- `medicalReview`.

Payload nu va permite introducerea unui nume arbitrar de pictogramă.

### 14.4. Câmpul methodologyLabel

- nume tehnic: `methodologyLabel`;
- tip Payload: `text`;
- obligatoriu: nu;
- localizat: da;
- scop: eticheta linkului către metodologia editorială;
- fallback recomandat în română: `Cum verificăm informațiile`.

### 14.5. Câmpul methodologyHref

- nume tehnic: `methodologyHref`;
- tip Payload: `text`;
- obligatoriu: nu;
- localizat: da;
- scop: ruta internă către pagina metodologiei;
- fallback recomandat: `/ro/metodologie` și `/en/methodology`.

### 14.6. Reguli editoriale

- afirmațiile afișate trebuie să reflecte procese aplicate în realitate;
- bara nu trebuie să conțină promisiuni absolute precum `fără erori`;
- formulările medicale trebuie să evite sugerarea unui diagnostic sau a unei garanții clinice;
- elementele inactive nu vor fi transmise componentelor frontend;
- ordinea finală va fi determinată de câmpul `order`.

### 14.7. Fallback frontend

Dacă Globalul nu conține elemente valide, frontendul poate afișa fallbackurile aprobate:

- Surse verificate;
- Actualizări transparente;
- Limite și riscuri explicate;
- Metodologie editorială publică.

Dacă `enabled` este dezactivat, bara nu va fi randată.

---

## 15. Metodologie și transparență editorială

Grupul tehnic recomandat este `methodology`.

Acest grup va administra mesajele globale prin care platforma explică modul de documentare, verificare, corectare și utilizare responsabilă a inteligenței artificiale.

Conținutul detaliat al metodologiei va rămâne într-o pagină editorială dedicată. `SiteSettings` va păstra numai configurația globală și textele scurte reutilizabile.

### 15.1. Câmpul enabled

- nume tehnic: `enabled`;
- tip Payload: `checkbox`;
- valoare implicită: activat;
- scop: activarea elementelor globale de metodologie și transparență.

### 15.2. Câmpul title

- nume tehnic: `title`;
- tip Payload: `text`;
- obligatoriu: nu;
- localizat: da;
- lungime maximă recomandată: 100 de caractere;
- scop: titlul scurt utilizat în componentele globale;
- fallback recomandat în română: `Cum lucrăm`.

### 15.3. Câmpul summary

- nume tehnic: `summary`;
- tip Payload: `textarea`;
- obligatoriu: nu;
- localizat: da;
- lungime maximă recomandată: 400 de caractere;
- scop: explicarea sintetică a procesului editorial;
- nu va accepta HTML arbitrar.

### 15.4. Câmpul pageLabel

- nume tehnic: `pageLabel`;
- tip Payload: `text`;
- obligatoriu: nu;
- localizat: da;
- scop: eticheta linkului către pagina completă de metodologie;
- fallback recomandat în română: `Citește metodologia editorială`.

### 15.5. Câmpul pageHref

- nume tehnic: `pageHref`;
- tip Payload: `text`;
- obligatoriu: nu;
- localizat: da;
- scop: ruta internă a paginii de metodologie;
- fallback recomandat: `/ro/metodologie` și `/en/methodology`;
- trebuie să respecte regulile de validare pentru linkuri interne.

### 15.6. Câmpul principles

- nume tehnic: `principles`;
- tip Payload: `array`;
- obligatoriu: nu;
- număr maxim recomandat: 6 elemente;
- scop: principii editoriale scurte, reutilizabile în secțiunea `Cum lucrăm`.

Fiecare element va conține:

- `title`: câmp `text`, obligatoriu și localizat;
- `description`: câmp `textarea`, obligatoriu și localizat;
- `icon`: câmp `select`, limitat la valorile implementate în frontend;
- `enabled`: câmp `checkbox`, implicit activat;
- `order`: câmp `number`.

### 15.7. Principii recomandate

Structura trebuie să poată reprezenta cel puțin următoarele principii:

- verificarea surselor;
- separarea faptelor de interpretări;
- declararea limitelor și riscurilor;
- actualizarea informațiilor;
- corectarea transparentă a erorilor;
- declararea utilizării AI;
- declararea sponsorizărilor și afilierilor;
- verificarea suplimentară a conținutului medical.

### 15.8. Reguli editoriale

- mesajele trebuie să descrie procese aplicate în realitate;
- nu se vor formula garanții absolute privind corectitudinea;
- utilizarea AI nu trebuie prezentată ca înlocuitor al verificării umane;
- informațiile medicale trebuie prezentate ca suport informativ, nu ca diagnostic;
- textele globale trebuie să rămână concise și să trimită către metodologia completă;
- elementele dezactivate nu vor fi transmise frontendului.

### 15.9. Fallback frontend

Dacă grupul nu este populat, frontendul poate utiliza următoarele principii implicite:

- folosim surse verificabile;
- explicăm limitele și riscurile;
- corectăm transparent informațiile;
- declarăm utilizarea AI și relațiile comerciale relevante.

---

## 16. Configurarea globală a newsletterului

Grupul tehnic recomandat este `newsletter`.

Acest grup va controla textele și comportamentul editorial al componentelor publice de abonare, fără să stocheze abonați și fără să înlocuiască fluxul securizat implementat prin SEC-001.

### 16.1. Câmpul enabled

- nume tehnic: `enabled`;
- tip Payload: `checkbox`;
- valoare implicită: activat;
- scop: controlul afișării globale a formularului de newsletter.

### 16.2. Câmpul title

- nume tehnic: `title`;
- tip Payload: `text`;
- obligatoriu: nu;
- localizat: da;
- lungime maximă recomandată: 100 de caractere;
- scop: titlul secțiunii de abonare;
- fallback recomandat în română: `Primește noutățile importante despre AI`.

### 16.3. Câmpul description

- nume tehnic: `description`;
- tip Payload: `textarea`;
- obligatoriu: nu;
- localizat: da;
- lungime maximă recomandată: 300 de caractere;
- scop: explicarea frecvenței și tipului de conținut trimis.

### 16.4. Câmpul emailLabel

- nume tehnic: `emailLabel`;
- tip Payload: `text`;
- obligatoriu: nu;
- localizat: da;
- scop: eticheta accesibilă a câmpului de e-mail;
- fallback recomandat în română: `Adresa de e-mail`.

### 16.5. Câmpul emailPlaceholder

- nume tehnic: `emailPlaceholder`;
- tip Payload: `text`;
- obligatoriu: nu;
- localizat: da;
- scop: exemplu vizual pentru câmpul de e-mail;
- placeholderul nu va înlocui eticheta accesibilă.

### 16.6. Câmpul submitLabel

- nume tehnic: `submitLabel`;
- tip Payload: `text`;
- obligatoriu: nu;
- localizat: da;
- scop: textul butonului de abonare;
- fallback recomandat în română: `Abonează-mă`.

### 16.7. Câmpul consentText

- nume tehnic: `consentText`;
- tip Payload: `textarea`;
- obligatoriu: nu;
- localizat: da;
- scop: informarea utilizatorului privind prelucrarea datelor și confirmarea double opt-in;
- nu va accepta HTML arbitrar.

### 16.8. Câmpurile pentru mesaje

Grupul va include următoarele texte localizate:

- `successMessage`: confirmarea trimiterii linkului de verificare;
- `alreadySubscribedMessage`: mesajul pentru o adresă deja abonată;
- `invalidEmailMessage`: mesajul pentru o adresă invalidă;
- `genericErrorMessage`: mesajul pentru erori temporare;
- `privacyLabel`: eticheta linkului către politica de confidențialitate;
- `privacyHref`: ruta internă către politica de confidențialitate.

### 16.9. Reguli de securitate

- Globalul nu va conține chei Brevo, secrete HMAC sau alte credențiale;
- formularul va utiliza exclusiv endpointul controlat existent;
- endpointul generic Payload pentru colecția Newsletter rămâne blocat public;
- confirmarea double opt-in rămâne obligatorie;
- textele configurabile nu vor modifica logica de securitate;
- răspunsurile publice trebuie să reducă posibilitatea de enumerare a adreselor.

### 16.10. Fallback frontend

Dacă grupul nu este populat, frontendul va utiliza texte implicite locale și va păstra activ fluxul securizat existent.

Dacă `enabled` este dezactivat, formularul nu va fi randat, dar endpointul tehnic nu va fi modificat automat.

---

## 17. Footer, contact și linkuri globale

Această secțiune reunește grupurile tehnice `footer`, `contact`, `socialLinks` și `legalLinks`.

Scopul este administrarea centralizată a informațiilor globale afișate în partea inferioară a site-ului, fără duplicarea lor în componente sau pagini.

### 17.1. Câmpul footerEnabled

- nume tehnic: `footerEnabled`;
- tip Payload: `checkbox`;
- valoare implicită: activat;
- scop: controlul randării footerului global.

### 17.2. Câmpul footerIntro

- nume tehnic: `footerIntro`;
- tip Payload: `textarea`;
- obligatoriu: nu;
- localizat: da;
- lungime maximă recomandată: 300 de caractere;
- scop: descrierea scurtă a platformei în footer;
- nu va accepta HTML arbitrar.

### 17.3. Câmpul footerSections

- nume tehnic: `footerSections`;
- tip Payload: `array`;
- obligatoriu: nu;
- număr maxim recomandat: 5 secțiuni;
- scop: organizarea linkurilor în coloane tematice.

Fiecare secțiune va conține:

- `title`: câmp `text`, obligatoriu și localizat;
- `enabled`: câmp `checkbox`, implicit activat;
- `order`: câmp `number`;
- `links`: câmp `array`, cu maximum 10 elemente.

Fiecare link va conține:

- `label`: câmp `text`, obligatoriu și localizat;
- `linkType`: câmp `select`, cu valorile `internal` și `external`;
- `href`: câmp `text`, obligatoriu și localizat;
- `openInNewTab`: câmp `checkbox`, implicit dezactivat;
- `enabled`: câmp `checkbox`, implicit activat;
- `order`: câmp `number`.

### 17.4. Grupul contact

Grupul `contact` va conține:

- `contactTitle`: câmp `text`, localizat;
- `publicEmail`: câmp `email`, opțional;
- `phone`: câmp `text`, opțional;
- `address`: câmp `textarea`, localizat și opțional;
- `contactPageLabel`: câmp `text`, localizat;
- `contactPageHref`: câmp `text`, localizat;
- `enabled`: câmp `checkbox`, implicit activat.

Datele de contact introduse aici sunt publice și nu trebuie să includă informații personale care nu sunt destinate publicării.

### 17.5. Grupul socialLinks

- tip Payload: `array`;
- obligatoriu: nu;
- număr maxim recomandat: 8 elemente;
- scop: administrarea conturilor sociale oficiale.

Fiecare element va conține:

- `platform`: câmp `select`;
- `label`: câmp `text`, localizat și opțional;
- `url`: câmp `text`, obligatoriu;
- `enabled`: câmp `checkbox`, implicit activat;
- `order`: câmp `number`.

Valorile inițiale recomandate pentru `platform` sunt:

- `facebook`;
- `linkedin`;
- `youtube`;
- `instagram`;
- `x`;
- `tiktok`;
- `github`.

### 17.6. Grupul legalLinks

- tip Payload: `array`;
- obligatoriu: da;
- scop: administrarea linkurilor legale afișate în footer.

Lista trebuie să poată include cel puțin:

- Politica de confidențialitate;
- Politica de cookie-uri;
- Termeni și condiții;
- Politica editorială;
- Politica privind corecțiile;
- Declarația privind utilizarea AI.

Fiecare element va conține:

- `label`: câmp `text`, obligatoriu și localizat;
- `href`: câmp `text`, obligatoriu și localizat;
- `enabled`: câmp `checkbox`, implicit activat;
- `order`: câmp `number`.

### 17.7. Câmpul copyrightText

- nume tehnic: `copyrightText`;
- tip Payload: `text`;
- obligatoriu: nu;
- localizat: da;
- scop: textul afișat în partea inferioară a footerului;
- fallback frontend: anul curent și denumirea platformei.

### 17.8. Validarea linkurilor

- linkurile interne trebuie să înceapă cu `/`;
- linkurile externe trebuie să utilizeze `https`;
- schemele nesigure trebuie respinse;
- linkurile externe deschise într-un tab nou trebuie să primească atributele de securitate necesare;
- linkurile inactive nu vor fi transmise frontendului;
- ordinea finală va fi stabilită prin câmpul `order`.

### 17.9. Fallback frontend

Dacă structura administrată lipsește sau este invalidă, frontendul trebuie să păstreze cel puțin:

- identitatea platformei;
- linkul către contact;
- politica de confidențialitate;
- termenii și condițiile;
- textul de copyright.

---

## 18. Setări editoriale, accesibilitate și metadata

Această secțiune reunește grupurile tehnice `editorialDefaults`, `accessibility` și `metadata`.

Câmpurile vor controla numai texte și opțiuni publice generale. Nu vor înlocui metadatele specifice articolelor sau paginilor.

### 18.1. Grupul editorialDefaults

Grupul va putea conține următoarele câmpuri localizate:

- `readMoreLabel`: eticheta globală pentru accesarea conținutului complet;
- `latestArticlesLabel`: eticheta pentru lista articolelor recente;
- `viewAllLabel`: eticheta generală pentru arhive;
- `updatedLabel`: eticheta pentru data actualizării;
- `verifiedLabel`: eticheta pentru data verificării;
- `readingTimeLabel`: eticheta pentru timpul de lectură;
- `sourceLabel`: eticheta pentru surse;
- `correctionsLabel`: eticheta pentru istoricul corecțiilor;
- `sponsoredLabel`: eticheta pentru conținut sponsorizat;
- `aiDisclosureLabel`: eticheta pentru declarația privind utilizarea AI.

Toate câmpurile vor fi opționale și vor avea fallbackuri definite în frontend.

### 18.2. Reguli pentru editorialDefaults

- textele trebuie să fie scurte și clare;
- câmpurile nu vor accepta HTML arbitrar;
- etichetele nu vor modifica logica editorială;
- lipsa unei valori nu trebuie să blocheze afișarea;
- traducerile trebuie verificate separat pentru română și engleză.

### 18.3. Grupul accessibility

Grupul va putea conține texte localizate pentru:

- `skipToContentLabel`;
- `openMenuLabel`;
- `closeMenuLabel`;
- `searchLabel`;
- `languageSwitcherLabel`;
- `externalLinkLabel`;
- `previousPageLabel`;
- `nextPageLabel`;
- `loadingLabel`;
- `errorLabel`.

Aceste texte completează implementarea tehnică de accesibilitate, dar nu o înlocuiesc.

### 18.4. Reguli de accesibilitate

- etichetele configurabile trebuie să rămână descriptive;
- textul vizibil și eticheta accesibilă nu trebuie să se contrazică;
- câmpurile nu vor permite eliminarea completă a unei etichete obligatorii;
- frontendul va păstra fallbackuri accesibile;
- ordinea de focus, contrastul și comportamentul tastaturii rămân responsabilitatea frontendului.

### 18.5. Grupul metadata

Grupul va putea conține:

- `defaultMetaTitle`: câmp `text`, localizat;
- `defaultMetaDescription`: câmp `textarea`, localizat;
- `defaultShareImage`: câmp `upload`, relație către `media`;
- `siteAuthor`: câmp `text`, opțional;
- `publisherName`: câmp `text`, opțional;
- `twitterCardType`: câmp `select`, cu valori controlate;
- `robotsDefault`: câmp `select`, limitat la opțiuni sigure.

### 18.6. Prioritatea metadatelor

Ordinea recomandată este:

1. metadatele specifice paginii sau articolului;
2. metadatele definite de structura editorială relevantă;
3. fallbackurile din `SiteSettings`;
4. fallbackurile statice din frontend.

### 18.7. Reguli pentru metadata

- titlul implicit trebuie să fie concis;
- descrierea implicită nu trebuie să depășească lungimea recomandată pentru motoarele de căutare;
- imaginea implicită trebuie să provină din colecția `Media`;
- câmpurile nu vor permite introducerea de markup sau scripturi;
- opțiunile `robots` trebuie limitate la valori implementate și verificate;
- paginile private sau tehnice nu vor moșteni automat setări publice indexabile.

### 18.8. Fallback frontend

Dacă aceste grupuri lipsesc, frontendul va utiliza etichetele locale, metadatele și mesajele accesibile definite în cod.

---

## 19. Implementare, migrare și impact tehnic

Introducerea Globalului `SiteSettings` reprezintă o modificare de schemă Payload și trebuie realizată prin fluxul controlat de migrații.

### 19.1. Fișierul Globalului

Structura recomandată este definirea Globalului într-un fișier separat, de exemplu:

`src/globals/SiteSettings.ts`

Fișierul trebuie să conțină:

- configurația Globalului;
- grupurile și taburile aprobate;
- validările câmpurilor;
- regulile de acces;
- textele și descrierile pentru Admin Payload;
- hookurile strict necesare, dacă vor fi justificate.

### 19.2. Înregistrarea în Payload

Globalul va fi importat și înregistrat explicit în `src/payload.config.ts` prin proprietatea `globals`.

Înregistrarea trebuie să păstreze configurația existentă pentru colecții, editor, baza de date și migrațiile de producție.

### 19.3. Impactul asupra bazei de date

Payload va introduce tabelele și structurile necesare pentru Global și pentru valorile localizate.

Nu se va utiliza `PAYLOAD_DB_PUSH` pentru aplicarea modificării în staging sau producție.

Schema va fi actualizată exclusiv printr-o migrare generată, inspectată și înregistrată în `src/migrations/index.ts`.

### 19.4. Migrarea inițială

Migrarea inițială trebuie să:

- creeze numai structurile necesare Globalului;
- nu modifice tabele editoriale fără legătură;
- nu șteargă sau transforme date existente;
- permită rollback controlat;
- fie verificată manual înainte de commit;
- fie testată mai întâi în baza `844-ai-dev`.

### 19.5. Popularea datelor

Migrarea nu trebuie să introducă automat texte editoriale complexe.

După deploymentul în staging, Globalul va fi populat controlat din Admin Payload folosind valorile aprobate.

Frontendul trebuie să funcționeze și înainte de populare, prin fallbackurile definite în cod.

### 19.6. Integrarea frontendului

Integrarea frontendului trebuie realizată într-un PR separat de introducerea schemei.

Ordinea recomandată este:

1. introducerea Globalului și a migrației;
2. testarea și popularea în staging;
3. introducerea funcției `getSiteSettings(locale)`;
4. integrarea treptată în Header și Footer;
5. integrarea TrustBar și Newsletter;
6. integrarea metadatelor și textelor globale;
7. verificarea fallbackurilor și accesibilității.

### 19.7. Separarea responsabilităților

PR-ul de schemă nu trebuie să includă simultan:

- reconstrucția completă a headerului;
- reconstrucția completă a footerului;
- modificări ample de CSS;
- implementarea Homepage;
- implementarea Autori sau FlashAI;
- refactorizări fără legătură;
- modificări în producție.

### 19.8. Deployment

Deploymentul inițial va fi realizat manual numai în Railway staging.

După deployment trebuie verificate:

- rularea migrației;
- accesul în Admin Payload;
- afișarea Globalului `Setări site`;
- salvarea valorilor în română și engleză;
- relațiile către Media;
- funcționarea site-ului cu Globalul gol și populat;
- lipsa regresiilor în colecțiile existente.

### 19.9. Producția

Producția nu va fi modificată până când schema, datele, fallbackurile și integrarea frontendului nu sunt validate complet în staging.

Promovarea în producție va utiliza aceeași migrare versionată și același cod validat în staging.

---

## 20. Criterii de testare și acceptare

Implementarea `SiteSettings` va fi considerată validă numai după trecerea testelor de schemă, acces, localizare, frontend și regresie în staging.

### 20.1. Validarea configurației Payload

- Globalul este înregistrat o singură dată;
- slugul este `site-settings`;
- denumirea din Admin este `Setări site`;
- taburile și grupurile corespund arhitecturii aprobate;
- câmpurile obligatorii și opționale sunt configurate corect;
- nu există câmpuri pentru secrete, HTML arbitrar sau scripturi;
- TypeScript și buildul de producție trec fără erori noi.

### 20.2. Validarea migrației

- migrarea este generată prin fluxul controlat Payload;
- modificările SQL sunt inspectate manual;
- sunt create numai structurile necesare Globalului;
- tabelele și datele existente nu sunt afectate;
- migrarea `up` rulează cu succes în `844-ai-dev`;
- migrarea apare ca executată în status;
- rollbackul este posibil și documentat înainte de integrarea finală.

### 20.3. Validarea accesului

- citirea configurației publice necesare frontendului funcționează;
- un vizitator nu poate actualiza Globalul;
- un utilizator cu rol `cititor` nu poate actualiza Globalul;
- un utilizator cu rol `editor` nu poate actualiza Globalul în prima implementare;
- administratorul poate deschide, modifica și salva Globalul;
- răspunsul public nu conține informații sensibile.

### 20.4. Validarea localizării

- valorile în română și engleză pot fi salvate separat;
- modificarea unei limbi nu suprascrie cealaltă limbă;
- fallbackurile funcționează când o traducere lipsește;
- linkurile interne păstrează prefixele `/ro` și `/en`;
- atributul HTML `lang` corespunde limbii active.

### 20.5. Validarea relațiilor Media

- logo-urile și imaginile pot fi selectate din colecția `Media`;
- lipsa unei imagini nu blochează salvarea sau randarea;
- frontendul folosește fallbackurile aprobate;
- textul alternativ și creditele rămân disponibile;
- imaginile din Supabase Storage continuă să fie afișate.

### 20.6. Validarea navigației și linkurilor

- linkurile interne valide sunt acceptate;
- linkurile externe HTTPS valide sunt acceptate;
- schemele nesigure sunt respinse;
- elementele dezactivate nu sunt afișate;
- ordinea elementelor este respectată;
- fallbackul de navigație funcționează când lista administrată este goală.

### 20.7. Validarea frontendului

- homepage-ul și paginile publice funcționează cu Globalul gol;
- Header și Footer funcționează cu valorile administrate;
- navigația desktop și mobilă rămâne accesibilă;
- TrustBar și Newsletter respectă setările `enabled`;
- erorile de citire folosesc fallbackuri și nu blochează site-ul;
- structura Payload brută nu este transmisă direct componentelor.

### 20.8. Teste de regresie

- Admin Payload continuă să funcționeze;
- colecțiile existente pot fi deschise și salvate;
- articolele și imaginile existente sunt afișate;
- autentificarea și regulile RBAC existente rămân funcționale;
- Newsletter SEC-001 rămâne protejat;
- cursurile premium SEC-002 rămân protejate;
- migrațiile Payload existente rămân intacte.

### 20.9. Criteriul final de acceptare

`SiteSettings` poate fi considerat pregătit pentru promovarea ulterioară numai dacă toate testele obligatorii sunt documentate ca trecute în staging și nu există regresii critice.

Validarea în staging nu autorizează automat modificarea producției. Promovarea va necesita o decizie separată și verificarea exactă a commitului și migrației.

---

## 21. Decizii finale și statut

Arhitectura Globalului `SiteSettings` este definită și pregătită pentru etapa de implementare controlată.

### 21.1. Decizii aprobate

- `SiteSettings` va fi implementat ca Payload Global;
- slugul tehnic va fi `site-settings`;
- denumirea din Admin Payload va fi `Setări site`;
- textele publice vor suporta limbile română și engleză;
- actualizarea va fi permisă numai administratorului;
- citirea publică va conține exclusiv date publicabile;
- logo-urile și imaginile vor utiliza relații către colecția `Media`;
- frontendul va utiliza o funcție tipizată de normalizare;
- fallbackurile vor permite funcționarea site-ului înainte de popularea Globalului;
- modificarea schemei va fi aplicată exclusiv prin migrare controlată.

### 21.2. Structuri incluse

Arhitectura include:

- identitatea platformei;
- navigația principală și acțiunile din header;
- configurarea limbilor;
- bara de încredere;
- metodologia și transparența editorială;
- newsletterul global;
- footerul și datele de contact;
- linkurile sociale și legale;
- etichetele editoriale implicite;
- textele de accesibilitate;
- metadatele globale.

### 21.3. Elemente excluse

`SiteSettings` nu va administra:

- selecțiile editoriale ale homepage-ului;
- articolele, cursurile sau instrumentele AI;
- elementele Flash AI;
- profilurile autorilor;
- conturile de utilizator;
- secretele și variabilele de mediu;
- configurația PostgreSQL, Railway, Brevo sau Stripe;
- cod, HTML arbitrar, JavaScript sau CSS.

### 21.4. Ordinea implementării

Implementarea va fi realizată în etape separate:

1. definirea Globalului în cod;
2. generarea și inspectarea migrației;
3. validarea TypeScript și build;
4. PR separat către `staging`;
5. deployment manual în Railway staging;
6. rularea și verificarea migrației;
7. testarea în Admin Payload;
8. popularea controlată a valorilor;
9. integrarea frontendului într-un PR separat;
10. promovarea în producție numai după validarea completă.

### 21.5. Statut

**Statut UX-001A-06:** arhitectură finalizată.

Următoarea activitate este implementarea controlată a Globalului `SiteSettings` în Payload CMS, fără modificarea simultană a frontendului public.
