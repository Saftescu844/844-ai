# UX-001A-09 — Arhitectura Globalului Homepage

**Proiect:** 844-ai.ro
**Mediu de lucru:** branch `docs/ux-001a-09-homepage`
**Data definirii:** 5 august 2026
**Statut:** arhitectură în curs de documentare
**Tip structură Payload:** Global
**Impact curent asupra bazei de date:** niciunul
**Impact asupra producției:** niciunul

---

## 1. Scop

Globalul `Homepage` va administra structura editorială și configurația paginii principale a platformei 844-ai.ro.

Rolul său este să permită configurarea controlată a secțiunilor homepage-ului fără introducerea textelor, selecțiilor și ordinii direct în codul frontend.

Globalul va administra:

- ordinea secțiunilor aprobate;
- activarea sau dezactivarea controlată a fiecărei secțiuni;
- titlurile și introducerile localizate;
- selecțiile editoriale manuale;
- regulile de fallback către conținut dinamic;
- limitele de elemente afișate;
- legăturile interne principale;
- mesajele editoriale specifice homepage-ului;
- variantele de prezentare aprobate;
- metadatele SEO ale paginii principale.

Globalul `Homepage` nu va înlocui colecțiile editoriale existente și nu va stoca copii complete ale articolelor, cursurilor, instrumentelor sau elementelor Flash AI.

---

## 2. Obiective

Arhitectura Globalului `Homepage` urmărește:

1. separarea configurației editoriale de codul frontend;
2. administrarea independentă a versiunilor română și engleză;
3. păstrarea unei structuri coerente și accesibile;
4. combinarea selecției editoriale manuale cu fallbackuri dinamice sigure;
5. evitarea duplicării conținutului din colecțiile Payload;
6. integrarea controlată a colecției `FlashAI`;
7. evidențierea direcțiilor „Înțelege. Învață. Aplică.”;
8. susținerea priorității editoriale „AI în sănătate”;
9. permiterea promovării articolelor, cursurilor, roadmaps și instrumentelor evaluate;
10. menținerea performanței prin interogări și relații limitate;
11. prevenirea publicării unei configurații incomplete sau inconsistente;
12. permiterea evoluției homepage-ului fără redesignuri tehnice repetate.

---

## 3. Responsabilități și limite

Globalul `Homepage` va controla configurația paginii principale, nu conținutul editorial complet al platformei.

### 3.1. Responsabilități

Globalul va putea administra:

- activarea secțiunilor;
- ordinea secțiunilor;
- titlurile și textele introductive;
- selecțiile editoriale manuale;
- limitele de elemente afișate;
- regulile de fallback;
- legăturile către paginile interne;
- variantele de prezentare aprobate;
- mesajele specifice homepage-ului;
- metadatele SEO localizate.

### 3.2. Conținut administrat prin relații

Homepage-ul va utiliza relații către colecțiile existente pentru:

- articole;
- elemente Flash AI;
- instrumente AI;
- cursuri;
- roadmaps;
- categorii;
- autori, numai unde este necesară atribuirea publică.

Documentele asociate nu vor fi copiate integral în Global.

### 3.3. Elemente care nu aparțin în Globalul Homepage

Globalul nu va administra:

- corpul complet al articolelor;
- lecțiile cursurilor;
- evaluările complete ale instrumentelor;
- profilurile autorilor;
- sursele editoriale complete;
- utilizatorii și permisiunile administrative;
- comentariile;
- înscrierile la newsletter;
- fișiere media duplicate;
- secrete, chei API sau configurații de infrastructură;
- conținut publicat automat fără validare editorială.

### 3.4. Separarea față de SiteSettings

`Homepage` va administra exclusiv pagina principală.

`SiteSettings` va rămâne responsabil pentru configurațiile comune întregului site, precum identitatea platformei, navigația, footerul, contactul, legăturile juridice și valorile editoriale implicite.

Aceeași informație nu trebuie stocată simultan în ambele Globaluri.

---

## 4. Structura editorială aprobată

Homepage-ul va utiliza o structură editorială controlată, construită din secțiuni cunoscute și validate în frontend.

Globalul nu va permite introducerea arbitrară de componente, cod HTML sau blocuri necunoscute.

### 4.1. Ordinea de bază

Ordinea editorială aprobată este:

1. Header;
2. Hero editorial;
3. Bară de încredere;
4. Flash AI;
5. Înțelege. Învață. Aplică.;
6. AI în sănătate;
7. Ce este important acum;
8. Cei cinci piloni editoriali;
9. Începe să înveți;
10. Instrument AI evaluat;
11. Ultimele articole;
12. Cum lucrăm;
13. Newsletter;
14. Footer.

Headerul și footerul sunt configurate în principal prin `SiteSettings`, dar sunt incluse aici pentru a documenta fluxul complet al paginii.

### 4.2. Secțiuni administrate direct prin Homepage

Globalul `Homepage` va administra direct secțiunile dintre Hero și Newsletter.

Headerul, navigația generală, datele de contact, legăturile juridice și footerul nu vor fi duplicate în acest Global.

### 4.3. Ordine controlată

Prima implementare trebuie să păstreze ordinea aprobată.

Reordonarea liberă prin drag-and-drop nu este necesară în schema inițială.

O eventuală ordine configurabilă va utiliza identificatori controlați și validare împotriva secțiunilor duplicate sau lipsă.

### 4.4. Activarea secțiunilor

Fiecare secțiune administrată de Global poate avea un câmp `enabled`.

Dezactivarea unei secțiuni trebuie să:

- elimine complet secțiunea din frontend;
- nu șteargă configurația editorială existentă;
- nu afecteze documentele din colecțiile asociate;
- nu lase spații goale sau separatoare fără conținut;
- nu modifice automat celelalte secțiuni.

### 4.5. Secțiuni obligatorii

Hero-ul editorial reprezintă nucleul identității homepage-ului și trebuie să rămână activ în configurația publicată.

În prima versiune, secțiunile esențiale recomandate sunt:

- Hero editorial;
- Flash AI;
- Înțelege. Învață. Aplică.;
- AI în sănătate;
- Ultimele articole;
- Newsletter.

Validarea definitivă a secțiunilor obligatorii va fi stabilită în PR-ul tehnic al schemei.

---

## 5. Principii de proiectare

### 5.1. Homepage editorial, nu panou aglomerat

Pagina principală trebuie să prezinte o selecție coerentă de informații, nu toate documentele disponibile în platformă.

Fiecare secțiune trebuie să aibă un scop distinct și să evite repetarea acelorași elemente.

### 5.2. Înțelege. Învață. Aplică.

Homepage-ul trebuie să susțină explicit cele trei direcții principale ale platformei:

- înțelegerea conceptelor și evoluțiilor AI;
- învățarea structurată;
- aplicarea responsabilă a instrumentelor AI.

### 5.3. Încredere și trasabilitate

Selecțiile editoriale trebuie să păstreze vizibile, când sunt relevante:

- tipul conținutului;
- autorul sau verificatorul;
- sursa;
- data publicării sau actualizării;
- statutul evaluării;
- marcarea sponsorizărilor și conflictelor de interese.

### 5.4. Prioritate pentru AI în sănătate

Secțiunea „AI în sănătate” va avea o poziție editorială importantă și va prezenta inteligența artificială ca instrument de sprijin, nu ca înlocuitor automat al deciziei clinice.

### 5.5. Selecție manuală cu fallback sigur

Editorul poate selecta manual documentele principale.

Când selecția manuală lipsește sau devine neeligibilă, frontendul poate utiliza un fallback din documente publicate, localizate și validate.

Fallbackul nu trebuie să expună documente draft, retrase, expirate sau indisponibile în limba activă.

### 5.6. Stabilitate vizuală și accesibilitate

Homepage-ul trebuie să evite:

- carusele automate;
- ticker-e;
- animații continue;
- schimbări de conținut care produc deplasări necontrolate ale layoutului;
- comunicarea statutului exclusiv prin culoare;
- secțiuni cu un număr excesiv de carduri.

Structura trebuie să funcționeze cu tastatura, pe ecrane mici și cu preferința pentru mișcare redusă.

---

## 6. Localizare

Globalul `Homepage` trebuie să permită configurarea editorială distinctă a paginilor principale în limbile română și engleză.

Localizarea nu trebuie să se limiteze la traducerea literală a textelor, deoarece selecțiile și prioritățile editoriale pot diferi între cele două versiuni.

### 6.1. Câmpuri localizate

Vor fi localizate:

- titlurile secțiunilor;
- supratitlurile și introducerile;
- textele Hero;
- etichetele butoanelor și legăturilor;
- textele de încredere și metodologie specifice homepage-ului;
- mesajele pentru stările fără conținut;
- descrierile direcțiilor „Înțelege. Învață. Aplică.”;
- textele secțiunii „AI în sănătate”;
- titlul și descrierea SEO;
- textele alternative pentru imaginile administrate direct prin Global.

### 6.2. Câmpuri nelocalizate

Vor rămâne comune între limbi:

- identificatorii tehnici ai secțiunilor;
- valorile `enabled`;
- variantele de layout aprobate;
- limitele numerice;
- ordinea tehnică a secțiunilor;
- relațiile, atunci când același document este publicat în ambele limbi;
- regulile de fallback;
- setările de cache și comportament tehnic;
- câmpurile interne de audit.

### 6.3. Selecții editoriale pe limbă

Selecțiile manuale trebuie să poată fi diferite pentru română și engleză.

Un articol selectat pentru homepage-ul românesc nu trebuie afișat automat pe homepage-ul englezesc dacă nu are o versiune engleză publicată și aprobată.

Aceeași regulă se aplică elementelor Flash AI, cursurilor, roadmaps și instrumentelor evaluate.

### 6.4. Fallbackuri între limbi

Frontendul public nu trebuie să afișeze automat text românesc pe ruta engleză sau text englezesc pe ruta română.

Când o secțiune nu are configurație completă în limba activă, comportamentul permis este:

- utilizarea unui fallback din conținut publicat în aceeași limbă;
- ascunderea controlată a secțiunii;
- afișarea unui text implicit localizat din `SiteSettings`, dacă acesta este aprobat.

### 6.5. Consistența identității editoriale

Versiunile română și engleză trebuie să păstreze:

- aceeași promisiune centrală a platformei;
- aceleași standarde de verificare;
- aceeași diferențiere între conținut editorial și conținut sponsorizat;
- aceleași protecții pentru sănătate;
- aceeași ierarhie generală de încredere și accesibilitate.

### 6.6. Rutele publice

Homepage-urile localizate aprobate sunt:

- `/ro`;
- `/en`.

Frontendul trebuie să seteze atributul HTML `lang` la `ro`, respectiv `en`, și să genereze metadatele corespunzătoare limbii active.

---

## 7. Reguli de acces și publicare

Globalul `Homepage` controlează o pagină publică importantă și trebuie protejat împotriva modificărilor neautorizate sau a publicării unei configurații incomplete.

În prima implementare, administrarea va fi rezervată rolului `admin`.

### 7.1. Citire publică

- frontendul public poate citi numai configurația aprobată;
- răspunsul public trebuie să conțină numai câmpurile necesare randării homepage-ului;
- observațiile interne și datele de audit nu vor fi expuse;
- relațiile către documente nepublicate nu trebuie returnate public;
- fiecare rută va primi numai configurația limbii active;
- lipsa unei configurații valide trebuie tratată prin fallbackuri sigure.

### 7.2. Actualizare

- actualizarea este permisă numai rolului `admin` în prima implementare;
- operațiile publice de actualizare sunt blocate;
- câmpurile care controlează activarea secțiunilor trebuie protejate explicit;
- modificarea relațiilor manuale nu trebuie să schimbe documentele asociate;
- publicarea configurației trebuie blocată când lipsesc secțiunile obligatorii;
- introducerea rolului `editor` va necesita un audit RBAC separat.

### 7.3. Creare și ștergere

Fiind un Payload Global, `Homepage` reprezintă o configurație unică și nu va utiliza un flux obișnuit de creare sau ștergere a documentelor.

Globalul nu trebuie eliminat printr-o operație publică sau administrativă obișnuită.

Resetarea configurației va necesita o operație tehnică separată, documentată și testată.

### 7.4. Configurație publicată

Frontendul trebuie să utilizeze numai o configurație considerată publicabilă.

În etapa de implementare trebuie evaluată una dintre următoarele variante:

- Payload Drafts și Versions pentru Global;
- un câmp editorial explicit de stare;
- validarea integrală înaintea fiecărei salvări publice.

Decizia tehnică definitivă va fi luată într-un PR separat.

### 7.5. Condiții minime pentru utilizarea publică

Configurația nu trebuie utilizată public dacă lipsesc:

- textele Hero în limba activă;
- legătura principală a Hero-ului;
- configurația secțiunilor obligatorii;
- titlurile secțiunilor active;
- limitele numerice valide;
- regulile de fallback pentru selecțiile dinamice;
- metadatele de bază ale homepage-ului;
- validarea relațiilor manuale.

### 7.6. Separarea datelor publice de datele interne

Pot rămâne interne:

- observațiile editoriale;
- motivele dezactivării unei secțiuni;
- identitatea utilizatorului care a modificat configurația;
- istoricul tehnic al schimbărilor;
- rezultatele verificărilor de consistență;
- datele temporare de preview.

Aceste informații nu trebuie transmise componentelor publice.

### 7.7. Principiul expunerii minime

Frontendul nu va consuma obiectul Payload complet.

O funcție server-side dedicată va selecta, valida și normaliza configurația publică a homepage-ului pentru limba solicitată.

---

## 8. Modelul de date propus

Globalul `Homepage` trebuie să descrie configurația editorială a paginii principale fără a copia conținutul complet din colecțiile Payload asociate.

Denumirile definitive ale câmpurilor vor fi validate în etapa separată de implementare a schemei.

### 8.1. Identificare și control editorial

#### `internalTitle`

- tip recomandat: `text`;
- obligatoriu: da;
- localizat: nu;
- utilizare: identificarea clară a configurației în Admin Payload;
- valoare recomandată: `Homepage principal`;
- nu trebuie expus în frontendul public.

#### `status`

- tip recomandat: `select`;
- obligatoriu: da;
- localizat: nu.

Valorile inițiale recomandate sunt:

- `draft` — configurație în lucru;
- `review` — configurație trimisă pentru verificare;
- `published` — configurație aprobată pentru frontend;
- `archived` — configurație păstrată numai pentru evidență.

Dacă Payload Drafts și Versions va fi activat pentru Global, necesitatea câmpului `status` va fi reevaluată.

#### `editorialNotes`

- tip recomandat: `textarea`;
- obligatoriu: nu;
- localizat: nu;
- public: nu;
- utilizare: observații interne privind selecțiile și modificările planificate.

#### `lastEditorialReviewAt`

- tip recomandat: `date` cu oră;
- obligatoriu pentru publicare: recomandat;
- localizat: nu;
- utilizare: momentul ultimei verificări editoriale complete a homepage-ului.

#### `reviewedBy`

- tip recomandat: relație către `Useri` sau identitate editorială internă;
- obligatoriu pentru publicare: recomandat;
- public: nu;
- relația nu conferă automat drepturi suplimentare.

### 8.2. Configurația generală a secțiunilor

Fiecare secțiune administrată direct poate utiliza un grup cu următoarea structură comună:

#### `enabled`

- tip recomandat: `checkbox`;
- valoare implicită: stabilită separat pentru fiecare secțiune;
- localizat: nu;
- utilizare: activarea sau dezactivarea controlată a secțiunii.

#### `eyebrow`

- tip recomandat: `text`;
- obligatoriu: nu;
- localizat: da;
- utilizare: supratitlu scurt afișat înaintea titlului principal.

#### `title`

- tip recomandat: `text`;
- obligatoriu când secțiunea este activă: da;
- localizat: da;
- utilizare: titlul public al secțiunii.

#### `description`

- tip recomandat: `textarea`;
- obligatoriu: condițional;
- localizat: da;
- utilizare: introducere editorială scurtă.

#### `linkLabel`

- tip recomandat: `text`;
- obligatoriu când există o legătură: da;
- localizat: da.

#### `linkUrl`

- tip recomandat: `text` validat ca rută internă;
- obligatoriu: condițional;
- localizat: da dacă rutele diferă între română și engleză;
- legăturile externe nu sunt recomandate pentru navigarea principală dintre secțiuni.

#### `itemLimit`

- tip recomandat: `number`;
- obligatoriu: condițional;
- localizat: nu;
- trebuie validat între limitele aprobate pentru fiecare secțiune.

### 8.3. Hero editorial

#### `hero`

- tip recomandat: `group`;
- obligatoriu: da;
- localizat parțial;
- secțiunea trebuie să rămână activă în configurația publicată.

Câmpurile recomandate sunt:

#### `hero.eyebrow`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu: nu;
- utilizare: formulare editorială introductivă discretă.

#### `hero.title`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu pentru publicare: da;
- formularea centrală aprobată în română este `Înțelege. Învață. Aplică.`;
- versiunea engleză trebuie păstrată semantic echivalentă.

#### `hero.description`

- tip recomandat: `textarea`;
- localizat: da;
- obligatoriu pentru publicare: da;
- utilizare: explicarea promisiunii platformei într-un text scurt și clar.

#### `hero.primaryAction`

- tip recomandat: `group` cu `label` și `url`;
- localizat: da;
- obligatoriu pentru publicare: da;
- URL-ul trebuie să fie o rută internă validă;
- acțiunea trebuie să conducă utilizatorul către un punct clar de început.

#### `hero.secondaryAction`

- tip recomandat: `group` cu `label` și `url`;
- localizat: da;
- obligatoriu: nu;
- nu trebuie să concureze vizual cu acțiunea principală.

#### `hero.visual`

- tip recomandat: relație către `Media`;
- obligatoriu: nu;
- utilizare: imagine editorială sau ilustrație opțională;
- lipsa imaginii nu trebuie să blocheze publicarea.

#### `hero.visualAlt`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu când imaginea transmite informație;
- imaginile decorative trebuie marcate corespunzător în frontend.

#### `hero.showTrustSignals`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `true`;
- utilizare: activarea indicatorilor de încredere aprobați în design.

### 8.4. Bară de încredere

#### `trustBar`

- tip recomandat: `group`;
- obligatoriu: nu;
- poate utiliza valori implicite din `SiteSettings` fără duplicarea conținutului comun.

Câmpurile recomandate sunt:

#### `trustBar.enabled`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `true`.

#### `trustBar.items`

- tip recomandat: `array`;
- localizat parțial;
- număr recomandat: între două și patru elemente;
- fiecare element trebuie să exprime un principiu verificabil al platformei.

Fiecare element poate include:

- `label` — text public localizat;
- `icon` — identificator dintr-o listă controlată;
- `linkUrl` — rută internă opțională către metodologie sau transparență;
- `linkLabel` — etichetă localizată opțională.

Exemple de mesaje potrivite sunt:

- surse verificate;
- actualizări și corecții transparente;
- instrumente evaluate responsabil;
- separarea clară a conținutului sponsorizat.

Bara de încredere nu trebuie să conțină afirmații absolute sau promisiuni imposibil de verificat.

### 8.5. Secțiunea Flash AI

#### `flashAI`

- tip recomandat: `group`;
- obligatoriu în configurația inițială: recomandat;
- utilizează documente din colecția `FlashAI`;
- nu copiază titlul, rezumatul, sursa sau statutul factual în Global.

Câmpurile recomandate sunt:

#### `flashAI.enabled`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `true`.

#### `flashAI.eyebrow`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu: nu.

#### `flashAI.title`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu când secțiunea este activă: da.

#### `flashAI.description`

- tip recomandat: `textarea`;
- localizat: da;
- obligatoriu: nu;
- trebuie să explice caracterul scurt, actual și verificat al rubricii.

#### `flashAI.selectionMode`

- tip recomandat: `select`;
- localizat: nu;
- obligatoriu: da;
- valori recomandate: `manual`, `automatic`, `manualWithFallback`;
- valoare implicită recomandată: `manualWithFallback`.

#### `flashAI.manualItems`

- tip recomandat: relație multiplă către `FlashAI`;
- localizat: da, dacă selecțiile diferă între limbi;
- obligatoriu numai pentru modul `manual`;
- trebuie să accepte numai elemente eligibile public.

#### `flashAI.itemLimit`

- tip recomandat: `number`;
- valoare implicită recomandată: `4`;
- valori permise: între `3` și `5`.

#### `flashAI.archiveLink`

- tip recomandat: `group` cu `label` și `url`;
- localizat: da;
- rutele recomandate sunt `/ro/flash` și `/en/flash`.

Fallbackul automat trebuie să selecteze numai elemente publicate sau corectate și aprobate pentru republicare, disponibile în limba activă și eligibile pentru homepage.

### 8.6. Secțiunea Înțelege. Învață. Aplică.

#### `pathways`

- tip recomandat: `group`;
- obligatoriu în configurația inițială: recomandat;
- utilizare: prezentarea celor trei trasee principale ale platformei.

Câmpurile comune recomandate sunt:

- `enabled` — activarea secțiunii;
- `eyebrow` — supratitlu localizat opțional;
- `title` — titlu localizat obligatoriu;
- `description` — introducere localizată opțională;
- `items` — listă controlată de exact trei elemente.

Fiecare element din `items` va include:

#### `pathways.items.key`

- tip recomandat: `select`;
- localizat: nu;
- obligatoriu: da;
- valori fixe: `understand`, `learn`, `apply`;
- fiecare valoare poate apărea o singură dată.

#### `pathways.items.title`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu: da.

#### `pathways.items.description`

- tip recomandat: `textarea`;
- localizat: da;
- obligatoriu: da;
- trebuie să descrie clar beneficiul traseului.

#### `pathways.items.linkLabel`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu: da.

#### `pathways.items.linkUrl`

- tip recomandat: `text` validat ca rută internă;
- localizat: da;
- obligatoriu: da.

#### `pathways.items.icon`

- tip recomandat: `select` dintr-o listă controlată;
- obligatoriu: nu;
- pictograma nu trebuie să fie singurul indiciu al sensului.

Ordinea publică aprobată este `understand`, `learn`, `apply` și nu trebuie modificată accidental prin ordonarea relațiilor.

### 8.7. Secțiunea AI în sănătate

#### `healthAI`

- tip recomandat: `group`;
- obligatoriu în configurația inițială: recomandat;
- utilizare: evidențierea direcției editoriale prioritare „AI în sănătate”.

Câmpurile recomandate sunt:

#### `healthAI.enabled`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `true`.

#### `healthAI.eyebrow`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu: nu.

#### `healthAI.title`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu când secțiunea este activă: da.

#### `healthAI.description`

- tip recomandat: `textarea`;
- localizat: da;
- obligatoriu: da;
- trebuie să prezinte AI ca a doua opinie digitală și instrument de sprijin pentru decizia clinică;
- nu trebuie să sugereze înlocuirea medicului sau diagnosticul automat garantat.

#### `healthAI.focusAreas`

- tip recomandat: `array` controlat;
- localizat parțial;
- număr recomandat: patru elemente;
- identificatorii aprobați sunt `diagnosticsImaging`, `clinicalSupport`, `patients` și `mentalHealth`.

Fiecare arie poate include:

- `key` — identificator tehnic unic;
- `title` — titlu localizat;
- `description` — descriere localizată;
- `linkLabel` — etichetă localizată;
- `linkUrl` — rută internă localizată;
- `icon` — identificator vizual controlat.

#### `healthAI.featuredArticles`

- tip recomandat: relație multiplă către `Articole`;
- localizat: da;
- obligatoriu: nu;
- trebuie să accepte numai articole publice asociate domeniului sănătății.

#### `healthAI.itemLimit`

- tip recomandat: `number`;
- valoare implicită recomandată: `3`;
- limite recomandate: între `1` și `4`.

#### `healthAI.selectionMode`

- tip recomandat: `select`;
- valori recomandate: `manual`, `automatic`, `manualWithFallback`;
- valoare implicită recomandată: `manualWithFallback`.

Fallbackul trebuie să selecteze numai articole publicate, disponibile în limba activă și încadrate editorial în sănătate.

### 8.8. Secțiunea Ce este important acum

#### `importantNow`

- tip recomandat: `group`;
- utilizare: selecție editorială curatoriată a subiectelor care necesită atenție și context;
- nu trebuie confundată cu fluxul cronologic `Ultimele articole` sau cu actualizările compacte `Flash AI`.

Câmpurile recomandate sunt:

#### `importantNow.enabled`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `true`.

#### `importantNow.eyebrow`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu: nu.

#### `importantNow.title`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu când secțiunea este activă: da.

#### `importantNow.description`

- tip recomandat: `textarea`;
- localizat: da;
- obligatoriu: nu;
- utilizare: explicarea motivului pentru care selecția este relevantă în prezent.

#### `importantNow.selectionMode`

- tip recomandat: `select`;
- valori recomandate: `manual`, `automatic`, `manualWithFallback`;
- valoare implicită recomandată: `manual`;
- selecția curatoriată trebuie să aibă prioritate față de fallbackul cronologic.

#### `importantNow.featuredArticles`

- tip recomandat: relație multiplă către `Articole`;
- localizat: da;
- număr recomandat: între `1` și `3`;
- trebuie să accepte numai articole publicate și disponibile în limba activă.

#### `importantNow.itemLimit`

- tip recomandat: `number`;
- valoare implicită recomandată: `3`;
- valori permise recomandate: între `1` și `4`.

#### `importantNow.archiveLink`

- tip recomandat: `group` cu `label` și `url`;
- localizat: da;
- obligatoriu: nu;
- ruta trebuie să conducă spre o categorie, o temă sau o pagină editorială relevantă.

Aceeași selecție nu trebuie repetată nejustificat în `AI în sănătate`, `Ultimele articole` și `Ce este important acum`.

### 8.9. Secțiunea Cei cinci piloni editoriali

#### `editorialPillars`

- tip recomandat: `group`;
- utilizare: prezentarea principalelor domenii editoriale ale platformei;
- structura trebuie să conțină exact cinci piloni în configurația inițială.

Pilonii aprobați conceptual sunt:

1. Știri AI;
2. Sănătate;
3. Educație;
4. Instrumente AI;
5. Afaceri.

Câmpurile recomandate sunt:

#### `editorialPillars.enabled`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `true`.

#### `editorialPillars.title`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu când secțiunea este activă: da.

#### `editorialPillars.description`

- tip recomandat: `textarea`;
- localizat: da;
- obligatoriu: nu.

#### `editorialPillars.items`

- tip recomandat: `array` controlat;
- număr obligatoriu: exact `5`;
- fiecare identificator tehnic poate apărea o singură dată.

Fiecare pilon poate include:

- `key` — identificator controlat;
- `category` — relație către `Categorii`;
- `title` — titlu public localizat;
- `description` — descriere localizată;
- `linkLabel` — etichetă localizată;
- `linkUrl` — rută internă localizată;
- `icon` — identificator dintr-o listă controlată;
- `featuredArticle` — relație opțională către un articol public.

Valorile tehnice recomandate pentru `key` sunt:

- `aiNews`;
- `health`;
- `education`;
- `aiTools`;
- `business`.

Relația către `Categorii` trebuie să fie sursa principală pentru filtrare, iar textele din Global trebuie utilizate numai pentru prezentarea specifică homepage-ului.

### 8.10. Secțiunea Începe să înveți

#### `startLearning`

- tip recomandat: `group`;
- utilizare: orientarea utilizatorului către cursuri și parcursuri educaționale structurate;
- secțiunea nu trebuie să copieze conținutul lecțiilor în Global.

Câmpurile recomandate sunt:

#### `startLearning.enabled`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `true`.

#### `startLearning.eyebrow`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu: nu.

#### `startLearning.title`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu când secțiunea este activă: da.

#### `startLearning.description`

- tip recomandat: `textarea`;
- localizat: da;
- obligatoriu: nu;
- trebuie să explice diferența dintre un curs și un roadmap.

#### `startLearning.selectionMode`

- tip recomandat: `select`;
- valori recomandate: `manual`, `automatic`, `manualWithFallback`;
- valoare implicită recomandată: `manualWithFallback`.

#### `startLearning.featuredCourses`

- tip recomandat: relație multiplă către `Cursuri`;
- localizat: da;
- obligatoriu: nu;
- trebuie să accepte numai cursuri publice, disponibile și eligibile pentru promovare.

#### `startLearning.featuredRoadmaps`

- tip recomandat: relație multiplă către `Roadmaps`;
- localizat: da;
- obligatoriu: nu;
- trebuie să accepte numai roadmaps publice și disponibile în limba activă.

#### `startLearning.itemLimit`

- tip recomandat: `number`;
- valoare implicită recomandată: `4`;
- limite recomandate: între `2` și `6` pentru totalul elementelor afișate.

#### `startLearning.archiveLink`

- tip recomandat: `group` cu `label` și `url`;
- localizat: da;
- utilizare: legătură către centrul educațional sau lista completă de parcursuri.

Fallbackul trebuie să prioritizeze documentele publicate, complete, ordonate editorial și disponibile în limba activă.

### 8.11. Secțiunea Instrument AI evaluat

#### `featuredTool`

- tip recomandat: `group`;
- utilizare: prezentarea unui instrument AI analizat și evaluat editorial;
- secțiunea nu trebuie să funcționeze ca reclamă mascată;
- informațiile complete despre instrument rămân în colecția `Tooluri`.

Câmpurile recomandate sunt:

#### `featuredTool.enabled`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `true`.

#### `featuredTool.eyebrow`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu: nu.

#### `featuredTool.title`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu când secțiunea este activă: da.

#### `featuredTool.description`

- tip recomandat: `textarea`;
- localizat: da;
- obligatoriu: nu;
- utilizare: explicarea criteriilor editoriale ale selecției.

#### `featuredTool.selectionMode`

- tip recomandat: `select`;
- valori recomandate: `manual`, `automatic`, `manualWithFallback`;
- valoare implicită recomandată: `manual`;
- selecția automată este permisă numai după introducerea unui statut editorial clar în `Tooluri`.

#### `featuredTool.tool`

- tip recomandat: relație către `Tooluri`;
- localizat: da dacă selecția diferă între limbi;
- obligatoriu pentru modul `manual`;
- trebuie să accepte numai instrumente publice, evaluate și disponibile în limba activă.

#### `featuredTool.linkLabel`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu: da când instrumentul este selectat;
- legătura recomandată conduce către pagina internă de evaluare, nu direct către site-ul comercial.

#### `featuredTool.showEvaluationStatus`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `true`;
- utilizare: afișarea datei și statutului ultimei evaluări.

#### `featuredTool.showCommercialDisclosure`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `true`;
- dezvăluirea sponsorizării, afilierii sau relației comerciale nu trebuie să poată fi ascunsă când aceasta există.

Cardul public trebuie să poată prezenta:

- scopul principal al instrumentului;
- avantajele relevante;
- limitele și riscurile;
- disponibilitatea și costul orientativ;
- data evaluării;
- statutul sponsorizării sau afilierii;
- legătura către evaluarea completă.

### 8.12. Secțiunea Ultimele articole

#### `latestArticles`

- tip recomandat: `group`;
- utilizare: afișarea cronologică a celor mai recente articole publicate;
- secțiunea trebuie diferențiată de selecția curatoriată `Ce este important acum`.

Câmpurile recomandate sunt:

#### `latestArticles.enabled`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `true`.

#### `latestArticles.eyebrow`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu: nu.

#### `latestArticles.title`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu când secțiunea este activă: da.

#### `latestArticles.description`

- tip recomandat: `textarea`;
- localizat: da;
- obligatoriu: nu.

#### `latestArticles.itemLimit`

- tip recomandat: `number`;
- valoare implicită recomandată: `6`;
- limite recomandate: între `3` și `9`.

#### `latestArticles.excludeFeaturedDuplicates`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `true`;
- utilizare: evitarea repetării articolelor deja afișate în secțiunile editoriale anterioare.

#### `latestArticles.categoryFilter`

- tip recomandat: relație multiplă opțională către `Categorii`;
- localizat: nu;
- utilizare: limitarea fluxului la anumite categorii, numai dacă este necesar;
- lipsa filtrului înseamnă includerea tuturor categoriilor publice eligibile.

#### `latestArticles.archiveLink`

- tip recomandat: `group` cu `label` și `url`;
- localizat: da;
- utilizare: legătură către arhiva completă de articole.

Interogarea trebuie să selecteze numai articole:

- publicate;
- disponibile în limba activă;
- cu dată publică validă;
- neexpirate și neretrase;
- ordonate descrescător după data publicării;
- distincte de selecțiile anterioare când eliminarea duplicatelor este activă.

### 8.13. Secțiunea Cum lucrăm

#### `howWeWork`

- tip recomandat: `group`;
- utilizare: explicarea succintă a standardelor editoriale și a modului de evaluare;
- detaliile complete trebuie să rămână într-o pagină dedicată metodologiei.

Câmpurile recomandate sunt:

#### `howWeWork.enabled`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `true`.

#### `howWeWork.eyebrow`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu: nu.

#### `howWeWork.title`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu când secțiunea este activă: da.

#### `howWeWork.description`

- tip recomandat: `textarea`;
- localizat: da;
- obligatoriu: da;
- trebuie să exprime verificarea surselor, transparența și corectarea informațiilor.

#### `howWeWork.principles`

- tip recomandat: `array` controlat;
- localizat parțial;
- număr recomandat: între `3` și `5` elemente.

Fiecare principiu poate include:

- `key` — identificator tehnic unic;
- `title` — titlu localizat;
- `description` — explicație localizată;
- `icon` — identificator vizual controlat.

Principiile inițiale recomandate sunt:

- verificarea surselor;
- separarea faptelor de interpretare;
- declararea limitelor și conflictelor de interese;
- actualizarea și corectarea transparentă;
- evaluarea responsabilă a instrumentelor AI.

#### `howWeWork.methodologyLink`

- tip recomandat: `group` cu `label` și `url`;
- localizat: da;
- obligatoriu: da când secțiunea este activă;
- ruta trebuie să conducă spre pagina publică dedicată metodologiei.

Textele comune întregului site trebuie preluate din `SiteSettings`; Globalul `Homepage` va păstra numai formularea și prezentarea specifice acestei secțiuni.

### 8.14. Secțiunea Newsletter

#### `newsletter`

- tip recomandat: `group`;
- utilizare: prezentarea formularului controlat de abonare la newsletter;
- Globalul nu va stoca adresele abonaților;
- înscrierile vor rămâne administrate prin colecția `Newsletter` și fluxul securizat de confirmare.

Câmpurile recomandate sunt:

#### `newsletter.enabled`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `true`.

#### `newsletter.eyebrow`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu: nu.

#### `newsletter.title`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu când secțiunea este activă: da.

#### `newsletter.description`

- tip recomandat: `textarea`;
- localizat: da;
- obligatoriu: da;
- trebuie să explice clar tipul și frecvența comunicărilor.

#### `newsletter.emailPlaceholder`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu: da;
- nu înlocuiește eticheta accesibilă a câmpului.

#### `newsletter.submitLabel`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu: da.

#### `newsletter.privacyText`

- tip recomandat: `textarea`;
- localizat: da;
- obligatoriu: da;
- trebuie să explice pe scurt prelucrarea datelor și confirmarea prin e-mail.

#### `newsletter.privacyLink`

- tip recomandat: `group` cu `label` și `url`;
- localizat: da;
- obligatoriu: da;
- URL-ul trebuie să conducă spre politica de confidențialitate aplicabilă.

#### `newsletter.successMessage`

- tip recomandat: `textarea`;
- localizat: da;
- obligatoriu: da;
- trebuie să precizeze că abonarea necesită confirmarea adresei de e-mail.

#### `newsletter.errorMessage`

- tip recomandat: `textarea`;
- localizat: da;
- obligatoriu: da;
- nu trebuie să expună detalii tehnice sau existența exactă a unei adrese în baza de date.

Textele comune de conformitate pot utiliza valori implicite din `SiteSettings`, evitând duplicarea necontrolată.

### 8.15. Metadatele SEO și distribuirea socială

#### `seo`

- tip recomandat: `group`;
- localizat: da;
- utilizare: configurarea metadatelor specifice homepage-ului pentru fiecare limbă.

Câmpurile recomandate sunt:

#### `seo.metaTitle`

- tip recomandat: `text`;
- localizat: da;
- obligatoriu pentru publicare: da;
- trebuie să includă identitatea platformei fără repetări artificiale de cuvinte-cheie.

#### `seo.metaDescription`

- tip recomandat: `textarea`;
- localizat: da;
- obligatoriu pentru publicare: da;
- trebuie să descrie clar promisiunea și domeniile principale ale platformei.

#### `seo.socialImage`

- tip recomandat: relație către `Media`;
- obligatoriu: nu;
- poate utiliza o imagine implicită din `SiteSettings`;
- imaginea trebuie să respecte regulile de licență, atribuire și transparență AI.

#### `seo.allowIndexing`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `true` pentru configurația publicată;
- trebuie dezactivat în preview și în mediile care nu sunt destinate indexării.

#### `seo.canonicalPath`

- tip recomandat: `text`;
- localizat: da;
- valori publice recomandate: `/ro` și `/en`;
- domeniul complet va fi construit folosind configurația sigură a mediului.

Frontendul trebuie să genereze legăturile lingvistice alternative și să evite canonicalizarea ambelor limbi către aceeași rută.

### 8.16. Audit intern și versiunea configurației

#### `configurationVersion`

- tip recomandat: `number` sau `text` controlat;
- localizat: nu;
- public: nu;
- utilizare: identificarea versiunii structurii configurate.

#### `changeSummary`

- tip recomandat: `textarea`;
- localizat: nu;
- public: nu;
- obligatoriu pentru modificările editoriale importante;
- utilizare: descrierea succintă a schimbării realizate.

#### `updatedBy`

- tip recomandat: relație către `Useri` sau câmp completat prin hook controlat;
- public: nu;
- utilizare: identificarea utilizatorului care a realizat ultima modificare.

#### `publishedAt`

- tip recomandat: `date` cu oră;
- public: nu în contractul minimal;
- utilizare: identificarea momentului activării configurației publice;
- nu trebuie confundat cu datele documentelor editoriale afișate pe homepage.

#### `schemaVersion`

- tip recomandat: `number` sau `text` controlat;
- public: nu;
- utilizare: sprijinirea migrărilor și validărilor când structura Globalului evoluează.

Câmpurile standard Payload `createdAt` și `updatedAt` vor rămâne active, dar nu înlocuiesc istoricul editorial sau sistemul de versiuni.

---

## 9. Reguli de selecție, fallback și deduplicare

Homepage-ul combină selecții editoriale manuale cu interogări dinamice. Regulile trebuie să fie deterministe, verificabile și aplicate server-side.

### 9.1. Modurile de selecție

Secțiunile care consumă documente editoriale pot utiliza:

- `manual` — sunt afișate numai documentele selectate explicit;
- `automatic` — documentele sunt selectate după reguli predefinite;
- `manualWithFallback` — selecția manuală are prioritate, iar locurile rămase sunt completate automat.

Modul de selecție nu trebuie să permită expunerea documentelor neeligibile.

### 9.2. Eligibilitatea documentelor

Un document poate fi afișat numai dacă:

- este publicat sau are un statut public echivalent aprobat;
- este disponibil în limba activă;
- nu este retras, arhivat sau expirat;
- are ruta publică validă;
- îndeplinește regulile specifice colecției;
- nu conține o restricție editorială care interzice promovarea;
- relațiile publice necesare pot fi rezolvate în siguranță.

### 9.3. Selecția manuală

Relațiile manuale trebuie păstrate în ordinea stabilită de administrator.

Înaintea randării, fiecare document selectat manual trebuie reverificat pentru:

- stare publică;
- limbă;
- disponibilitate;
- data expirării;
- existența rutei publice;
- eligibilitatea pentru secțiunea respectivă.

Un document devenit neeligibil trebuie exclus fără a produce eroarea întregii pagini.

### 9.4. Fallbackul automat

Fallbackul trebuie să completeze numai numărul de locuri rămase până la `itemLimit`.

Ordinea recomandată pentru selecția automată este:

1. documente marcate explicit ca recomandate pentru homepage;
2. documente ordonate editorial;
3. documente publicate recent;
4. fallback cronologic general, când nu există alte criterii.

Fallbackul nu trebuie să schimbe sau să rescrie selecția salvată în Payload.

### 9.5. Eliminarea duplicatelor

Același document nu trebuie afișat nejustificat în mai multe secțiuni ale aceleiași pagini.

Ordinea recomandată de prioritate pentru păstrarea unui articol este:

1. `Ce este important acum`;
2. `AI în sănătate`;
3. pilonul editorial relevant;
4. `Ultimele articole`.

După selectarea unei secțiuni, identificatorii documentelor afișate vor fi adăugați într-un set de excludere utilizat de secțiunile următoare.

Elementele `FlashAI`, instrumentele, cursurile și roadmaps vor utiliza seturi de excludere separate, deoarece aparțin unor tipuri de conținut diferite.

### 9.6. Număr insuficient de documente

Când numărul documentelor eligibile este mai mic decât limita configurată:

- secțiunea va afișa numai documentele disponibile;
- nu vor fi introduse duplicate pentru completarea artificială a limitei;
- nu vor fi afișate carduri goale;
- layoutul trebuie să se adapteze numărului real de elemente;
- secțiunea poate fi ascunsă dacă nu are niciun element și conținutul fără carduri nu este util.

### 9.7. Stabilitatea rezultatului

La aceeași configurație și același set de documente publice, selecția trebuie să producă același rezultat.

Interogările automate trebuie să utilizeze criterii explicite de departajare, precum:

- ordinea editorială;
- data publicării;
- data actualizării relevante;
- identificatorul documentului ca ultim criteriu stabil.

Selecția aleatorie nu este recomandată pentru homepage.

### 9.8. Eșecul unei relații sau interogări

Eșecul unei colecții nu trebuie să împiedice randarea întregului homepage.

Frontendul trebuie să:

- izoleze interogările secțiunilor;
- elimine documentele invalide;
- păstreze secțiunile funcționale;
- afișeze numai fallbackuri validate;
- înregistreze eroarea fără a expune detalii tehnice utilizatorului;
- evite reutilizarea unei configurații retrase sau nepublicate.

---

## 10. Reguli de validare și consistență

Validările critice trebuie aplicate server-side, nu numai prin afișarea condițională a câmpurilor în Admin Payload.

O configurație incompletă poate fi salvată ca `draft`, dar nu trebuie utilizată de frontend ca versiune publică.

### 10.1. Validări dependente de stare

Pentru starea `draft` este permisă salvarea unei configurații incomplete, cu condiția existenței câmpului `internalTitle`.

Pentru starea `review` trebuie să existe cel puțin:

- Hero-ul complet în limba verificată;
- titlurile secțiunilor active;
- limite numerice valide;
- reguli de selecție definite;
- metadatele SEO de bază;
- legăturile interne obligatorii.

Pentru starea `published` trebuie îndeplinite toate validările structurale, editoriale, lingvistice și de relaționare.

### 10.2. Validarea Hero-ului

Configurația publicată trebuie să conțină:

- `hero.title`;
- `hero.description`;
- eticheta acțiunii principale;
- ruta internă validă a acțiunii principale;
- text alternativ când imaginea transmite informație relevantă.

Hero-ul nu trebuie dezactivat în configurația publicată.

### 10.3. Validarea secțiunilor active

Pentru fiecare secțiune cu `enabled=true` trebuie validate:

- titlul în limba activă;
- descrierea, când este obligatorie;
- limita numerică, dacă secțiunea afișează documente;
- modul de selecție;
- relațiile manuale obligatorii;
- legătura către arhivă sau pagina asociată, când este prevăzută.

O secțiune dezactivată nu trebuie să impună completarea câmpurilor sale editoriale publice.

### 10.4. Validarea modurilor de selecție

- modul `manual` necesită cel puțin un document manual eligibil;
- modul `automatic` necesită criterii automate definite;
- modul `manualWithFallback` permite o selecție manuală parțială;
- `itemLimit` trebuie să respecte limitele secțiunii;
- numărul relațiilor manuale nu trebuie să depășească limita maximă fără avertisment;
- documentele duplicate în aceeași selecție trebuie respinse.

### 10.5. Validarea relațiilor

La publicare trebuie verificat că documentele selectate manual:

- există;
- sunt publicate;
- sunt disponibile în limba activă;
- aparțin colecției corecte;
- nu sunt retrase, arhivate sau expirate;
- au o rută publică validă;
- îndeplinesc criteriile specifice secțiunii.

O relație devenită neeligibilă după publicare trebuie exclusă la randare, fără blocarea întregului homepage.

### 10.6. Validarea localizării

- Hero-ul trebuie să fie complet pentru fiecare limbă publicată;
- titlurile secțiunilor active trebuie să existe în limba respectivă;
- etichetele și rutele trebuie să corespundă aceleiași limbi;
- textele românești nu trebuie afișate automat pe ruta engleză;
- selecțiile manuale trebuie verificate separat pentru fiecare limbă;
- avertismentele și textele de confidențialitate trebuie să fie disponibile în limba activă.

### 10.7. Validarea rutelor interne

- rutele trebuie să înceapă cu `/ro` sau `/en`, după limba câmpului;
- protocoalele externe nu trebuie acceptate în câmpurile destinate rutelor interne;
- valorile `javascript:`, `data:` și alte protocoale periculoase trebuie respinse;
- ruta nu trebuie să trimită către o pagină inexistentă sau nepublicată;
- eticheta legăturii trebuie să descrie clar destinația.

### 10.8. Validarea limitelor numerice

Limitele recomandate sunt:

- Flash AI: între `3` și `5`;
- AI în sănătate: între `1` și `4` articole;
- Ce este important acum: între `1` și `4`;
- Începe să înveți: între `2` și `6` elemente;
- Ultimele articole: între `3` și `9`;
- bara de încredere: între `2` și `4` elemente;
- Cum lucrăm: între `3` și `5` principii.

Valorile din afara intervalelor trebuie respinse la publicare.

### 10.9. Validarea structurilor fixe

- secțiunea `pathways` trebuie să conțină exact elementele `understand`, `learn` și `apply`;
- fiecare identificator poate apărea o singură dată;
- ordinea publică trebuie să rămână „Înțelege. Învață. Aplică.”;
- `editorialPillars` trebuie să conțină exact cei cinci piloni aprobați;
- fiecare pilon trebuie să aibă un identificator unic și o categorie validă;
- ariile secțiunii sănătate nu trebuie duplicate.

### 10.10. Validarea newsletterului și SEO

Când secțiunea Newsletter este activă, trebuie să existe:

- titlul și descrierea;
- eticheta accesibilă a câmpului e-mail;
- eticheta butonului;
- textul privind confidențialitatea;
- legătura către politica de confidențialitate;
- mesajele de succes și eroare.

Pentru configurația publicată sunt obligatorii:

- `seo.metaTitle`;
- `seo.metaDescription`;
- ruta canonical corespunzătoare limbii;
- configurarea corectă a indexării.

### 10.11. Mesaje de validare

Mesajele din Admin Payload trebuie să precizeze:

- secțiunea afectată;
- câmpul sau relația invalidă;
- limba afectată;
- motivul blocării publicării;
- acțiunea necesară pentru remediere.

Mesajele generice precum `Configurație invalidă` trebuie evitate pentru regulile editoriale complexe.

---

## 11. Integrarea în frontend și contractul public de date

Frontendul nu trebuie să consume direct obiectul complet al Globalului Payload.

Configurația publică va fi selectată, validată și normalizată server-side pentru limba activă.

### 11.1. Funcția de acces recomandată

Implementarea ulterioară poate utiliza o funcție conceptuală precum:

- `getHomepage(locale)` — obține configurația publicată și construiește toate secțiunile eligibile;
- `normalizeHomepage(global, locale)` — elimină câmpurile interne și normalizează textele;
- `resolveHomepageSections(config, locale)` — execută selecțiile manuale și fallbackurile;
- `validateHomepageRelations(config, locale)` — elimină relațiile devenite neeligibile;
- `getHomepageMetadata(locale)` — construiește metadatele SEO localizate.

Funcțiile trebuie să ruleze server-side și să nu permită componentelor client să interogheze liber Payload.

### 11.2. Contractul public minimal

Obiectul public poate conține:

- `locale` — limba activă;
- `hero` — textele, acțiunile și vizualul public;
- `trustBar` — mesajele de încredere eligibile;
- `flashAI` — configurația și elementele Flash AI normalizate;
- `pathways` — cele trei direcții editoriale;
- `healthAI` — ariile și articolele eligibile;
- `importantNow` — selecția editorială curatoriată;
- `editorialPillars` — cei cinci piloni;
- `startLearning` — cursurile și roadmaps eligibile;
- `featuredTool` — instrumentul evaluat și informațiile publice permise;
- `latestArticles` — articolele cronologice deduplicate;
- `howWeWork` — principiile și legătura spre metodologie;
- `newsletter` — textele publice ale formularului;
- `seo` — metadatele localizate.

Contractul public nu va include observații editoriale, relații către `Useri`, istoricul administrativ sau metadatele tehnice.

### 11.3. Randare server-side

Homepage-ul trebuie construit în principal pe server pentru:

- protejarea accesului la Payload;
- limitarea datelor transmise browserului;
- generarea metadatelor corecte;
- aplicarea regulilor de selecție și deduplicare;
- performanță și cache controlat;
- evitarea afișării temporare a unei configurații nevalidate.

Interactivitatea client-side trebuie limitată la funcțiile care o necesită, precum formularul Newsletter și controalele accesibile.

### 11.4. Izolarea secțiunilor

Fiecare secțiune trebuie implementată ca o componentă distinctă, cu date normalizate și responsabilitate clară.

Eșecul unei secțiuni nu trebuie să blocheze randarea celorlalte secțiuni.

Componentele nu trebuie să efectueze interogări Payload redundante sau independente atunci când datele pot fi pregătite centralizat.

### 11.5. Stări goale și erori

Frontendul trebuie să trateze explicit:

- lipsa configurației publicate;
- lipsa unei versiuni complete în limba activă;
- secțiuni active fără documente eligibile;
- relații către documente retrase sau șterse;
- indisponibilitatea temporară a Payload;
- erori ale formularului Newsletter;
- imagini sau fișiere media indisponibile.

Nu trebuie afișate carduri goale, identificatori tehnici, erori de aplicație sau texte dintr-o limbă greșită.

### 11.6. Navigare și legături

- legăturile interne trebuie să respecte limba activă;
- etichetele trebuie să descrie destinația;
- rutele indisponibile nu trebuie randate;
- legăturile externe trebuie diferențiate clar;
- deschiderea într-o filă nouă nu trebuie impusă fără motiv;
- sponsorizările și afilierile trebuie marcate transparent;
- un card nu trebuie să conțină mai multe destinații ambigue.

### 11.7. Accesibilitate

- fiecare secțiune trebuie să aibă un titlu semantic;
- ierarhia titlurilor trebuie să rămână coerentă;
- legăturile și butoanele trebuie să funcționeze cu tastatura;
- starea și prioritatea nu trebuie comunicate exclusiv prin culoare;
- imaginile informative trebuie să aibă text alternativ;
- imaginile decorative trebuie ignorate de tehnologiile asistive;
- formularul Newsletter trebuie să aibă etichete și mesaje de eroare accesibile;
- preferința `prefers-reduced-motion` trebuie respectată.

### 11.8. Performanță și cache

Interogările trebuie să solicite numai câmpurile necesare și să limiteze profunzimea relațiilor Payload.

Strategia de cache trebuie să permită invalidarea după:

- publicarea unei noi configurații Homepage;
- modificarea unei selecții manuale;
- publicarea sau retragerea unui document promovat;
- corectarea unui element Flash AI;
- modificarea unui curs, roadmap sau instrument prezent pe homepage;
- actualizarea metadatelor SEO.

Trebuie invalidate separat cel puțin rutele `/ro` și `/en`, în funcție de limba afectată.

---

## 12. Organizarea în Admin Payload

Interfața administrativă trebuie să permită configurarea clară a homepage-ului fără transformarea formularului într-o listă lungă și dificil de verificat.

Structura Admin trebuie să urmeze ordinea editorială a paginii publice și să diferențieze câmpurile publice de cele interne.

### 12.1. Configurația generală a Globalului

Configurația recomandată include:

- slug tehnic: `homepage`;
- etichetă administrativă: `Homepage`;
- grupare în secțiunea de configurări editoriale;
- câmpul `internalTitle` utilizat pentru identificare internă;
- localizare activă pentru română și engleză;
- timestampurile Payload active;
- acces inițial rezervat administratorului;
- versiuni și drafts evaluate separat în etapa de implementare.

### 12.2. Organizarea formularului

Formularul este recomandat să fie împărțit în următoarele taburi:

1. `Configurare generală`;
2. `Hero și încredere`;
3. `Flash AI`;
4. `Înțelege. Învață. Aplică.`;
5. `AI în sănătate`;
6. `Selecții editoriale`;
7. `Educație și instrumente`;
8. `Metodologie și newsletter`;
9. `SEO`;
10. `Administrare internă`.

Ordinea taburilor trebuie să reflecte fluxul real al homepage-ului.

### 12.3. Bara laterală

În bara laterală pot fi afișate câmpurile operaționale principale:

- `status`;
- `lastEditorialReviewAt`;
- `reviewedBy`;
- `configurationVersion`;
- `publishedAt`;
- `seo.allowIndexing`;
- rezumatul secțiunilor active;
- existența erorilor de validare.

Câmpurile editoriale ample nu trebuie mutate în bara laterală.

### 12.4. Afișarea condițională

Admin Payload trebuie să afișeze condițional:

- selecțiile manuale numai pentru modurile care le utilizează;
- câmpurile de fallback numai când fallbackul este permis;
- relațiile către documente numai când secțiunea este activă;
- textele imaginii numai când există o imagine;
- câmpurile SEO suplimentare numai când indexarea este activă;
- mesajele de validare ale fiecărei limbi separat;
- câmpurile de review când configurația este trimisă spre verificare.

Ascunderea unui câmp în interfață nu trebuie să înlocuiască validarea server-side.

### 12.5. Avertismente editoriale

Interfața trebuie să afișeze avertismente clare atunci când:

- Hero-ul este incomplet;
- o secțiune activă nu are titlu;
- o selecție manuală conține documente nepublicate;
- un document selectat nu există în limba activă;
- numărul elementelor depășește limita permisă;
- același articol este selectat în mai multe secțiuni prioritare;
- o rută internă nu corespunde limbii active;
- lipsesc textele Newsletter sau politica de confidențialitate;
- metadatele SEO sunt incomplete;
- ultima verificare editorială este veche sau absentă.

Avertismentele trebuie să precizeze problema și acțiunea necesară pentru remediere.

### 12.6. Previzualizarea configurației

Preview-ul va fi introdus numai printr-un mecanism sigur și autentificat.

Previzualizarea trebuie să:

- respecte limba selectată;
- folosească configurația draft fără a o publica;
- nu fie indexată;
- nu expună câmpuri interne;
- afișeze clar statutul de preview;
- nu poată fi accesată printr-un URL public permanent;
- utilizeze aceleași componente ca homepage-ul public.

### 12.7. Rezumatul secțiunilor

Admin Payload poate include un rezumat vizual care indică:

- secțiunile active;
- secțiunile dezactivate;
- modul de selecție al fiecărei secțiuni;
- numărul documentelor manuale selectate;
- limbile complete și incomplete;
- existența avertismentelor;
- ultima verificare editorială.

Rezumatul are rol informativ și nu înlocuiește validările tehnice.

### 12.8. Acțiuni administrative controlate

Acțiunile importante trebuie diferențiate clar:

- salvare ca draft;
- trimitere la review;
- publicare;
- revenire la draft;
- arhivare;
- deschidere preview;
- verificare a relațiilor;
- invalidare controlată a cache-ului.

Nu trebuie să existe o acțiune ambiguă care publică automat o configurație incompletă.

### 12.9. Ajutor contextual

Câmpurile complexe trebuie să includă descrieri administrative pentru:

- diferența dintre selecția manuală și fallback;
- regulile de deduplicare;
- limitele fiecărei secțiuni;
- condițiile de eligibilitate ale documentelor;
- diferența dintre `Homepage` și `SiteSettings`;
- configurarea separată a limbilor;
- rolul câmpului `enabled`;
- modul de utilizare a metadatelor SEO.

Descrierile trebuie să fie concise, consecvente și să evite terminologia tehnică inutilă.

### 12.10. Protecția împotriva configurării accidentale

Pentru reducerea erorilor editoriale sunt recomandate:

- confirmare înaintea publicării;
- validare completă a limbii active;
- avertisment pentru dezactivarea unei secțiuni esențiale;
- păstrarea versiunii publicate anterior până la aprobarea noii configurații;
- istoric al modificărilor;
- posibilitatea revenirii controlate la o versiune validă;
- testarea configurației în staging înainte de producție.

---

## 13. Securitate, confidențialitate și reziliență

Globalul `Homepage` va fi citit public, dar va conține și informații administrative care nu trebuie expuse frontendului.

Protecția trebuie aplicată în regulile Payload, funcțiile server-side, mecanismul de preview și contractul public de date.

### 13.1. Expunerea minimă a datelor

- frontendul nu trebuie să primească obiectul Payload complet;
- câmpurile interne de review și audit vor fi eliminate server-side;
- relațiile către `Useri` nu vor fi expuse;
- configurațiile draft sau arhivate nu vor fi returnate public;
- relațiile către documente nepublicate vor fi excluse;
- datele publice vor fi limitate la conținutul necesar randării.

Ascunderea unui câmp în componenta vizuală nu reprezintă o măsură suficientă de securitate.

### 13.2. Protecția operațiilor de modificare

- actualizarea Globalului este rezervată rolului `admin` în prima implementare;
- operațiile publice de modificare trebuie blocate;
- schimbarea stării editoriale trebuie verificată server-side;
- publicarea trebuie să treacă prin validarea integrală a configurației;
- actualizările prin API nu trebuie să poată ocoli regulile Admin Payload;
- introducerea altor roluri va necesita un audit RBAC separat.

### 13.3. Protecția preview-ului

Mecanismul de preview trebuie să utilizeze:

- autentificare obligatorie;
- autorizare pentru Globalul `Homepage`;
- tokenuri temporare sau sesiuni validate;
- marcarea paginii ca neindexabilă;
- blocarea cache-ului public pentru configurația draft;
- eliminarea câmpurilor interne din datele randate;
- expirarea accesului temporar.

O adresă de preview nu trebuie să permită acces permanent și anonim la o configurație nepublicată.

### 13.4. Validarea rutelor și legăturilor

- rutele interne trebuie validate înainte de salvare și randare;
- protocoalele periculoase trebuie respinse;
- URL-urile externe trebuie permise numai în câmpurile destinate acestora;
- redirecționările către domenii necunoscute nu trebuie generate automat;
- legăturile indisponibile trebuie omise fără a bloca întreaga pagină;
- etichetele și destinațiile trebuie să corespundă aceleiași limbi.

### 13.5. Conținut editorial sigur

- Globalul nu va permite HTML arbitrar;
- textele vor fi randate prin componente sigure;
- valorile introduse nu trebuie interpolate direct în cod executabil;
- câmpurile SEO și datele structurate trebuie escapate corespunzător;
- embedurile și iframe-urile nu sunt necesare în schema inițială;
- conținutul importat nu trebuie publicat automat.

### 13.6. Formularul Newsletter

Globalul va furniza numai textele publice ale formularului.

Endpointul de înscriere trebuie să rămână separat și să aplice:

- validarea adresei de e-mail;
- protecție împotriva abuzului și automatizării excesive;
- mesaje care nu confirmă existența unei adrese în baza de date;
- fluxul de confirmare dublă;
- blocarea posibilității de setare publică a stării de confirmare;
- jurnalizare fără expunerea datelor sensibile.

### 13.7. Confidențialitate

Configurația Homepage nu trebuie să stocheze:

- adresele abonaților;
- date personale ale vizitatorilor;
- tokenuri de confirmare;
- parole sau chei API;
- identificatori de sesiune;
- date medicale personale;
- informații administrative fără utilitate editorială.

Textele privind confidențialitatea trebuie să corespundă fluxului tehnic real al formularului.

### 13.8. Cache și retragerea conținutului

Cache-ul nu trebuie să mențină pe homepage documente retrase sau configurații înlocuite pentru o perioadă nejustificat de lungă.

Trebuie prevăzută invalidarea după:

- publicarea unei configurații noi;
- retragerea unui articol sau element Flash AI;
- modificarea statutului unui instrument;
- dezactivarea unei secțiuni;
- corectarea unei selecții editoriale;
- schimbarea metadatelor SEO.

### 13.9. Reziliența la erori

O eroare locală nu trebuie să provoace indisponibilitatea întregului homepage.

Implementarea trebuie să permită:

- izolarea interogărilor pe secțiuni;
- excluderea relațiilor invalide;
- randarea secțiunilor funcționale;
- ascunderea controlată a secțiunilor fără date;
- utilizarea ultimei configurații publicate valide, când mecanismul tehnic permite;
- înregistrarea erorilor fără expunerea detaliilor interne.

### 13.10. Secrete și configurarea mediilor

- secretele serviciilor externe rămân în variabile de mediu;
- domeniul canonical va fi construit din configurația sigură a mediului;
- mediul staging nu trebuie indexat;
- mesajele de eroare nu trebuie să expună șiruri de conexiune sau tokenuri;
- schimbările de schemă vor utiliza migrații Payload versionate;
- `PAYLOAD_DB_PUSH` trebuie să rămână dezactivat;
- producția va fi modificată numai după validarea completă în staging.

---

## 14. Strategia de testare și validare

Implementarea Globalului `Homepage` trebuie validată etapizat în staging înaintea oricărei promovări în producție.

Testarea trebuie să acopere schema Payload, migrarea bazei de date, accesul administrativ, localizarea, selecțiile editoriale, fallbackurile, deduplicarea și randarea frontend.

### 14.1. Testarea schemei Payload

Trebuie confirmat că:

- Globalul apare corect în Admin Payload;
- câmpurile sunt grupate conform arhitecturii aprobate;
- câmpurile localizate funcționează separat pentru română și engleză;
- valorile implicite sunt aplicate corect;
- câmpurile condiționale apar numai când sunt relevante;
- relațiile acceptă numai colecțiile și cardinalitatea aprobate;
- limitele numerice sunt validate;
- câmpurile interne nu sunt prezentate ca informații publice.

### 14.2. Testarea migrației bazei de date

Migrarea trebuie verificată mai întâi în staging.

Trebuie testate:

- generarea fișierului de migrare;
- înregistrarea migrației în indexul Payload;
- rularea cu `PAYLOAD_DB_PUSH=false`;
- crearea structurii necesare Globalului;
- păstrarea datelor colecțiilor existente;
- pornirea aplicației după migrare;
- accesul la `/admin`;
- statusul migrațiilor după deployment;
- comportamentul rollbackului, când revenirea este sigură.

### 14.3. Testarea regulilor de acces

Scenariile minime sunt:

- vizitatorul public poate primi numai configurația publicată;
- configurațiile `draft`, `review` și `archived` nu sunt expuse;
- câmpurile interne nu apar în contractul public;
- relațiile către `Useri` nu sunt expuse;
- actualizarea publică este blocată;
- administratorul poate modifica Globalul;
- un utilizator fără rol eligibil nu poate modifica sau publica configurația.

### 14.4. Testarea localizării

Trebuie verificate:

- configurație completă numai în română;
- configurație completă numai în engleză;
- configurație completă în ambele limbi;
- lipsa fallbackului public necontrolat între limbi;
- selecții manuale distincte pentru fiecare limbă;
- rute interne corespunzătoare limbii;
- metadate SEO distincte;
- atributul HTML `lang` corect pentru `/ro` și `/en`.

### 14.5. Testarea secțiunilor fixe

Trebuie confirmat că:

- Hero-ul nu poate lipsi din configurația publicată;
- `pathways` conține exact `understand`, `learn` și `apply`;
- ordinea publică este păstrată;
- cei cinci piloni editoriali sunt prezenți o singură dată;
- ariile `AI în sănătate` nu sunt duplicate;
- dezactivarea unei secțiuni nu șterge configurația acesteia;
- secțiunile dezactivate nu lasă spații goale în frontend.

### 14.6. Testarea selecțiilor manuale

Pentru fiecare secțiune relevantă trebuie testate:

- selectarea documentelor publicate;
- păstrarea ordinii manuale;
- respingerea duplicatelor în aceeași selecție;
- excluderea documentelor draft;
- excluderea documentelor retrase, arhivate sau expirate;
- excluderea documentelor indisponibile în limba activă;
- comportamentul când o relație selectată este ulterior ștearsă sau retrasă.

### 14.7. Testarea fallbackurilor automate

Trebuie create scenarii pentru modurile:

- `manual`;
- `automatic`;
- `manualWithFallback`.

Trebuie verificat că fallbackul:

- completează numai locurile rămase;
- respectă `itemLimit`;
- nu introduce duplicate;
- utilizează numai documente eligibile;
- păstrează o ordine deterministă;
- nu modifică selecția salvată în Payload;
- nu publică documente într-o limbă greșită.

### 14.8. Testarea deduplicării

Trebuie creat un set de articole care ar putea apărea simultan în:

- `Ce este important acum`;
- `AI în sănătate`;
- pilonii editoriali;
- `Ultimele articole`.

Rezultatul trebuie să respecte ordinea de prioritate aprobată și să nu repete nejustificat același articol.

Seturile de excludere pentru articole, Flash AI, instrumente, cursuri și roadmaps trebuie testate separat.

### 14.9. Testarea frontendului

Trebuie verificate:

- randarea tuturor secțiunilor active;
- ascunderea secțiunilor dezactivate;
- stările fără conținut;
- relațiile invalide;
- imaginile indisponibile;
- navigarea internă;
- comportamentul responsive;
- izolarea erorilor unei secțiuni;
- absența identificatorilor tehnici și a mesajelor interne în pagină.

### 14.10. Testarea Newsletterului și SEO

Pentru Newsletter trebuie testate:

- etichetele și mesajele localizate;
- validarea adresei;
- mesajul de confirmare dublă;
- mesajele de eroare fără divulgarea existenței adresei;
- legătura către politica de confidențialitate;
- imposibilitatea confirmării publice directe.

Pentru SEO trebuie testate:

- titlul și descrierea fiecărei limbi;
- canonical pentru `/ro` și `/en`;
- legăturile lingvistice alternative;
- imaginea socială implicită sau specifică;
- blocarea indexării în preview și staging.

### 14.11. Testarea accesibilității și performanței

Trebuie verificate:

- ierarhia semantică a titlurilor;
- navigarea completă cu tastatura;
- etichetele formularului;
- mesajele de eroare accesibile;
- contrastul și marcarea statutelor fără dependență exclusivă de culoare;
- textele alternative ale imaginilor;
- respectarea `prefers-reduced-motion`;
- numărul interogărilor Payload;
- profunzimea relațiilor;
- dimensiunea datelor transmise browserului;
- stabilitatea layoutului.

### 14.12. Testarea cache-ului și a retragerilor

Trebuie confirmată invalidarea cache-ului după:

- publicarea unei configurații noi;
- schimbarea selecțiilor manuale;
- dezactivarea unei secțiuni;
- publicarea sau retragerea unui articol;
- corectarea unui element Flash AI;
- schimbarea statutului unui instrument;
- modificarea metadatelor SEO.

Retragerea unui document promovat trebuie să îl elimine din homepage fără a necesita modificarea manuală imediată a Globalului.

### 14.13. Verificări tehnice obligatorii

Înaintea deschiderii unui PR tehnic trebuie rulate cel puțin:

- verificarea TypeScript;
- buildul de producție;
- `git diff --check`;
- testele automate introduse pentru Global;
- testele manuale documentate în staging;
- verificarea statusului migrațiilor Payload;
- verificarea rutelor `/ro`, `/en` și `/admin`.

Datoria lint existentă trebuie diferențiată de eventualele erori noi introduse de implementare.

### 14.14. Dovezi de validare

PR-urile tehnice trebuie să includă:

- comenzile rulate;
- rezultatele relevante;
- scenariile testate;
- capturi din Admin Payload, când sunt utile;
- răspunsuri publice fără date sensibile;
- problemele cunoscute;
- confirmarea că producția nu a fost modificată în timpul validării staging.

---

## 15. Plan de implementare și separarea PR-urilor

Implementarea Globalului `Homepage` trebuie împărțită în modificări mici, verificabile și testabile separat.

Schema Payload, contractul public de date și redesignul frontendului nu trebuie introduse simultan într-un singur PR.

### 15.1. Etapa 1 — Schema inițială a Globalului

Primul PR tehnic va introduce:

- fișierul de configurare al Globalului `Homepage`;
- înregistrarea Globalului în configurația Payload;
- câmpurile generale de identificare și stare;
- Hero-ul editorial;
- bara de încredere;
- activarea și titlurile secțiunilor;
- localizarea română și engleză;
- regulile inițiale de acces rezervate administratorului;
- validările structurale minime;
- migrarea controlată Payload/PostgreSQL;
- testele tehnice asociate.

Acest PR nu va modifica încă homepage-ul public.

### 15.2. Etapa 2 — Configurațiile secțiunilor editoriale

Un PR separat va introduce grupurile pentru:

- Flash AI;
- Înțelege. Învață. Aplică.;
- AI în sănătate;
- Ce este important acum;
- cei cinci piloni editoriali;
- Începe să înveți;
- Instrument AI evaluat;
- Ultimele articole;
- Cum lucrăm;
- Newsletter;
- SEO.

Validările condiționale și limitele numerice vor fi introduse împreună cu secțiunile cărora le aparțin.

### 15.3. Etapa 3 — Relațiile și regulile de eligibilitate

Relațiile vor fi introduse controlat către:

- `FlashAI`;
- `Articole`;
- `Categorii`;
- `Cursuri`;
- `Roadmaps`;
- `Tooluri`;
- `Media`;
- `Useri`, numai pentru audit intern.

În această etapă trebuie implementată verificarea stării publice, limbii, expirării și disponibilității documentelor asociate.

### 15.4. Etapa 4 — Contractul public de date

Un PR dedicat va introduce:

- tipurile TypeScript ale configurației publice;
- funcția server-side de citire a Globalului;
- normalizarea câmpurilor localizate;
- eliminarea datelor interne;
- validarea relațiilor;
- fallbackurile sigure;
- testele contractului public.

Frontendul public nu trebuie conectat direct la Global înaintea finalizării acestei etape.

### 15.5. Etapa 5 — Selecție și deduplicare

Un PR separat va implementa:

- modurile `manual`, `automatic` și `manualWithFallback`;
- limitele fiecărei secțiuni;
- ordonarea deterministă;
- seturile de excludere;
- deduplicarea articolelor;
- comportamentul pentru documentele devenite neeligibile;
- testele selecțiilor și fallbackurilor.

### 15.6. Etapa 6 — Componentele frontend

Redesignul homepage-ului va fi împărțit în componente distincte pentru fiecare secțiune.

PR-ul sau seria de PR-uri frontend va include:

- componente semantice și responsive;
- stări goale și de eroare;
- navigare internă localizată;
- accesibilitate cu tastatura;
- respectarea preferinței pentru mișcare redusă;
- eliminarea stilurilor inline nejustificate;
- integrarea progresivă pe rutele `/ro` și `/en`.

### 15.7. Etapa 7 — Newsletter, SEO și cache

Un PR dedicat va valida:

- integrarea formularului cu endpointul securizat existent;
- mesajele localizate;
- metadatele fiecărei limbi;
- canonical și legăturile lingvistice alternative;
- blocarea indexării în staging și preview;
- invalidarea cache-ului după modificările relevante.

### 15.8. Etapa 8 — Preview și versiuni

Mecanismul de preview și istoricul versiunilor vor fi introduse numai după stabilizarea schemei și componentelor frontend.

Etapa va include:

- acces autentificat la preview;
- randarea configurației draft;
- marcarea paginii ca neindexabilă;
- protejarea împotriva cache-ului public;
- posibilitatea revenirii la ultima versiune validă;
- testele de autorizare și expirare.

### 15.9. Ordinea mediilor și migrațiilor

Fiecare modificare tehnică va urma ordinea:

1. branch separat pornit din `staging` actualizat;
2. implementare limitată la obiectivul PR-ului;
3. verificări TypeScript, build și teste;
4. generarea și inspectarea migrației, când schema se modifică;
5. rularea migrației în baza de date staging;
6. integrarea PR-ului în `staging`;
7. deployment manual în Railway staging, când este necesar;
8. teste funcționale pe `/ro`, `/en` și `/admin`;
9. documentarea rezultatelor;
10. promovarea în producție numai printr-un proces separat și aprobat.

`PAYLOAD_DB_PUSH` trebuie să rămână dezactivat în toate etapele.

### 15.10. Elemente excluse din primul PR tehnic

Primul PR de implementare nu trebuie să includă simultan:

- redesignul complet al frontendului;
- restructurarea colecțiilor `Articole`, `Cursuri`, `Roadmaps` sau `Tooluri`;
- introducerea unor roluri editoriale noi;
- preview public;
- publicare automată asistată de AI;
- importuri externe automate;
- animații, carusele sau ticker-e;
- modificări directe în producție;
- schimbări de infrastructură fără legătură cu Globalul `Homepage`.

---

## 16. Dependențe, riscuri și decizii deschise

Implementarea completă a Globalului `Homepage` depinde de existența unor colecții, Globaluri și contracte publice stabile.

Aceste dependențe trebuie rezolvate etapizat, fără extinderea necontrolată a primului PR tehnic.

### 16.1. Dependențe funcționale

Homepage-ul depinde de:

- Globalul `SiteSettings` pentru navigație, identitate, footer și texte comune;
- colecția `FlashAI` pentru secțiunea de actualizări rapide;
- colecția `Articole` pentru selecțiile editoriale și fluxul cronologic;
- colecția `Categorii` pentru cei cinci piloni editoriali;
- colecția `Cursuri` pentru secțiunea educațională;
- colecția `Roadmaps` pentru parcursurile de învățare;
- colecția `Tooluri` pentru instrumentul AI evaluat;
- colecția `Media` pentru imaginile și metadatele vizuale;
- colecția `Useri` pentru audit intern;
- infrastructura de localizare română și engleză;
- fluxul controlat de migrații Payload/PostgreSQL.

Lipsa temporară a unei colecții opționale nu trebuie să blocheze definirea schemei generale, dar trebuie să limiteze activarea secțiunii dependente.

### 16.2. Dependențe editoriale

Înaintea publicării noului homepage trebuie definite operațional:

- responsabilitatea pentru selecțiile editoriale;
- frecvența revizuirii homepage-ului;
- criteriile pentru „Ce este important acum”;
- criteriile de promovare a unui instrument evaluat;
- regulile pentru eliminarea duplicatelor;
- criteriile de eligibilitate ale cursurilor și roadmaps;
- politica de sponsorizare și afiliere;
- textele și paginile publice de metodologie;
- comportamentul secțiunilor fără conținut suficient.

### 16.3. Riscul duplicării configurațiilor

Există riscul ca aceleași texte sau legături să fie administrate simultan în `Homepage`, `SiteSettings` și codul frontend.

Reducerea riscului necesită:

- responsabilități clare pentru fiecare Global;
- eliminarea textelor hardcodate după integrarea Payload;
- reutilizarea valorilor comune din `SiteSettings`;
- păstrarea în `Homepage` numai a configurației specifice paginii principale;
- documentarea fallbackurilor.

### 16.4. Riscul complexității excesive

Modelul țintă conține numeroase secțiuni și câmpuri, iar introducerea lor simultană ar crește riscul erorilor de schemă, migrare și administrare.

Reducerea riscului necesită:

- implementarea etapizată;
- PR-uri mici;
- validări introduse odată cu secțiunea relevantă;
- evitarea relațiilor care nu sunt încă utilizate;
- testarea fiecărei etape în staging;
- reevaluarea câmpurilor care nu aduc valoare editorială imediată.

Nu toate câmpurile descrise în starea țintă trebuie introduse obligatoriu în primul PR tehnic.

### 16.5. Riscul selecțiilor neeligibile

Document Riscul selecțiilor neeligibile

Documentele selectate manual pot deveni ulterior nepublicate, retrase, expirate sau indisponibile într-o limbă.

Frontendul trebuie să reverifice eligibilitatea la fiecare construire a homepage-ului și să excludă documentele invalide fără blocarea paginii.

Admin Payload trebuie să semnaleze relațiile devenite neeligibile.

### 16.6. Riscul duplicării editoriale

Același articol poate fi selectat în mai multe secțiuni, reducând diversitatea și claritatea homepage-ului.

Reducerea riscului necesită:

- ordine clară de prioritate între secțiuni;
- seturi de excludere server-side;
- avertismente în Admin Payload;
- teste automate pentru deduplicare;
- evitarea completării limitelor cu duplicate.

### 16.7. Riscul homepage-ului prea lung sau aglomerat

Activarea simultană a tuturor secțiunilor și utilizarea limitelor maxime poate produce o pagină dificil de parcurs.

Reducerea riscului necesită:

- limite moderate;
- ierarhie vizuală clară;
- descrieri concise;
- eliminarea repetărilor;
- testare pe dispozitive mobile;
- posibilitatea dezactivării controlate a secțiunilor neesențiale.

### 16.8. Riscul afișării informațiilor depășite

Selecțiile manuale pot rămâne active după ce relevanța lor editorială a scăzut.

Trebuie prevăzute:

- data ultimei verificări editoriale;
- avertismente pentru configurațiile nerevizuite;
- expirarea sau retragerea la nivelul colecțiilor sursă;
- fallbackuri dinamice sigure;
- revizuirea periodică a selecțiilor manuale;
- invalidarea cache-ului după retrageri.

### 16.9. Riscul expunerii configurațiilor nepublicate

Drafturile, datele de audit și relațiile interne nu trebuie expuse prin API, preview sau cache.

Reducerea riscului necesită:

- reguli Payload explicite;
- funcții server-side de normalizare;
- preview autentificat;
- contract public minimal;
- teste pentru câmpurile interne;
- separarea cache-ului public de preview.

### 16.10. Riscul pierderii ultimei configurații valide

Publicarea unei configurații incomplete sau o migrare greșită poate afecta pagina principală a ambelor limbi.

Trebuie evaluate:

- Payload Versions și Drafts;
- păstrarea ultimei versiuni publicate valide;
- posibilitatea revenirii controlate;
- validarea completă înainte de publicare;
- backupul bazei de date;
- testarea migrației și rollbackului în staging.

### 16.11. Decizii deschise pentru implementare

Înaintea PR-urilor tehnice relevante trebuie stabilite:

1. dacă Globalul va utiliza Payload Drafts și Versions;
2. dacă este necesar câmpul propriu `status` în acest caz;
3. ce secțiuni sunt obligatorii în prima versiune publică;
4. ce câmpuri din starea țintă intră în schema inițială;
5. dacă ordinea secțiunilor rămâne fixă sau devine configurabilă;
6. cum sunt reprezentate selecțiile manuale localizate în Payload;
7. ce criterii automate sunt utilizate pentru fiecare fallback;
8. durata și mecanismul cache-ului Next.js;
9. mecanismul de invalidare după modificarea documentelor asociate;
10. comportamentul exact când configurația publicată nu poate fi citită;
11. dacă ultima configurație validă poate fi utilizată temporar ca fallback;
12. momentul introducerii rolului editorial `editor`;
13. structura finală a paginii publice de metodologie;
14. dacă unele secțiuni vor fi implementate în PR-uri frontend separate.

Aceste decizii nu trebuie presupuse implicit în timpul implementării.

---

## 17. Criterii de acceptare

Arhitectura Globalului `Homepage` este considerată pregătită pentru etapa tehnică numai după îndeplinirea criteriilor de mai jos.

### 17.1. Separarea responsabilităților

- `Homepage` este definit ca Payload Global distinct;
- Globalul administrează numai configurația paginii principale;
- conținutul complet rămâne în colecțiile editoriale asociate;
- navigația, footerul și setările comune rămân în `SiteSettings`;
- autentificarea și permisiunile administrative rămân în `Useri`;
- aceeași informație nu este duplicată nejustificat în mai multe structuri.

### 17.2. Structura editorială

- sunt definite toate secțiunile aprobate ale homepage-ului;
- ordinea inițială este documentată;
- Hero-ul rămâne obligatoriu în configurația publicată;
- secțiunile pot fi activate sau dezactivate controlat;
- dezactivarea nu șterge configurația sau documentele asociate;
- Globalul nu permite blocuri arbitrare, HTML sau componente necunoscute.

### 17.3. Localizare

- textele publice suportă română și engleză;
- selecțiile editoriale pot diferi între limbi;
- documentele sunt verificate separat pentru limba activă;
- frontendul nu utilizează fallback public necontrolat între limbi;
- rutele și metadatele corespund limbii active;
- homepage-urile publice sunt definite la `/ro` și `/en`.

### 17.4. Selecții și fallbackuri

- modurile `manual`, `automatic` și `manualWithFallback` sunt definite clar;
- documentele manuale sunt reverificate înaintea randării;
- fallbackul completează numai locurile disponibile;
- selecția automată este deterministă;
- documentele draft, retrase, arhivate sau expirate sunt excluse;
- limitele numerice sunt definite pentru fiecare secțiune.

### 17.5. Deduplicare

- ordinea de prioritate dintre secțiunile cu articole este documentată;
- același articol nu este repetat nejustificat;
- seturile de excludere sunt separate pe tipuri de conținut;
- limitele nu sunt completate artificial prin duplicate;
- deduplicarea nu modifică relațiile salvate în Payload.

### 17.6. Acces și securitate

- actualizarea Globalului este rezervată inițial administratorului;
- configurațiile nepublicate nu sunt expuse public;
- câmpurile interne și relațiile către `Useri` nu apar în contractul public;
- frontendul nu consumă obiectul Payload complet;
- preview-ul este proiectat ca mecanism autentificat și neindexabil;
- rutele și conținutul editorial sunt validate înainte de randare.

### 17.7. Integrarea frontend

- există un contract public minimal și explicit;
- configurația este normalizată server-side;
- fiecare secțiune are o componentă cu responsabilitate clară;
- eșecul unei secțiuni nu blochează întreaga pagină;
- stările fără conținut și relațiile invalide sunt tratate sigur;
- Homepage-ul nu utilizează ticker, carusel automat sau animații continue.

### 17.8. Încredere și responsabilitate editorială

- sursa, autorul, data sau statutul sunt afișate când tipul de conținut le impune;
- conținutul sponsorizat și relațiile comerciale sunt marcate transparent;
- instrumentele AI sunt prezentate ca evaluate, nu ca recomandări comerciale automate;
- secțiunea sănătate păstrează limitele și protecțiile editoriale aprobate;
- metodologia și procesul de corectare sunt accesibile publicului.

### 17.9. Accesibilitate, SEO și performanță

- ierarhia semantică a titlurilor este coerentă;
- toate controalele funcționează cu tastatura;
- statutul nu este transmis exclusiv prin culoare;
- imaginile sunt tratate corect din punct de vedere al textului alternativ;
- metadatele și canonical sunt distincte pentru română și engleză;
- stagingul și preview-ul nu sunt indexabile;
- interogările solicită numai datele necesare;
- cache-ul poate fi invalidat după publicări, corecții și retrageri.

### 17.10. Implementare controlată

- schema, relațiile, contractul public și frontendul sunt împărțite în PR-uri separate;
- schimbările de schemă utilizează migrații Payload versionate;
- `PAYLOAD_DB_PUSH` rămâne dezactivat;
- migrațiile și funcționalitatea sunt testate mai întâi în staging;
- producția nu este modificată înaintea validării și aprobării separate;
- documentul permite implementarea fără presupuneri asupra deciziilor încă deschise.

---

## 18. Rezumatul deciziilor aprobate

### 18.1. Structura Payload

- `Homepage` va fi implementat ca Payload Global;
- slugul tehnic recomandat este `homepage`;
- Globalul va administra configurația paginii principale, nu conținutul editorial complet;
- textele și selecțiile vor suporta română și engleză;
- schimbările de schemă vor fi introduse prin migrații Payload/PostgreSQL controlate.

### 18.2. Structura editorială

Homepage-ul va păstra următoarea ordine conceptuală:

1. Header;
2. Hero editorial;
3. Bară de încredere;
4. Flash AI;
5. Înțelege. Învață. Aplică.;
6. AI în sănătate;
7. Ce este important acum;
8. Cei cinci piloni editoriali;
9. Începe să înveți;
10. Instrument AI evaluat;
11. Ultimele articole;
12. Cum lucrăm;
13. Newsletter;
14. Footer.

Headerul și footerul vor utiliza în principal configurația comună din `SiteSettings`.

### 18.3. Selecții editoriale

- selecțiile pot utiliza modurile `manual`, `automatic` și `manualWithFallback`;
- documentele sunt reverificate înaintea randării;
- fallbackurile trebuie să fie deterministe și limitate;
- documentele nepublicate, retrase, arhivate sau expirate sunt excluse;
- articolele vor fi deduplicate între secțiunile homepage-ului;
- selecțiile română și engleză pot fi diferite.

### 18.4. Acces și securitate

- administrarea inițială va fi rezervată rolului `admin`;
- configurațiile draft sau arhivate nu vor fi expuse public;
- frontendul nu va consuma obiectul Payload complet;
- relațiile către `Useri` și câmpurile interne nu vor fi publice;
- preview-ul va necesita autentificare și va fi neindexabil;
- producția va utiliza numai configurații validate și aprobate.

### 18.5. Frontend și experiența publică

- configurația va fi citită și normalizată server-side;
- fiecare secțiune va utiliza o componentă distinctă;
- eșecul unei secțiuni nu va bloca întreaga pagină;
- homepage-ul nu va utiliza carusele automate, ticker-e sau animații continue;
- rutele publice sunt `/ro` și `/en`;
- metadatele, canonical și atributul HTML `lang` vor respecta limba activă.

### 18.6. Ordinea implementării

Ordinea aprobată este:

1. schema inițială a Globalului;
2. configurațiile secțiunilor editoriale;
3. relațiile și regulile de eligibilitate;
4. contractul public de date;
5. selecția, fallbackurile și deduplicarea;
6. componentele frontend;
7. integrarea Newsletter, SEO și cache;
8. preview-ul și sistemul de versiuni.

### 18.7. Starea actuală

Documentul definește arhitectura țintă pentru Globalul `Homepage`.

În această etapă:

- nu a fost modificată configurația Payload;
- Globalul nu a fost creat în cod;
- nu a fost generată nicio migrație;
- baza de date staging nu a fost modificată;
- nu a fost realizat deployment în Railway;
- producția nu a fost atinsă.

Finalizarea acestui document încheie seria arhitecturală inițială `SiteSettings`, `Autori`, `FlashAI` și `Homepage` din cadrul `UX-001A`.
