# UX-001A-08 — Arhitectura colecției FlashAI

**Proiect:** 844-ai.ro
**Mediu de lucru:** branch `docs/ux-001a-08-flashai`
**Data definirii:** 5 august 2026
**Statut:** arhitectură în curs de documentare
**Tip structură Payload:** Collection
**Impact curent asupra bazei de date:** niciunul
**Impact asupra producției:** niciunul

---

## 1. Scop

Colecția `FlashAI` va administra informații scurte, recente și verificate despre evoluțiile relevante din inteligența artificială.

Rubrica va avea un flux editorial distinct de articolele complete și va permite publicarea rapidă a unor actualizări concise, fără a elimina cerințele de verificare și trasabilitate.

`FlashAI` va putea prezenta:

- lansări și actualizări importante;
- rezultate de cercetare relevante;
- modificări legislative sau instituționale;
- avertismente de securitate;
- schimbări privind instrumentele AI;
- evoluții din sănătate, educație și afaceri;
- corecții sau actualizări ale unor informații publicate anterior;
- evenimente cu impact imediat pentru utilizatori.

Elementele vor fi compacte, datate, atribuite unei surse și asociate unui statut editorial clar.

---

## 2. Obiective

Implementarea colecției `FlashAI` urmărește:

1. separarea informațiilor rapide de articolele editoriale ample;
2. publicarea controlată a actualizărilor importante;
3. afișarea clară a sursei și datei verificării;
4. evidențierea statutului informației;
5. permiterea actualizării și corectării transparente;
6. organizarea elementelor pe piloni și categorii;
7. asocierea opțională cu articole explicative;
8. alimentarea secțiunii Flash AI de pe homepage;
9. crearea arhivelor localizate `/ro/flash` și `/en/flash`;
10. evitarea animațiilor sau mecanismelor care distrag atenția;
11. păstrarea unei trasabilități editoriale complete;
12. protejarea suplimentară a informațiilor medicale și sensibile.

---

## 3. Elemente care nu aparțin în FlashAI

Colecția `FlashAI` nu va administra:

- articole editoriale complete;
- analize aprofundate;
- cursuri sau lecții;
- roadmaps educaționale;
- profiluri de autori;
- evaluări complete ale instrumentelor AI;
- comunicate comerciale neverificate;
- conținut publicitar mascat ca informație editorială;
- afirmații medicale fără surse și verificare;
- zvonuri fără statut clar;
- postări sociale copiate fără verificarea sursei originale;
- notificări tehnice interne;
- parole, chei API sau alte configurații sensibile;
- conținut generat automat și publicat fără verificare umană.

Informațiile care necesită context extins vor fi dezvoltate într-un articol și asociate opțional elementului Flash AI.

Un element `FlashAI` trebuie să rămână concis, factual, datat și verificabil.

---

## 4. Decizia de arhitectură

`FlashAI` va fi implementată ca Payload Collection separată de colecția `Articole`.

Colecția va administra elemente editoriale scurte, cu structură, ciclu de viață și reguli de verificare proprii.

Avantajele unei colecții distincte sunt:

- flux editorial adaptat informațiilor rapide;
- câmpuri dedicate statutului și verificării;
- arhivă publică proprie;
- selecție controlată pentru homepage;
- actualizări și corecții trasabile;
- interogări mai simple pentru cardurile compacte;
- evitarea amestecării cu articolele ample;
- reguli suplimentare pentru informații medicale și sensibile.

Slugul tehnic recomandat este `flash-ai`.

Denumirea afișată în Admin Payload este `Flash AI`.

Rutele publice recomandate sunt:

- `/ro/flash`;
- `/en/flash`.

Fiecare element va avea un slug propriu numai dacă implementarea ulterioară confirmă necesitatea unei pagini individuale.

În prima etapă, afișarea principală va fi realizată prin liste și carduri compacte.

---

## 5. Principii de proiectare

### 5.1. Rapid, dar verificat

Viteza publicării nu trebuie să înlocuiască verificarea sursei, a datei și a contextului.

Niciun element nu va fi publicat automat fără intervenție editorială umană.

### 5.2. Concizie

Un element Flash AI trebuie să transmită informația esențială fără a reproduce structura unui articol complet.

Contextul extins, analiza și explicațiile ample vor fi publicate într-un articol asociat.

### 5.3. Trasabilitate

Fiecare element trebuie să permită identificarea:

- sursei principale;
- datei publicării sursei;
- datei verificării;
- autorului sau verificatorului;
- statutului actual al informației;
- istoricului actualizărilor și corecțiilor.

### 5.4. Separarea faptului de interpretare

Textul trebuie să diferențieze clar între:

- informație confirmată;
- anunț oficial;
- rezultat preliminar;
- declarație a unei organizații;
- interpretare editorială;
- informație contestată sau retrasă.

### 5.5. Fără senzaționalism

Titlurile și textele nu trebuie să exagereze impactul, certitudinea sau noutatea informației.

Formulările precum `revoluționar`, `garantat`, `fără precedent` sau `schimbă totul` vor fi evitate dacă nu sunt susținute clar de surse.

### 5.6. Protecție suplimentară pentru sănătate

Elementele medicale trebuie să includă context privind:

- nivelul dovezilor;
- stadiul tehnologiei;
- existența validării clinice;
- limitele și riscurile;
- sursa oficială;
- necesitatea consultării unui profesionist medical.

### 5.7. Fallbackuri sigure

Lipsa unei imagini, a unui articol asociat sau a unui autor public nu trebuie să blocheze afișarea unui element valid.

Lipsa sursei, datei verificării sau statutului editorial trebuie să blocheze publicarea.

### 5.8. Afișare calmă și accesibilă

Elementele Flash AI vor fi afișate fără animații automate, carusele forțate sau efecte care distrag atenția.

Componentele trebuie să fie accesibile cu tastatura, responsive și compatibile cu preferința pentru mișcare redusă.

---

## 6. Localizare

Colecția `FlashAI` trebuie să suporte publicarea în limbile română și engleză.

Strategia recomandată este localizarea câmpurilor editoriale, păstrând comune datele factuale și tehnice.

### 6.1. Câmpuri localizate

Vor fi localizate:

- titlul;
- rezumatul scurt;
- textul principal;
- explicația contextului;
- formularea statutului public;
- etichetele de avertizare;
- explicația riscurilor și limitelor;
- textele medicale condiționale;
- titlul și descrierea SEO;
- textele istoricului public de actualizări.

### 6.2. Câmpuri nelocalizate

Nu vor fi localizate automat:

- identificatorul documentului;
- slugul, dacă va fi introdus;
- relațiile către surse;
- relațiile către categorii și autori;
- starea editorială tehnică;
- tipul elementului;
- nivelul de prioritate;
- datele publicării și verificării;
- valorile booleene;
- ordinea de afișare;
- nivelul dovezilor;
- stadiul tehnologiei;
- URL-urile surselor externe.

### 6.3. Publicarea pe limbă

Un element nu trebuie considerat automat public în ambele limbi.

Frontendul trebuie să afișeze numai varianta lingvistică disponibilă și aprobată editorial.

Lipsa traducerii în engleză nu trebuie să împiedice publicarea controlată în limba română.

### 6.4. Fallbackuri între limbi

Fallbackul către limba implicită poate fi utilizat numai în contexte administrative sau temporare.

În frontendul public nu se recomandă afișarea automată a textului românesc într-o pagină engleză fără o marcă explicită.

### 6.5. Consistența factuală

- traducerea nu trebuie să modifice gradul de certitudine;
- statutul informației trebuie să rămână echivalent între limbi;
- datele, valorile și denumirile instituțiilor trebuie păstrate corect;
- avertismentele medicale nu trebuie diminuate prin traducere;
- corecțiile importante trebuie reflectate în toate versiunile publicate;
- traducerile nu trebuie să introducă afirmații absente din sursa verificată.

### 6.6. Rutele publice

Arhivele localizate aprobate sunt:

- `/ro/flash`;
- `/en/flash`.

Dacă vor fi introduse ulterior pagini individuale, acestea vor utiliza ruta și limba activă.

### 6.7. Atributul HTML lang

Frontendul trebuie să seteze corect atributul HTML `lang` la `ro` sau `en` pentru arhivele și paginile Flash AI.

---

## 7. Reguli de acces

Regulile de acces trebuie să permită citirea publică numai a elementelor aprobate și să protejeze fluxul editorial, sursele interne și informațiile neconfirmate.

În prima implementare, administrarea colecției va fi rezervată administratorului platformei.

### 7.1. Citire publică

- vizitatorii pot citi numai elementele cu starea `published`;
- elementele `draft`, `pendingVerification`, `verified`, `withdrawn` sau `archived` nu vor fi expuse automat;
- elementele `corrected` pot rămâne publice numai dacă includ o notă publică de corecție și au fost aprobate explicit pentru republicare;
- citirea publică trebuie să respecte limba publicată;
- răspunsul public va conține numai câmpurile necesare cardurilor și arhivei;
- observațiile interne, istoricul tehnic și datele de verificare nu vor fi expuse;
- accesarea directă a unui element nepublicat trebuie să returneze `404` sau un rezultat echivalent.

### 7.2. Creare

- crearea este permisă numai rolului `admin` în prima implementare;
- crearea prin API public este blocată;
- conținutul importat sau generat automat trebuie salvat inițial ca `draft`;
- niciun element nu poate fi creat direct cu starea `published` printr-un flux public.

### 7.3. Actualizare

- actualizarea este permisă numai rolului `admin` în prima implementare;
- schimbarea stării editoriale trebuie protejată explicit;
- sursa principală și data verificării nu pot fi eliminate dintr-un element publicat;
- modificările importante trebuie înregistrate în istoricul actualizărilor;
- accesul rolului `editor` va fi reevaluat printr-un audit RBAC separat.

### 7.4. Ștergere

- ștergerea este permisă numai administratorului;
- pentru elementele publicate este preferată retragerea sau arhivarea;
- ștergerea definitivă trebuie rezervată duplicatelor, testelor și documentelor create accidental;
- ștergerea prin API public este blocată;
- elementele asociate cu articole nu trebuie șterse fără verificarea relațiilor.

### 7.5. Vizibilitatea în Admin Payload

- colecția este vizibilă utilizatorilor care au acces în Admin Payload;
- dreptul de vizualizare nu implică automat dreptul de publicare;
- în prima implementare, numai administratorul poate crea, modifica, publica, retrage sau arhiva elemente.

### 7.6. Separarea datelor publice de datele interne

Câmpurile interne pot include:

- persoana care a verificat informația;
- observații editoriale;
- surse auxiliare;
- motivele retragerii;
- evaluarea internă a riscului;
- istoricul tehnic al modificărilor.

Aceste câmpuri nu vor fi transmise frontendului public.

### 7.7. Principiul expunerii minime

Frontendul nu va consuma documentul Payload complet.

O funcție dedicată va selecta, valida și normaliza numai datele publice necesare pentru carduri, homepage și arhiva Flash AI.

---

## 8. Modelul de date propus

Structura colecției trebuie să susțină publicarea rapidă, verificarea editorială, localizarea și actualizarea transparentă a informațiilor.

Denumirile definitive ale câmpurilor vor fi validate în etapa separată de implementare a schemei Payload.

### 8.1. Identificare

#### `internalTitle`

- tip recomandat: `text`;
- obligatoriu: da;
- localizat: nu;
- utilizare: denumire clară în Admin Payload;
- nu trebuie expus automat în frontend.

#### `title`

- tip recomandat: `text`;
- obligatoriu pentru publicare: da;
- localizat: da;
- utilizare: titlul public al elementului;
- trebuie să fie factual, concis și lipsit de formulări senzaționaliste.

#### `slug`

- tip recomandat: `text`;
- localizat: nu;
- unic: da;
- necesar numai dacă se aprobă pagini individuale;
- poate fi generat controlat din titlul principal.

#### `externalId`

- tip recomandat: `text`;
- obligatoriu: nu;
- utilizare: identificarea informațiilor importate dintr-un flux extern;
- nu trebuie folosit ca substitut pentru verificarea editorială.

### 8.2. Conținut public

#### `summary`

- tip recomandat: `textarea`;
- obligatoriu pentru publicare: da;
- localizat: da;
- utilizare: rezumatul afișat în card;
- trebuie să poată fi înțeles fără deschiderea unui articol.

#### `context`

- tip recomandat: `textarea` sau editor simplificat;
- obligatoriu: condițional;
- localizat: da;
- utilizare: explicarea motivului pentru care informația este relevantă;
- nu trebuie să transforme elementul într-un articol complet.

#### `publicStatusNote`

- tip recomandat: `textarea`;
- obligatoriu: condițional;
- localizat: da;
- utilizare: explicarea publică a unui rezultat preliminar, a unei incertitudini, corecții sau retrageri.

#### `callToActionLabel`

- tip recomandat: `text`;
- obligatoriu: nu;
- localizat: da;
- utilizare: eticheta legăturii către articolul asociat sau sursa principală.

### 8.3. Tipul informației

#### `flashType`

- tip recomandat: `select`;
- obligatoriu: da;
- localizat: nu.

Valorile inițiale recomandate sunt:

- `officialAnnouncement` — anunț oficial;
- `productRelease` — lansare de produs sau funcționalitate;
- `researchResult` — rezultat de cercetare;
- `regulation` — legislație, reglementare sau politică publică;
- `securityAlert` — avertisment de securitate;
- `serviceChange` — modificare a unui serviciu;
- `funding` — finanțare, achiziție sau investiție relevantă;
- `event` — eveniment important;
- `correction` — corecție editorială;
- `withdrawal` — retragerea unei informații;
- `other` — alt tip justificat editorial.

### 8.4. Clasificare editorială

#### `categories`

- tip recomandat: relație multiplă către `Categorii`;
- obligatoriu pentru publicare: da;
- utilizare: asocierea cu pilonii editoriali ai platformei.

#### `primaryCategory`

- tip recomandat: relație către `Categorii`;
- obligatoriu pentru publicare: da;
- utilizare: stabilirea categoriei principale pentru afișare și filtrare.

#### `tags`

- tip recomandat: `array` de texte controlate sau relație către o taxonomie dedicată;
- obligatoriu: nu;
- utilizare: filtrare tematică suplimentară;
- valorile libere trebuie limitate pentru a evita duplicatele.

#### `geographicScope`

- tip recomandat: `select` sau `array`;
- obligatoriu: nu;
- valori posibile: România, Uniunea Europeană, internațional sau o regiune specifică;
- utilizare: clarificarea aplicabilității informației.

### 8.5. Surse și trasabilitate

#### `primarySource`

- tip recomandat: relație către `Surse`;
- obligatoriu pentru publicare: da;
- utilizare: identificarea sursei principale pe care se bazează elementul;
- sursa trebuie verificată înainte de publicare.

#### `supportingSources`

- tip recomandat: relație multiplă către `Surse`;
- obligatoriu: condițional;
- utilizare: confirmarea informației din surse suplimentare;
- devine important pentru afirmații contestabile, medicale sau cu impact ridicat.

#### `originalSourceUrl`

- tip recomandat: `text` validat ca URL;
- obligatoriu: condițional;
- utilizare: trimiterea către documentul, comunicatul sau pagina originală;
- nu trebuie înlocuit cu un articol secundar atunci când sursa primară este disponibilă.

#### `sourcePublishedAt`

- tip recomandat: `date` cu oră;
- obligatoriu pentru publicare: da;
- utilizare: indicarea momentului în care sursa principală a publicat informația;
- nu trebuie confundat cu data publicării pe 844-ai.ro.

#### `sourceLanguage`

- tip recomandat: `select`;
- obligatoriu: nu;
- utilizare: identificarea limbii sursei originale;
- valori inițiale recomandate: `ro`, `en` și `other`.

#### `sourceSnapshotReference`

- tip recomandat: `text` sau relație către o resursă internă autorizată;
- obligatoriu: nu;
- utilizare: păstrarea unei referințe interne când sursa externă se poate modifica sau dispărea;
- nu trebuie să permită publicarea neautorizată a materialelor protejate.

### 8.6. Verificare editorială

#### `verifiedAt`

- tip recomandat: `date` cu oră;
- obligatoriu pentru publicare: da;
- utilizare: momentul ultimei verificări editoriale;
- trebuie actualizat când informația este reverificată în mod substanțial.

#### `verifiedBy`

- tip recomandat: relație către `Autori` sau către o identitate editorială internă;
- obligatoriu pentru publicare: da;
- utilizare: identificarea persoanei care a verificat informația;
- relația publică și relația internă trebuie separate dacă există cerințe de confidențialitate.

#### `verificationMethod`

- tip recomandat: `select` sau `array` controlat;
- obligatoriu pentru publicare: da;
- localizat: nu.

Valorile inițiale recomandate sunt:

- `primarySource` — verificare în sursa primară;
- `multipleSources` — confirmare din mai multe surse;
- `officialDatabase` — verificare într-o bază de date oficială;
- `expertReview` — verificare de către un expert relevant;
- `directConfirmation` — confirmare directă din partea organizației;
- `editorialAssessment` — evaluare editorială documentată.

#### `verificationNotes`

- tip recomandat: `textarea`;
- obligatoriu: condițional;
- public: nu;
- utilizare: documentarea pașilor, limitelor și neclarităților verificării.

#### `requiresReverification`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `false`;
- utilizare: marcarea informațiilor care trebuie reverificate ulterior.

#### `reverificationDueAt`

- tip recomandat: `date` cu oră;
- obligatoriu când `requiresReverification` este activ;
- utilizare: stabilirea termenului intern pentru o nouă verificare.

### 8.7. Certitudine și statut factual

#### `informationStatus`

- tip recomandat: `select`;
- obligatoriu pentru publicare: da;
- localizat: nu.

Valorile inițiale recomandate sunt:

- `confirmed` — informație confirmată;
- `officialStatement` — afirmație sau anunț oficial;
- `preliminary` — rezultat preliminar;
- `underInvestigation` — informație aflată în verificare;
- `disputed` — informație contestată;
- `corrected` — informație corectată;
- `withdrawn` — informație retrasă.

#### `confidenceLevel`

- tip recomandat: `select`;
- obligatoriu pentru publicare: da;
- valori recomandate: `high`, `medium`, `limited`;
- trebuie să reflecte calitatea și consistența dovezilor, nu importanța subiectului.

#### `uncertaintyNote`

- tip recomandat: `textarea`;
- obligatoriu pentru stările `preliminary`, `underInvestigation` sau `disputed`;
- localizat: da;
- utilizare: explicarea publică a incertitudinii și a limitelor informației.

#### `claimScope`

- tip recomandat: `select`;
- obligatoriu: nu;
- valori recomandate: `specific`, `limited`, `general`;
- utilizare: prevenirea extrapolării nejustificate a unei afirmații limitate.

### 8.8. Prioritate și impact editorial

#### `priority`

- tip recomandat: `select`;
- obligatoriu pentru publicare: da;
- localizat: nu.

Valorile inițiale recomandate sunt:

- `standard` — informație relevantă, fără caracter urgent;
- `important` — informație cu impact semnificativ;
- `urgent` — informație care necesită vizibilitate rapidă;
- `critical` — avertisment excepțional, utilizat numai cu justificare documentată.

Nivelul de prioritate nu trebuie stabilit pentru a produce artificial senzația de urgență.

#### `impactAreas`

- tip recomandat: `select` multiplu;
- obligatoriu: nu;
- localizat: nu;
- utilizare: indicarea domeniilor afectate.

Valorile inițiale pot include:

- `patients` — pacienți;
- `clinicians` — personal medical;
- `students` — elevi și studenți;
- `teachers` — profesori;
- `businesses` — organizații și companii;
- `developers` — dezvoltatori;
- `researchers` — cercetători;
- `publicInstitutions` — instituții publice;
- `generalPublic` — public general.

#### `impactSummary`

- tip recomandat: `textarea`;
- obligatoriu: condițional;
- localizat: da;
- utilizare: explicarea concretă a persoanelor afectate și a consecințelor relevante;
- nu trebuie să conțină predicții speculative prezentate ca fapte.

#### `actionRequired`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `false`;
- utilizare: indicarea faptului că cititorii trebuie să verifice sau să întreprindă o acțiune concretă.

#### `recommendedAction`

- tip recomandat: `textarea`;
- obligatoriu când `actionRequired` este activ;
- localizat: da;
- trebuie să fie proporțional, verificabil și lipsit de recomandări medicale individualizate.

### 8.9. Protecții pentru sănătate și subiecte sensibile

#### `isHealthRelated`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `false`;
- utilizare: activarea regulilor editoriale suplimentare pentru sănătate.

#### `evidenceLevel`

- tip recomandat: `select`;
- obligatoriu când `isHealthRelated` este activ;
- localizat: nu.

Valorile inițiale recomandate sunt:

- `expertOpinion` — opinie sau consens de expert;
- `preclinical` — cercetare preclinică;
- `observationalStudy` — studiu observațional;
- `clinicalStudy` — studiu clinic;
- `systematicReview` — revizuire sistematică sau metaanaliză;
- `regulatoryDecision` — decizie a unei autorități competente;
- `officialGuideline` — ghid oficial;
- `insufficientEvidence` — dovezi insuficiente sau neconcludente.

#### `technologyStage`

- tip recomandat: `select`;
- obligatoriu pentru informațiile despre tehnologii medicale;
- valori recomandate: `concept`, `laboratory`, `clinicalTrial`, `limitedDeployment`, `approved`, `routineUse`, `withdrawn`.

#### `clinicalValidationStatus`

- tip recomandat: `select`;
- obligatoriu: condițional;
- valori recomandate: `notEvaluated`, `underEvaluation`, `partiallyValidated`, `validatedForSpecificUse`, `notValidated`;
- validarea pentru o utilizare nu trebuie generalizată automat la alte utilizări.

#### `healthRisksAndLimitations`

- tip recomandat: `textarea`;
- obligatoriu când `isHealthRelated` este activ;
- localizat: da;
- utilizare: prezentarea limitelor, riscurilor și populației pentru care informația este relevantă.

#### `medicalReviewRequired`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `true` pentru informații clinice sau diagnostice;
- publicarea trebuie blocată până la finalizarea verificării necesare.

#### `medicalReviewer`

- tip recomandat: relație către `Autori`;
- obligatoriu când `medicalReviewRequired` este activ;
- persoana asociată trebuie să aibă rol și competențe relevante documentate.

#### `healthDisclaimer`

- tip recomandat: `textarea`;
- localizat: da;
- poate utiliza o valoare implicită controlată prin `SiteSettings`;
- nu înlocuiește verificarea editorială și nu trebuie folosit pentru a legitima afirmații neconfirmate.

### 8.10. Relații cu alte colecții

#### `relatedArticle`

- tip recomandat: relație către `Articole`;
- obligatoriu: nu;
- utilizare: trimiterea către o analiză sau explicație amplă;
- articolul asociat trebuie să fie publicat în limba activă înainte de afișarea legăturii.

#### `authors`

- tip recomandat: relație multiplă către `Autori`;
- obligatoriu: condițional;
- utilizare: atribuirea autorului, curatorului sau verificatorului public;
- relațiile definitive vor fi introduse într-un PR separat de schema inițială `Autori`.

#### `relatedTools`

- tip recomandat: relație multiplă către `Tooluri`;
- obligatoriu: nu;
- utilizare: asocierea unei lansări, actualizări sau alerte cu instrumentele evaluate pe platformă;
- asocierea nu reprezintă automat recomandare sau sponsorizare.

#### `relatedCourses`

- tip recomandat: relație multiplă către `Cursuri`;
- obligatoriu: nu;
- utilizare: orientarea utilizatorului către material educațional relevant.

#### `relatedRoadmaps`

- tip recomandat: relație multiplă către `Roadmaps`;
- obligatoriu: nu;
- utilizare: integrarea informației într-un parcurs de învățare.

#### `relatedFlashItems`

- tip recomandat: relație multiplă către aceeași colecție `FlashAI`;
- obligatoriu: nu;
- utilizare: legarea actualizărilor, corecțiilor și evoluțiilor succesive ale aceluiași subiect;
- relațiile circulare nejustificate trebuie evitate.

### 8.11. Publicare și ciclu de viață

#### `status`

- tip recomandat: `select`;
- obligatoriu: da;
- localizat: nu;
- utilizare: controlarea ciclului editorial al elementului.

Valorile inițiale recomandate sunt:

- `draft` — element aflat în redactare;
- `pendingVerification` — element trimis pentru verificare;
- `verified` — element verificat, dar încă nepublicat;
- `published` — element public;
- `corrected` — element publicat și corectat ulterior;
- `withdrawn` — element retras din cauza unei probleme editoriale sau factuale;
- `archived` — element păstrat intern sau în arhivă, fără promovare activă.

Starea editorială tehnică nu trebuie confundată cu `informationStatus`, care descrie certitudinea informației.

#### `publishedAt`

- tip recomandat: `date` cu oră;
- obligatoriu pentru starea `published`;
- utilizare: momentul publicării inițiale pe 844-ai.ro;
- nu trebuie suprascris automat la fiecare actualizare.

#### `lastReviewedAt`

- tip recomandat: `date` cu oră;
- obligatoriu pentru publicare: da;
- utilizare: momentul ultimei revizuiri editoriale semnificative.

#### `expiresAt`

- tip recomandat: `date` cu oră;
- obligatoriu: nu;
- utilizare: încetarea promovării automate a informațiilor strict temporare;
- expirarea nu trebuie să șteargă automat documentul.

#### `withdrawnAt`

- tip recomandat: `date` cu oră;
- obligatoriu când starea devine `withdrawn`;
- utilizare: documentarea momentului retragerii.

#### `withdrawalReason`

- tip recomandat: `textarea`;
- obligatoriu când starea devine `withdrawn`;
- localizat: da pentru explicația publică;
- observațiile interne detaliate trebuie păstrate separat.

### 8.12. Afișare pe homepage și în arhivă

#### `featuredOnHomepage`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `false`;
- utilizare: eligibilitatea pentru secțiunea Flash AI de pe homepage;
- activarea nu trebuie să ocolească starea `published` sau regulile de verificare.

#### `homepageOrder`

- tip recomandat: `number`;
- obligatoriu: nu;
- utilizare: ordonarea manuală a elementelor promovate;
- ordinea cronologică rămâne fallbackul recomandat.

#### `featuredFrom`

- tip recomandat: `date` cu oră;
- obligatoriu: nu;
- utilizare: momentul de la care elementul poate apărea pe homepage.

#### `featuredUntil`

- tip recomandat: `date` cu oră;
- obligatoriu: nu;
- utilizare: momentul până la care elementul poate fi promovat;
- nu modifică starea editorială și nu elimină elementul din arhivă.

#### `displayVariant`

- tip recomandat: `select`;
- obligatoriu: nu;
- valori recomandate: `standard`, `important`, `alert`;
- varianta vizuală trebuie derivată controlat și nu trebuie folosită pentru senzaționalism.

#### `showSourcePublicly`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `true`;
- dezactivarea trebuie permisă numai cu justificare editorială;
- informația despre existența unei surse verificate rămâne obligatorie intern.

### 8.13. Media și reprezentare vizuală

#### `featuredImage`

- tip recomandat: relație către `Media`;
- obligatoriu: nu;
- utilizare: imagine opțională pentru arhivă sau distribuire;
- lipsa imaginii nu trebuie să blocheze publicarea.

#### `imageAlt`

- tip recomandat: `text`;
- obligatoriu când imaginea transmite informație relevantă;
- localizat: da;
- imaginile decorative trebuie tratate corespunzător în frontend.

#### `imageCaption`

- tip recomandat: `textarea`;
- obligatoriu: nu;
- localizat: da;
- utilizare: explicarea imaginii și a contextului acesteia.

#### `visualSource`

- tip recomandat: relație către `Surse` sau câmp textual controlat;
- obligatoriu când imaginea provine dintr-o sursă externă;
- utilizare: atribuirea corectă a materialului vizual.

#### `isAIGeneratedVisual`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `false`;
- utilizare: marcarea transparentă a imaginilor generate sau modificate substanțial cu AI.

Pentru cardurile compacte de pe homepage este preferată afișarea fără imagine, astfel încât sursa, statutul și data să rămână elementele vizuale dominante.

### 8.14. Istoric de actualizări și corecții

#### `updateHistory`

- tip recomandat: `array`;
- obligatoriu: nu la creare, dar obligatoriu după o modificare factuală importantă;
- utilizare: documentarea transparentă a actualizărilor, corecțiilor și clarificărilor.

Fiecare înregistrare poate conține:

- `updatedAt` — data și ora modificării;
- `updateType` — actualizare, clarificare, corecție sau retragere;
- `publicNote` — explicație publică localizată;
- `internalNote` — explicație editorială internă;
- `updatedBy` — identitatea persoanei care a realizat modificarea;
- `sourceReference` — sursa care a determinat actualizarea.

#### `lastSubstantiveUpdateAt`

- tip recomandat: `date` cu oră;
- obligatoriu: condițional;
- utilizare: indicarea ultimei modificări care a schimbat sensul, certitudinea sau contextul informației;
- modificările strict tipografice nu trebuie tratate automat ca actualizări substanțiale.

#### `hasPublicCorrection`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `false`;
- utilizare: activarea unei marcări vizibile pentru elementele corectate.

#### `supersededBy`

- tip recomandat: relație către aceeași colecție `FlashAI`;
- obligatoriu: nu;
- utilizare: indicarea elementului mai nou care înlocuiește sau actualizează informația inițială;
- documentul inițial nu trebuie șters numai pentru că există o actualizare.

### 8.15. SEO și distribuire

#### `metaTitle`

- tip recomandat: `text`;
- obligatoriu numai dacă se implementează pagini individuale;
- localizat: da;
- trebuie să descrie factual informația și să evite titlurile înșelătoare.

#### `metaDescription`

- tip recomandat: `textarea`;
- obligatoriu numai dacă se implementează pagini individuale;
- localizat: da;
- utilizare: descrierea pentru motoarele de căutare și distribuirea socială.

#### `canonicalUrl`

- tip recomandat: `text` validat ca URL;
- obligatoriu: nu;
- utilizare: prevenirea duplicării adreselor pentru același element.

#### `allowIndexing`

- tip recomandat: `checkbox`;
- valoare implicită recomandată: `false` până la aprobarea paginilor individuale;
- elementele retrase sau nepublicate nu trebuie indexate.

#### `socialImage`

- tip recomandat: relație către `Media`;
- obligatoriu: nu;
- utilizare: imagine dedicată distribuirii;
- trebuie să respecte aceleași reguli de licență, atribuire și transparență AI.

Arhiva `/ro/flash` și `/en/flash` trebuie să utilizeze metadate proprii, controlate separat de elementele individuale.

### 8.16. Câmpuri interne și audit tehnic

#### `editorialOwner`

- tip recomandat: relație către `Useri`;
- obligatoriu intern: recomandat;
- public: nu;
- utilizare: atribuirea responsabilității operaționale asupra documentului;
- relația nu conferă automat permisiuni suplimentare.

#### `internalRiskLevel`

- tip recomandat: `select`;
- public: nu;
- valori recomandate: `low`, `medium`, `high`, `critical`;
- utilizare: stabilirea nivelului intern de verificare necesar;
- nu trebuie confundat cu prioritatea publică.

#### `internalNotes`

- tip recomandat: `textarea`;
- public: nu;
- utilizare: observații editoriale, neclarități și pași rămași;
- nu trebuie să conțină parole, chei sau date sensibile inutile.

#### `importMetadata`

- tip recomandat: `group`;
- public: nu;
- utilizare: documentarea originii tehnice a unui element importat;
- poate include numele fluxului, identificatorul extern și data importului;
- importul nu reprezintă aprobare editorială.

#### `createdBy` și `updatedBy`

- tip recomandat: relații sau câmpuri populate prin hook-uri controlate;
- public: nu;
- utilizare: trasabilitatea persoanelor care au creat sau modificat documentul.

#### `schemaVersion`

- tip recomandat: `number` sau `text` controlat;
- public: nu;
- utilizare: identificarea versiunii structurii folosite la validare sau import;
- devine util când schema evoluează și sunt necesare migrări controlate.

Câmpurile standard Payload `createdAt` și `updatedAt` vor rămâne active, dar nu înlocuiesc datele editoriale precum `publishedAt`, `verifiedAt` sau `lastReviewedAt`.

---

## 9. Flux editorial

Fluxul editorial trebuie să împiedice publicarea accidentală a informațiilor neverificate și să păstreze istoricul corecțiilor sau retragerilor.

### 9.1. Fluxul standard

Tranziția normală recomandată este:

`draft` → `pendingVerification` → `verified` → `published`

Semnificația etapelor este:

1. `draft` — informația este redactată și documentată;
2. `pendingVerification` — sursele și afirmațiile sunt verificate;
3. `verified` — verificarea este finalizată, dar publicarea nu a fost încă aprobată;
4. `published` — elementul este disponibil public.

### 9.2. Corectarea unui element publicat

Pentru o modificare factuală importantă, fluxul recomandat este:

`published` → revizuire → `corrected`

Trecerea la `corrected` trebuie să impună:

- o explicație publică în `updateHistory`;
- activarea câmpului `hasPublicCorrection`;
- actualizarea datei `lastSubstantiveUpdateAt`;
- reverificarea sursei;
- aprobarea explicită pentru păstrarea în frontendul public.

Un element corectat nu trebuie să își piardă automat data publicării inițiale.

### 9.3. Retragerea

Un element poate trece din `published` sau `corrected` în `withdrawn` atunci când:

- sursa inițială retrage informația;
- afirmația principală se dovedește falsă;
- verificarea editorială a fost insuficientă;
- informația poate produce un risc semnificativ;
- publicarea încalcă o obligație legală sau editorială.

Retragerea trebuie să înregistreze obligatoriu `withdrawnAt` și `withdrawalReason`.

Elementele retrase nu vor mai apărea în listele obișnuite sau pe homepage.

Păstrarea unei pagini publice explicative va fi decisă separat, în funcție de interesul transparenței și de implicațiile juridice.

### 9.4. Arhivarea

Starea `archived` este utilizată pentru elementele care:

- nu mai sunt actuale;
- nu mai trebuie promovate;
- sunt păstrate pentru evidență editorială;
- au fost înlocuite de o actualizare mai nouă.

Arhivarea nu trebuie să șteargă istoricul, sursele sau relațiile documentului.

### 9.5. Tranziții interzise sau controlate

Trebuie prevenite următoarele tranziții directe:

- `draft` → `published` fără verificare;
- `pendingVerification` → `published` fără aprobarea etapei `verified`;
- `withdrawn` → `published` fără o nouă verificare completă;
- `archived` → `published` fără actualizarea surselor și datelor;
- publicarea unui element medical fără verificarea medicală obligatorie.

### 9.6. Condiții minime pentru publicare

Publicarea trebuie blocată dacă lipsesc:

- titlul și rezumatul în limba publicată;
- categoria principală;
- sursa principală;
- data publicării sursei;
- data verificării;
- persoana care a verificat informația;
- metoda verificării;
- statutul factual și nivelul de certitudine;
- câmpurile medicale obligatorii, când este cazul;
- aprobarea editorială finală.

### 9.7. Automatizări permise

Hook-urile Payload pot ajuta la:

- completarea controlată a datelor de audit;
- setarea datei inițiale de publicare;
- validarea tranzițiilor de stare;
- eliminarea automată de pe homepage după `featuredUntil`;
- marcarea documentelor care necesită reverificare;
- prevenirea publicării când lipsesc câmpuri obligatorii.

Automatizările nu trebuie să decidă singure dacă o informație este adevărată și nu trebuie să publice autonom conținutul importat sau generat cu AI.

---

## 10. Reguli de validare și consistență

Validarea trebuie realizată atât la nivelul câmpurilor, cât și la nivelul documentului complet.

Interfața Admin poate explica erorile, dar regulile critice trebuie aplicate și pe server, astfel încât să nu poată fi ocolite prin API.

### 10.1. Validări dependente de stare

Pentru `draft` este permisă salvarea unui document incomplet, cu condiția existenței câmpului `internalTitle`.

Pentru `pendingVerification` trebuie să existe cel puțin:

- titlul;
- rezumatul;
- categoria principală;
- sursa principală;
- data publicării sursei;
- statutul factual propus.

Pentru `verified`, documentul trebuie să includă suplimentar:

- data verificării;
- persoana care a realizat verificarea;
- metoda verificării;
- nivelul de certitudine;
- observațiile privind incertitudinea, când sunt necesare.

Pentru `published` sau `corrected` trebuie îndeplinite toate condițiile editoriale și de localizare aplicabile.

### 10.2. Consistența datelor calendaristice

- `sourcePublishedAt` nu trebuie să fie ulterior momentului verificării;
- `verifiedAt` nu trebuie să fie ulterior momentului publicării fără o explicație de reverificare;
- `publishedAt` se setează la prima publicare și nu se rescrie automat;
- `lastReviewedAt` nu poate fi anterior datei inițiale de publicare după o revizuire publică;
- `featuredUntil` trebuie să fie ulterior lui `featuredFrom`;
- `expiresAt` nu trebuie să determine ștergerea documentului;
- `withdrawnAt` este obligatoriu numai pentru starea `withdrawn`;
- `reverificationDueAt` este obligatoriu când `requiresReverification` este activ.

### 10.3. Validarea surselor

- sursa principală trebuie să existe și să poată fi identificată;
- URL-urile trebuie validate și normalizate;
- protocolul permis pentru legături publice va fi `https`, cu excepții documentate;
- sursa primară trebuie preferată surselor secundare atunci când este disponibilă;
- un domeniu cunoscut nu reprezintă singur dovada autenticității conținutului;
- o postare socială trebuie corelată cu identitatea oficială și, când este posibil, cu documentul original;
- sursele inaccesibile sau eliminate trebuie marcate pentru reverificare;
- câmpul `showSourcePublicly` nu poate elimina obligația păstrării sursei intern.

### 10.4. Validări pentru sănătate

Când `isHealthRelated` este activ, trebuie validate:

- `evidenceLevel`;
- `healthRisksAndLimitations`;
- `technologyStage`, când este descrisă o tehnologie;
- `clinicalValidationStatus`, când sunt formulate afirmații clinice;
- necesitatea verificării medicale;
- existența unui verificator medical atunci când aceasta este obligatorie;
- formularea avertismentului medical aplicabil.

Un element medical nu poate fi publicat dacă `medicalReviewRequired` este activ și `medicalReviewer` lipsește.

Statutul `approved` al unei tehnologii trebuie susținut de o autoritate competentă și de o utilizare clar definită.

### 10.5. Validări pentru homepage

Un element poate fi selectat pentru homepage numai dacă:

- starea este `published` sau `corrected` aprobat pentru republicare;
- `featuredOnHomepage` este activ;
- limba solicitată este publicată;
- perioada `featuredFrom`–`featuredUntil` permite afișarea;
- elementul nu este expirat, retras sau arhivat;
- sursa și data verificării sunt disponibile;
- nu există o actualizare mai nouă care îl înlocuiește.

Homepage-ul va afișa între trei și cinci elemente, în funcție de configurația aprobată ulterior în Globalul `Homepage`.

### 10.6. Validări pentru corecții și retrageri

Pentru starea `corrected` trebuie să existe:

- cel puțin o înregistrare în `updateHistory`;
- o explicație publică;
- data ultimei actualizări substanțiale;
- persoana care a realizat sau aprobat corecția;
- reverificarea sursei relevante.

Pentru starea `withdrawn` trebuie să existe:

- `withdrawnAt`;
- `withdrawalReason`;
- eliminarea din selecția homepage;
- dezactivarea indexării individuale;
- păstrarea istoricului editorial intern.

### 10.7. Integritatea relațiilor

- `primaryCategory` trebuie să fie inclusă și în `categories` dacă sunt utilizate ambele câmpuri;
- relațiile publice către articole, cursuri, roadmaps sau instrumente trebuie afișate numai dacă documentele asociate sunt publice;
- un autor sau verificator inactiv nu trebuie selectat automat pentru documente noi;
- relația `supersededBy` nu poate indica același document;
- relațiile circulare între elementele Flash AI trebuie detectate sau limitate;
- ștergerea unei relații nu trebuie să lase câmpuri publice înșelătoare.

### 10.8. Validarea localizării

- titlul și rezumatul sunt obligatorii pentru fiecare limbă publicată;
- traducerea trebuie să păstreze statutul factual și nivelul de certitudine;
- o corecție publică trebuie reflectată în toate limbile active;
- avertismentele medicale obligatorii trebuie să existe în fiecare limbă publicată;
- lipsa unei traduceri nu trebuie completată automat cu text din altă limbă în frontendul public;
- limba sursei originale trebuie diferențiată de limba conținutului editorial.

### 10.9. Mesaje de validare

Mesajele afișate în Admin Payload trebuie să precizeze:

- câmpul sau regula încălcată;
- motivul pentru care publicarea este blocată;
- acțiunea necesară pentru remediere;
- limba sau starea editorială afectată.

Mesajele generice precum `Date invalide` trebuie evitate pentru regulile editoriale complexe.

---

## 11. Integrarea în frontend și contractul public de date

Frontendul nu trebuie să consume direct documentele complete ale colecției Payload.

Datele publice vor fi selectate, validate și normalizate prin funcții server-side dedicate.

### 11.1. Funcțiile de acces recomandate

Implementarea ulterioară poate utiliza funcții conceptuale precum:

- `getHomepageFlashItems(locale, limit)` — elementele aprobate pentru homepage;
- `getFlashArchive(locale, options)` — arhiva localizată, paginată și filtrată;
- `getFlashItemBySlug(locale, slug)` — numai dacă sunt aprobate pagini individuale;
- `getRelatedFlashItems(id, locale)` — actualizări sau informații asociate;
- `normalizeFlashItem(document, locale)` — transformarea documentului Payload într-un obiect public sigur.

Toate funcțiile trebuie să ruleze server-side și să aplice explicit regulile de stare, limbă și perioadă de afișare.

### 11.2. Contractul public minimal

Un obiect public pentru card poate conține numai:

- `id` — identificator public stabil;
- `title` — titlul localizat;
- `summary` — rezumatul localizat;
- `flashType` — tipul informației;
- `informationStatus` — statutul factual public;
- `confidenceLevel` — nivelul de certitudine, când este relevant;
- `priority` — prioritatea editorială aprobată;
- `primaryCategory` — categoria principală normalizată;
- `sourceName` — numele public al sursei;
- `sourceUrl` — legătura publică validată, dacă este permisă;
- `sourcePublishedAt` — data informației originale;
- `publishedAt` — data publicării pe platformă;
- `verifiedAt` sau `lastReviewedAt` — data ultimei verificări relevante;
- `publicStatusNote` — explicația publică a statutului;
- `hasPublicCorrection` — marcarea unei corecții;
- `relatedArticle` — legătura către articolul public asociat;
- `recommendedAction` — numai când există o acțiune publică justificată;
- `isHealthRelated` — pentru activarea prezentării medicale prudente.

Câmpurile interne, observațiile editoriale, relațiile cu `Useri` și metadatele de import nu vor fi incluse.

### 11.3. Secțiunea Flash AI de pe homepage

Homepage-ul va afișa între trei și cinci elemente compacte.

Selecția trebuie să respecte:

- starea publică aprobată;
- limba activă;
- câmpul `featuredOnHomepage`;
- intervalul de promovare;
- ordinea manuală, urmată de ordinea cronologică;
- eliminarea elementelor retrase, arhivate, expirate sau înlocuite;
- limita configurată ulterior în Globalul `Homepage`.

Secțiunea nu va utiliza carusel automat, ticker, derulare forțată sau animații continue.

Trebuie să existe o legătură clară către arhiva completă Flash AI.

### 11.4. Structura cardului compact

Cardul recomandat va afișa, în această ordine:

1. categoria sau tipul informației;
2. titlul;
3. rezumatul scurt;
4. statutul factual sau marcajul de corecție, când este necesar;
5. sursa principală;
6. data publicării sau actualizării;
7. legătura către articolul asociat ori sursa principală.

Sursa, statutul și data nu trebuie ascunse în tooltip-uri sau afișate numai la interacțiune.

### 11.5. Arhiva Flash AI

Rutele aprobate sunt:

- `/ro/flash`;
- `/en/flash`.

Arhiva trebuie să permită:

- paginare server-side;
- ordonare cronologică descrescătoare;
- filtrare după categorie;
- filtrare după tipul informației;
- filtrare după statutul factual, dacă este util publicului;
- evidențierea elementelor corectate;
- păstrarea filtrelor în parametrii URL;
- afișarea numărului de rezultate, când este disponibil.

Filtrele nu trebuie să expună stări editoriale interne precum `draft` sau `pendingVerification`.

### 11.6. Pagini individuale

Paginile individuale nu sunt obligatorii în prima implementare.

Acestea vor fi introduse numai dacă sunt necesare pentru:

- prezentarea istoricului complet al actualizărilor;
- legături permanente către corecții;
- context medical sau factual suplimentar;
- distribuire și indexare controlată;
- relaționarea mai multor evoluții ale aceluiași subiect.

Până la aprobarea lor, câmpurile `slug`, `metaTitle`, `metaDescription` și `allowIndexing` pot rămâne neutilizate public.

### 11.7. Stări goale și erori

Frontendul trebuie să trateze explicit:

- lipsa elementelor publicate în limba activă;
- lipsa temporară a elementelor promovate pe homepage;
- o sursă externă indisponibilă;
- o relație către un articol care nu mai este public;
- erori temporare de acces la Payload;
- parametri de filtrare invalizi.

Lipsa datelor nu trebuie să producă erori vizibile de aplicație sau carduri incomplete.

Homepage-ul poate ascunde secțiunea când nu există elemente eligibile, iar arhiva trebuie să afișeze un mesaj localizat și clar.

### 11.8. Accesibilitate

- titlurile trebuie să respecte ierarhia semantică a paginii;
- întregul card nu trebuie transformat într-o zonă interactivă ambiguă;
- legăturile trebuie să aibă denumiri descriptive;
- statutul nu trebuie comunicat exclusiv prin culoare;
- contrastul trebuie să respecte cerințele adoptate pentru platformă;
- navigarea și filtrele trebuie să funcționeze cu tastatura;
- datele trebuie afișate într-un format localizat și inteligibil;
- actualizările dinamice ale filtrelor trebuie anunțate corect tehnologiilor asistive;
- preferința `prefers-reduced-motion` trebuie respectată.

### 11.9. Performanță și cache

Interogările trebuie să solicite numai câmpurile necesare și să limiteze profunzimea relațiilor Payload.

Strategia de cache trebuie să evite afișarea îndelungată a unei informații retrase sau corectate.

La publicare, corectare, retragere sau arhivare trebuie invalidată cel puțin memoria cache pentru:

- homepage-ul limbii afectate;
- arhiva Flash AI a limbii afectate;
- pagina individuală, dacă există;
- articolele sau secțiunile care încorporează elementul.

Durata cache-ului trebuie stabilită separat în etapa de implementare, în funcție de mecanismul Next.js utilizat.

### 11.10. Legături externe

- URL-urile trebuie validate înainte de afișare;
- legăturile externe trebuie diferențiate vizual sau textual de cele interne;
- deschiderea într-o filă nouă nu trebuie impusă fără motiv;
- când se utilizează `target="_blank"`, trebuie aplicat `rel="noopener noreferrer"`;
- atributul `sponsored` nu trebuie adăugat automat tuturor legăturilor către instrumente sau companii;
- relațiile comerciale trebuie marcate separat și transparent;
- o legătură indisponibilă nu trebuie să elimine automat informația despre sursa verificată.

---

## 12. Organizarea în Admin Payload

Interfața de administrare trebuie să permită redactarea rapidă, dar să facă vizibile permanent obligațiile de verificare, statutul factual și riscurile informației.

Câmpurile nu trebuie afișate într-o singură listă lungă și greu de urmărit.

### 12.1. Configurația generală a colecției

Configurația recomandată include:

- slug tehnic: `flash-ai`;
- etichetă singulară: `Element Flash AI`;
- etichetă plurală: `Flash AI`;
- câmp utilizat ca titlu în Admin: `internalTitle`;
- ordonare implicită: `-publishedAt`, cu fallback la `-createdAt`;
- căutare după `internalTitle`, `title`, sursă și identificator extern;
- timestampurile Payload active;
- versiuni și drafts Payload evaluate separat în etapa de implementare.

### 12.2. Coloanele listei administrative

Coloanele implicite recomandate sunt:

- `internalTitle`;
- `status`;
- `informationStatus`;
- `primaryCategory`;
- `primarySource`;
- `verifiedAt`;
- `publishedAt`;
- `featuredOnHomepage`;
- `updatedAt`.

Lista trebuie să permită identificarea rapidă a documentelor neverificate, corectate, retrase sau programate pentru reverificare.

### 12.3. Gruparea câmpurilor

Formularul de editare este recomandat să fie organizat în următoarele taburi sau grupuri:

1. `Conținut`;
2. `Clasificare`;
3. `Surse și verificare`;
4. `Certitudine și impact`;
5. `Sănătate și riscuri`;
6. `Relații`;
7. `Publicare și homepage`;
8. `Actualizări și corecții`;
9. `SEO și media`;
10. `Administrare internă`.

Ordinea trebuie să urmeze procesul editorial real, de la redactare la verificare și publicare.

### 12.4. Bara laterală

În bara laterală pot fi grupate câmpurile operaționale care trebuie să rămână vizibile în timpul redactării:

- `status`;
- `primaryCategory`;
- `priority`;
- `informationStatus`;
- `confidenceLevel`;
- `isHealthRelated`;
- `featuredOnHomepage`;
- `publishedAt`;
- `lastReviewedAt`;
- `requiresReverification`;
- `reverificationDueAt`.

Câmpurile critice nu trebuie ascunse în taburi greu de observat.

### 12.5. Afișare condițională

Interfața trebuie să afișeze condițional:

- câmpurile medicale când `isHealthRelated` este activ;
- `medicalReviewer` când `medicalReviewRequired` este activ;
- `recommendedAction` când `actionRequired` este activ;
- `reverificationDueAt` când `requiresReverification` este activ;
- motivele și data retragerii pentru starea `withdrawn`;
- istoricul public obligatoriu pentru starea `corrected`;
- intervalul de promovare când `featuredOnHomepage` este activ;
- câmpurile SEO individuale numai dacă paginile individuale sunt activate.

Ascunderea vizuală a unui câmp nu trebuie să înlocuiască validarea pe server.

### 12.6. Avertismente editoriale

Admin Payload trebuie să afișeze avertismente clare atunci când:

- lipsește o sursă primară;
- sursa nu a fost reverificată recent;
- informația este preliminară sau contestată;
- un element medical nu are verificatorul necesar;
- se încearcă promovarea pe homepage a unui document nepublicat;
- o corecție nu conține explicație publică;
- un document este înlocuit de un element mai nou;
- traducerile publicate nu sunt consistente;
- termenul de reverificare a fost depășit.

Avertismentele trebuie să explice riscul și acțiunea necesară, nu doar să afișeze o culoare sau o pictogramă.

### 12.7. Acțiuni editoriale controlate

Acțiunile cu impact ridicat trebuie diferențiate clar:

- trimitere la verificare;
- confirmarea verificării;
- publicare;
- republicare după corecție;
- retragere;
- arhivare;
- eliminare de pe homepage;
- solicitare de reverificare.

În prima implementare, aceste acțiuni vor fi realizate numai de administrator.

Nu se recomandă o acțiune generică prin care un document să poată trece direct din `draft` în `published`.

### 12.8. Filtre administrative

Lista colecției trebuie să permită filtrarea după:

- starea editorială;
- statutul factual;
- categoria principală;
- tipul informației;
- prioritate;
- conținut medical;
- selecția pentru homepage;
- necesitatea reverificării;
- documente corectate;
- documente retrase;
- limba disponibilă;
- intervalul publicării.

Filtrele trebuie să ajute auditul editorial și să nu schimbe automat starea documentelor.

### 12.9. Previzualizare

Previzualizarea publică va fi introdusă numai după definirea componentelor frontend și a mecanismului sigur de preview.

Preview-ul trebuie să:

- fie accesibil numai utilizatorilor autorizați;
- nu indexeze documentele nepublicate;
- respecte limba selectată;
- afișeze statutul de preview;
- nu expună câmpuri interne;
- nu poată fi confundat cu pagina publicată.

Până la implementarea acestui mecanism, Admin Payload nu trebuie să genereze legături publice către documente nepublicate.

### 12.10. Ajutor contextual

Câmpurile complexe trebuie să conțină descrieri administrative concise pentru:

- diferența dintre `status` și `informationStatus`;
- modul de alegere a `confidenceLevel`;
- criteriile pentru `priority`;
- interpretarea nivelului dovezilor;
- utilizarea corectă a stării `corrected`;
- condițiile retragerii;
- diferența dintre data sursei, verificare și publicare;
- regulile de promovare pe homepage.

Descrierile trebuie centralizate și redactate consecvent, evitând formulările ambigue sau excesiv tehnice.

---

## 13. Securitate, confidențialitate și protecție împotriva abuzului

Colecția `FlashAI` va conține informații publice, dar procesul editorial poate include observații interne, identități administrative, metadate de import și surse auxiliare care nu trebuie expuse.

Protecția trebuie aplicată la nivelul regulilor Payload, interogărilor server-side, răspunsurilor API și componentelor frontend.

### 13.1. Expunerea minimă a datelor

- API-ul public nu trebuie să returneze documentul Payload complet;
- câmpurile interne trebuie excluse explicit din obiectele publice;
- relațiile către `Useri` nu trebuie expuse frontendului;
- observațiile de verificare și evaluările interne de risc rămân private;
- metadatele tehnice de import nu trebuie afișate public;
- răspunsurile publice trebuie să includă numai informațiile necesare funcției solicitate.

Protecția nu trebuie bazată exclusiv pe faptul că frontendul nu afișează un câmp.

### 13.2. Protecția operațiilor de scriere

- operațiile publice de creare, actualizare și ștergere sunt interzise;
- drepturile de scriere trebuie verificate server-side;
- starea editorială nu poate fi modificată printr-un câmp public neprotejat;
- hook-urile nu trebuie să considere sigur un utilizator numai pentru că solicitarea provine din Admin Payload;
- actualizările în masă trebuie rezervate unor operații administrative controlate;
- importurile automate trebuie salvate ca `draft` și supuse verificării umane.

### 13.3. Protecția împotriva injectării și conținutului periculos

- textul public trebuie randat prin componente sigure;
- HTML-ul arbitrar nu trebuie acceptat în câmpurile editoriale obișnuite;
- URL-urile trebuie validate înainte de salvare și afișare;
- protocoalele periculoase precum `javascript:` și `data:` trebuie respinse pentru legături;
- conținutul importat nu trebuie executat sau inserat direct în pagină;
- datele structurate și metadatele SEO trebuie escapate corespunzător;
- embedurile și iframe-urile nu sunt necesare pentru schema inițială.

### 13.4. Surse externe și SSRF

Validarea unei surse externe nu trebuie să permită serverului să acceseze necontrolat orice adresă furnizată de utilizator.

Dacă implementarea ulterioară va prelua automat metadate sau conținut de la URL-uri externe, trebuie aplicate:

- o listă de protocoale permise;
- blocarea adreselor locale, private și a serviciilor interne;
- limite de timp și dimensiune;
- limitarea redirecționărilor;
- verificarea tipului de conținut;
- jurnalizarea erorilor fără expunerea secretelor;
- procesarea în afara fluxului public de randare.

În prima implementare este preferată introducerea editorială manuală a metadatelor sursei.

### 13.5. Date cu caracter personal

Elementele Flash AI nu trebuie să colecteze sau să publice date personale fără necesitate editorială și justificare legală.

Trebuie evitate:

- adrese private;
- numere de telefon personale;
- identificatori medicali;
- date despre pacienți;
- date de autentificare;
- informații personale preluate accidental din surse sau capturi de ecran;
- atribuirea unor afirmații unei persoane fără o sursă verificabilă.

Atunci când numele unei persoane este relevant public, contextul și sursa atribuirii trebuie documentate.

### 13.6. Informații medicale sensibile

- nu se publică date identificabile despre pacienți;
- cazurile clinice trebuie anonimizate înainte de introducere;
- informația nu trebuie formulată ca diagnostic individual;
- recomandările nu trebuie să înlocuiască evaluarea unui profesionist medical;
- riscurile și limitele trebuie prezentate proporțional cu afirmația;
- tehnologiile experimentale trebuie diferențiate clar de cele aprobate;
- aprobarea într-o jurisdicție nu trebuie prezentată automat ca aprobare universală.

### 13.7. Audit și jurnalizare

Operațiile editoriale importante trebuie să permită identificarea:

- utilizatorului care a creat documentul;
- utilizatorului care l-a modificat;
- persoanei care a verificat informația;
- momentului publicării;
- modificărilor factuale importante;
- corecțiilor, retragerilor și arhivărilor;
- importurilor și sursei lor tehnice.

Jurnalele nu trebuie să includă parole, secrete, tokenuri sau conținut personal inutil.

### 13.8. Limitarea abuzului editorial

Arhitectura trebuie să reducă riscul ca `FlashAI` să fie folosit pentru:

- publicitate mascată;
- promovarea artificială a unei companii;
- manipularea priorității pentru obținerea vizibilității;
- publicarea unor zvonuri ca informații confirmate;
- reutilizarea fără context a unor comunicate de presă;
- exagerarea rezultatelor de cercetare;
- promovarea unor produse medicale neverificate;
- generarea automată de volum editorial fără control uman.

Conflictele de interese, sponsorizările și relațiile comerciale relevante trebuie declarate separat și afișate transparent atunci când influențează informația.

### 13.9. Rate limiting și disponibilitate

Rutele publice de citire trebuie proiectate pentru consum normal și cache, fără a permite interogări nelimitate sau excesiv de costisitoare.

Implementarea ulterioară trebuie să evalueze:

- limitarea parametrilor de paginare;
- validarea filtrelor;
- limitarea profunzimii relațiilor;
- protejarea rutelor de preview;
- rate limiting pentru endpointurile dedicate;
- răspunsuri stabile când Payload sau o sursă externă este temporar indisponibilă.

O problemă de disponibilitate nu trebuie să determine frontendul să afișeze documente nepublicate sau date cache-uite după retragerea lor.

### 13.10. Secrete și configurare

- colecția nu va stoca chei API sau parole;
- secretele serviciilor externe rămân în variabile de mediu;
- valorile sensibile nu trebuie incluse în documentația publică sau în răspunsurile API;
- mesajele de eroare nu trebuie să expună șiruri de conexiune, tokenuri sau detalii interne;
- schimbările de configurare trebuie testate în staging înainte de producție;
- implementarea schemei va urma fluxul controlat de migrații Payload/PostgreSQL.

---

## 14. Strategia de testare și validare

Implementarea colecției `FlashAI` trebuie verificată etapizat în staging înaintea oricărei promovări în producție.

Testarea trebuie să acopere schema Payload, migrarea bazei de date, regulile de acces, fluxul editorial, contractul public de date și integrarea frontend.

### 14.1. Testarea schemei Payload

Trebuie confirmat că:

- colecția apare corect în Admin Payload;
- toate câmpurile sunt grupate conform arhitecturii aprobate;
- câmpurile localizate funcționează independent pentru română și engleză;
- valorile implicite sunt aplicate corect;
- câmpurile condiționale apar numai în situațiile prevăzute;
- relațiile acceptă numai colecțiile și cardinalitatea aprobate;
- câmpurile interne nu sunt prezentate ca informații publice;
- coloanele și filtrele administrative sunt funcționale.

### 14.2. Testarea migrației bazei de date

Migrarea trebuie verificată exclusiv în staging înainte de producție.

Trebuie testate:

- generarea fișierului de migrare;
- înregistrarea migrației în indexul Payload;
- rularea comenzii de migrare cu `PAYLOAD_DB_PUSH=false`;
- crearea tabelelor, coloanelor, indecșilor și relațiilor necesare;
- pornirea aplicației după migrare;
- accesul la Admin Payload;
- integritatea colecțiilor existente;
- comportamentul rollbackului, dacă migrarea permite revenirea sigură;
- rularea repetată fără modificări necontrolate ale schemei.

### 14.3. Testarea regulilor de acces

Trebuie verificate cel puțin următoarele scenarii:

- vizitatorul public poate citi un element `published`;
- vizitatorul public nu poate citi un element `draft`;
- vizitatorul public nu poate citi un element `pendingVerification`;
- vizitatorul public nu poate citi un element `verified` nepublicat;
- elementele `withdrawn` și `archived` nu apar în interogările publice obișnuite;
- un element `corrected` apare numai după aprobarea republicării;
- operațiile publice de creare, actualizare și ștergere returnează acces interzis;
- câmpurile interne nu apar în răspunsurile publice;
- administratorul poate administra colecția conform regulilor aprobate.

### 14.4. Testarea fluxului editorial

Trebuie testate tranzițiile valide:

- `draft` → `pendingVerification`;
- `pendingVerification` → `verified`;
- `verified` → `published`;
- `published` → `corrected`;
- `published` → `withdrawn`;
- `published` → `archived`.

Trebuie testată blocarea tranzițiilor nepermise, inclusiv:

- `draft` → `published`;
- publicarea fără sursă;
- publicarea fără verificator;
- publicarea fără data verificării;
- publicarea unui element medical fără verificarea necesară;
- republicarea unui element retras fără reverificare completă.

### 14.5. Testarea validărilor condiționale

Trebuie confirmat că:

- `recommendedAction` devine obligatoriu când `actionRequired` este activ;
- `reverificationDueAt` devine obligatoriu când `requiresReverification` este activ;
- câmpurile medicale obligatorii sunt validate când `isHealthRelated` este activ;
- `medicalReviewer` este obligatoriu când `medicalReviewRequired` este activ;
- corecția necesită istoric și explicație publică;
- retragerea necesită dată și motiv;
- intervalele de promovare resping datele inconsistente;
- relația `supersededBy` nu poate indica același document.

### 14.6. Testarea localizării

Scenariile minime sunt:

- publicare numai în limba română;
- publicare numai în limba engleză;
- publicare în ambele limbi;
- lipsa traducerii fără fallback public necontrolat;
- păstrarea aceluiași statut factual în ambele limbi;
- afișarea corectă a avertismentelor medicale localizate;
- arhiva `/ro/flash` afișează numai conținutul românesc aprobat;
- arhiva `/en/flash` afișează numai conținutul englezesc aprobat;
- atributul HTML `lang` este corect pentru fiecare rută.

### 14.7. Testarea homepage-ului

Trebuie verificat că:

- sunt afișate numai trei până la cinci elemente eligibile;
- selecția respectă limba activă;
- ordinea manuală are prioritate față de fallbackul cronologic;
- elementele din afara perioadei de promovare sunt excluse;
- elementele retrase, arhivate sau înlocuite dispar după invalidarea cache-ului;
- lipsa elementelor eligibile nu produce eroare de randare;
- legătura către arhiva Flash AI funcționează;
- secțiunea nu utilizează animație automată sau derulare forțată.

### 14.8. Testarea arhivei publice

Arhiva trebuie testată pentru:

- paginare;
- ordonare cronologică;
- filtrare după categorie;
- filtrare după tipul informației;
- păstrarea filtrelor în URL;
- parametri invalizi;
- pagini fără rezultate;
- elemente corectate;
- relații publice indisponibile;
- accesibilitate cu tastatura;
- comportament responsive.

### 14.9. Testarea informațiilor medicale

Pentru un element medical de test trebuie confirmat că:

- nivelul dovezilor este obligatoriu;
- stadiul tehnologiei este afișat corect;
- statutul validării clinice nu este generalizat;
- limitele și riscurile sunt prezente;
- verificatorul medical are un profil eligibil;
- avertismentul medical este localizat;
- textul nu este formulat ca diagnostic individual;
- informația experimentală este diferențiată de utilizarea aprobată.

### 14.10. Testarea corecțiilor și retragerilor

Trebuie creat un scenariu complet în care:

1. un element este publicat;
2. informația este actualizată factual;
3. documentul trece în `corrected`;
4. nota publică apare în frontend;
5. data inițială a publicării se păstrează;
6. data actualizării substanțiale este afișată;
7. cache-ul este invalidat;
8. elementul este ulterior retras;
9. dispare din homepage și arhiva obișnuită;
10. istoricul intern rămâne disponibil administratorului.

### 14.11. Testarea securității

Trebuie verificate:

- blocarea scrierilor neautorizate;
- absența câmpurilor interne din API-ul public;
- respingerea URL-urilor cu protocoale periculoase;
- randarea sigură a textului editorial;
- imposibilitatea expunerii relațiilor către `Useri`;
- protejarea rutelor de preview;
- limitarea parametrilor de paginare și filtrare;
- absența secretelor și datelor de configurare din erori;
- comportamentul stabil la relații sau surse externe indisponibile.

### 14.12. Testarea performanței și cache-ului

Trebuie urmărite:

- numărul de interogări Payload necesare homepage-ului;
- profunzimea relațiilor încărcate;
- dimensiunea răspunsului public;
- timpul de răspuns pentru arhiva paginată;
- invalidarea cache-ului după publicare;
- invalidarea cache-ului după corecție;
- invalidarea imediată după retragere;
- comportamentul când Payload este temporar indisponibil.

### 14.13. Verificări tehnice obligatorii

Înainte de deschiderea PR-ului de implementare trebuie rulate cel puțin:

- verificarea TypeScript;
- buildul de producție;
- `git diff --check`;
- testele automate introduse pentru colecție;
- testele manuale documentate în staging;
- verificarea statusului migrațiilor Payload;
- testarea rutelor publice și administrative relevante.

Datoria lint existentă a proiectului trebuie diferențiată de eventualele erori noi introduse de implementare.

### 14.14. Dovezi de validare

PR-urile de implementare trebuie să includă dovezi verificabile precum:

- comenzile rulate;
- rezultatele relevante;
- capturi din Admin Payload, când sunt utile;
- răspunsuri API fără date sensibile;
- scenariile testate;
- problemele cunoscute;
- confirmarea că producția nu a fost modificată în timpul testării staging.

---

## 15. Plan de implementare și separarea PR-urilor

Implementarea `FlashAI` trebuie împărțită în modificări mici, verificabile și reversibile.

Nu se recomandă introducerea simultană a schemei Payload, relațiilor cu toate colecțiile, frontendului complet și integrării homepage într-un singur PR.

### 15.1. Etapa 1 — Schema inițială a colecției

Primul PR de implementare va introduce:

- fișierul colecției `FlashAI`;
- înregistrarea colecției în configurația Payload;
- câmpurile esențiale de identificare și conținut;
- localizarea română și engleză;
- clasificarea editorială de bază;
- sursa principală și datele de verificare;
- starea editorială;
- regulile inițiale de acces rezervate administratorului;
- validările minime pentru publicare;
- migrarea controlată Payload/PostgreSQL;
- testele tehnice asociate.

Acest PR nu va introduce încă integrarea publică în homepage sau arhiva frontend.

### 15.2. Etapa 2 — Flux editorial și validări avansate

Un PR separat va introduce:

- validarea tranzițiilor de stare;
- regulile pentru corecții și retrageri;
- istoricul actualizărilor;
- reverificarea programată;
- protecțiile pentru conținut medical;
- mesajele administrative explicite;
- câmpurile condiționale și hook-urile de audit;
- testele fluxului editorial.

### 15.3. Etapa 3 — Relațiile cu celelalte colecții

Relațiile vor fi introduse controlat după existența schemelor necesare.

PR-ul poate include relații către:

- `Autori`;
- `Articole`;
- `Categorii`;
- `Surse`;
- `Tooluri`;
- `Cursuri`;
- `Roadmaps`;
- alte elemente `FlashAI`.

Nu trebuie modificată simultan structura profundă a tuturor colecțiilor asociate.

### 15.4. Etapa 4 — Contractul public de date

Un PR dedicat va introduce:

- tipurile TypeScript publice;
- funcția de normalizare a documentelor;
- selecția explicită a câmpurilor publice;
- filtrarea după stare și limbă;
- protecția câmpurilor interne;
- validarea relațiilor publice;
- testele pentru obiectele returnate frontendului.

Această etapă trebuie finalizată înaintea construirii componentelor publice.

### 15.5. Etapa 5 — Arhiva publică Flash AI

Un PR frontend separat va introduce:

- ruta `/ro/flash`;
- ruta `/en/flash`;
- paginarea server-side;
- filtrarea aprobată;
- stările goale și de eroare;
- metadatele localizate ale arhivei;
- accesibilitatea și comportamentul responsive;
- testele rutelor publice.

### 15.6. Etapa 6 — Integrarea în homepage

Integrarea homepage va fi realizată numai după aprobarea arhitecturii Globalului `Homepage`.

PR-ul va include:

- interogarea elementelor eligibile;
- limita de trei până la cinci elemente;
- ordonarea controlată;
- componenta compactă Flash AI;
- legătura către arhivă;
- invalidarea cache-ului;
- comportamentul fără elemente disponibile;
- testele de integrare.

### 15.7. Etapa 7 — Pagini individuale, numai dacă sunt aprobate

Paginile individuale nu fac parte obligatoriu din prima versiune.

Un PR ulterior poate introduce:

- sluguri publice;
- rute individuale localizate;
- istoric public complet;
- metadate SEO individuale;
- canonical URL;
- indexare controlată;
- redirecturi pentru schimbarea slugului;
- pagini explicative pentru corecții sau retrageri.

### 15.8. Ordinea mediilor

Fiecare etapă tehnică va urma ordinea:

1. branch separat pornit din `staging` actualizat;
2. implementare locală limitată la obiectivul PR-ului;
3. verificări TypeScript, build și teste;
4. generarea migrației, când schema se modifică;
5. rularea și validarea migrației în staging;
6. deschiderea PR-ului către `staging`;
7. review și integrare;
8. deployment manual în Railway staging numai când este necesar;
9. teste funcționale în staging;
10. promovarea în producție numai printr-un proces separat și aprobat.

### 15.9. Reguli pentru migrații

- `PAYLOAD_DB_PUSH` trebuie să rămână dezactivat;
- schimbările schemei vor utiliza migrații Payload versionate;
- migrarea trebuie inspectată înainte de rulare;
- nu se vor modifica manual tabelele în producție;
- rollbackul trebuie documentat când este sigur și realist;
- datele existente trebuie păstrate;
- migrarea staging trebuie validată înaintea celei de producție;
- statusul migrațiilor trebuie verificat după deployment.

### 15.10. Elemente excluse din primul PR de implementare

Primul PR tehnic pentru `FlashAI` nu trebuie să includă simultan:

- redesignul complet al homepage-ului;
- restructurarea colecției `Articole`;
- modificarea amplă a colecției `Surse`;
- implementarea completă a `Autori` în frontend;
- introducerea rolurilor editoriale noi;
- import automat din fluxuri externe;
- publicare automată asistată de AI;
- notificări push sau ticker în timp real;
- pagini individuale neaprobate;
- schimbări în producție înaintea validării staging.

---

## 16. Dependențe, riscuri și decizii deschise

Arhitectura `FlashAI` depinde de mai multe structuri existente sau planificate. Aceste dependențe trebuie rezolvate controlat, fără extinderea nejustificată a primului PR tehnic.

### 16.1. Dependențe funcționale

Implementarea completă depinde de:

- colecția `Categorii`, pentru asocierea cu pilonii editoriali;
- colecția `Surse`, pentru trasabilitatea informației;
- colecția `Autori`, pentru atribuirea autorilor și verificatorilor publici;
- colecția `Articole`, pentru materialele explicative asociate;
- Globalul `SiteSettings`, pentru texte comune și avertismente implicite;
- viitorul Global `Homepage`, pentru selecția și configurația secțiunii;
- infrastructura de localizare română și engleză;
- fluxul controlat de migrații Payload/PostgreSQL.

Lipsa unei relații opționale nu trebuie să blocheze schema inițială, cu excepția sursei și categoriei principale necesare publicării.

### 16.2. Dependențe editoriale

Înaintea publicării reale trebuie definite operațional:

- criteriile de selecție a subiectelor;
- timpul maxim acceptat între sursă și verificare;
- modul de evaluare a nivelului de certitudine;
- criteriile pentru prioritățile `urgent` și `critical`;
- politica de corectare și retragere;
- cerințele pentru verificarea medicală;
- politica privind conflictele de interese și sponsorizările;
- responsabilitatea editorială zilnică.

### 16.3. Riscul transformării în flux de știri neverificate

Principalul risc editorial este ca viteza să devină mai importantă decât verificarea.

Reducerea riscului necesită:

- publicare exclusiv umană;
- sursă principală obligatorie;
- stare editorială controlată;
- verificator identificabil;
- note publice pentru incertitudine;
- istoric transparent pentru corecții;
- imposibilitatea trecerii directe din `draft` în `published`.

### 16.4. Riscul duplicării colecției Articole

`FlashAI` nu trebuie să devină o versiune paralelă și mai scurtă a colecției `Articole`.

Diferențierea va fi păstrată prin:

- dimensiunea redusă a conținutului;
- structură factuală;
- accent pe sursă, statut și timp;
- lipsa unui editor editorial complex în prima versiune;
- asocierea cu un articol atunci când este necesară analiza extinsă;
- arhivă și componente frontend distincte.

### 16.5. Riscul senzaționalismului vizual

Etichetele de prioritate, alertele și variantele vizuale pot produce exagerare dacă sunt utilizate necontrolat.

Frontendul trebuie să evite:

- culori alarmiste utilizate excesiv;
- majuscule integrale;
- animații continue;
- contoare sau ticker-e care simulează urgența;
- folosirea frecventă a statutului `critical`;
- imagini spectaculoase fără relevanță factuală.

### 16.6. Riscul informațiilor medicale insuficient validate

Informațiile despre diagnostic, tratament, dispozitive sau decizii clinice pot produce prejudicii dacă sunt prezentate fără limite clare.

Reducerea riscului necesită:

- verificare medicală condițională obligatorie;
- nivelul dovezilor;
- stadiul tehnologiei;
- statutul validării clinice;
- prezentarea limitelor și riscurilor;
- evitarea recomandărilor individualizate;
- preferarea surselor oficiale și a literaturii primare.

### 16.7. Riscul degradării surselor în timp

Sursele externe se pot modifica, muta sau șterge.

Trebuie prevăzute:

- data verificării;
- reverificarea programată;
- surse auxiliare;
- referințe interne permise legal;
- marcarea legăturilor indisponibile;
- corectarea sau retragerea elementului când baza factuală nu mai poate fi confirmată.

### 16.8. Riscul expunerii datelor interne

Documentele pot conține observații editoriale, relații către utilizatori și evaluări interne de risc.

Reducerea riscului necesită:

- reguli de acces la nivel Payload;
- selectarea explicită a câmpurilor publice;
- normalizare server-side;
- teste API dedicate;
- evitarea transmiterii documentului complet către componentele client;
- verificarea erorilor și a răspunsurilor de preview.

### 16.9. Riscul complexității excesive

Schema propusă este extinsă deoarece documentează starea țintă, dar prima implementare trebuie să rămână controlată.

Câmpurile vor fi introduse etapizat, în funcție de:

- necesitatea editorială imediată;
- capacitatea de validare;
- existența colecțiilor dependente;
- costul migrațiilor;
- capacitatea de testare și întreținere.

Nu toate câmpurile documentate trebuie introduse obligatoriu în primul PR tehnic.

### 16.10. Decizii deschise pentru etapa de implementare

Următoarele decizii vor fi luate înaintea PR-urilor tehnice relevante:

1. dacă se activează sistemul Payload Drafts și Versions pentru colecție;
2. dacă `slug` este introdus din prima etapă sau numai odată cu paginile individuale;
3. dacă verificatorul intern și verificatorul public utilizează relații separate;
4. dacă tagurile devin o taxonomie dedicată;
5. dacă arhiva publică afișează nivelul de certitudine pentru toate elementele;
6. durata și mecanismul cache-ului Next.js;
7. numărul implicit de elemente pe pagina arhivei;
8. politica exactă pentru elementele `withdrawn` în frontend;
9. dacă elementele expirate rămân în arhiva publică;
10. dacă sunt necesare pagini individuale în prima versiune publică;
11. ce câmpuri din starea țintă intră în schema inițială;
12. când vor fi introduse rolurile editoriale suplimentare.

Aceste decizii nu trebuie presupuse implicit în timpul implementării.

---

## 17. Criterii de acceptare

Arhitectura `FlashAI` este considerată pregătită pentru etapa tehnică numai după îndeplinirea criteriilor de mai jos.

### 17.1. Separarea responsabilităților

- `FlashAI` este definită ca Payload Collection distinctă de `Articole`;
- scopul rubricii este limitat la informații concise, recente și verificabile;
- analiza extinsă rămâne responsabilitatea colecției `Articole`;
- autentificarea și permisiunile administrative rămân în `Useri`;
- profilurile publice și verificatorii publici sunt gestionate prin `Autori`.

### 17.2. Trasabilitate editorială

- fiecare element publicat are o sursă principală identificabilă;
- data sursei este diferențiată de data verificării și de data publicării;
- persoana care a verificat informația poate fi identificată intern;
- metoda verificării este documentată;
- corecțiile și retragerile păstrează un istoric verificabil;
- informațiile înlocuite nu sunt șterse automat.

### 17.3. Flux editorial sigur

- stările editoriale sunt definite clar;
- trecerea directă din `draft` în `published` este interzisă;
- publicarea este blocată când lipsesc date obligatorii;
- corectarea necesită explicație publică și reverificare;
- retragerea elimină elementul din promovarea publică;
- importurile și conținutul asistat de AI nu sunt publicate automat.

### 17.4. Protecția conținutului medical

- informațiile medicale sunt marcate explicit;
- nivelul dovezilor este documentat;
- stadiul tehnologiei și validarea clinică sunt diferențiate;
- limitele și riscurile sunt obligatorii;
- verificarea medicală este impusă în cazurile relevante;
- conținutul nu este formulat ca diagnostic sau recomandare individuală.

### 17.5. Localizare

- câmpurile editoriale publice suportă română și engleză;
- publicarea poate fi realizată separat pentru fiecare limbă;
- frontendul public nu folosește fallback lingvistic necontrolat;
- statutul factual și avertismentele rămân echivalente între traduceri;
- rutele `/ro/flash` și `/en/flash` sunt definite conceptual.

### 17.6. Securitate și confidențialitate

- scrierile publice sunt blocate;
- documentele nepublicate nu pot fi citite public;
- câmpurile interne nu sunt incluse în contractul public de date;
- relațiile către `Useri` nu sunt expuse;
- URL-urile și conținutul extern sunt validate;
- secretele și datele personale inutile nu sunt stocate în colecție.

### 17.7. Integrarea frontend

- există un contract public minimal și explicit;
- homepage-ul poate afișa controlat între trei și cinci elemente;
- arhiva este proiectată pentru paginare și filtrare server-side;
- sursa, statutul și data sunt vizibile în card;
- elementele retrase, arhivate sau expirate nu sunt promovate;
- interfața nu utilizează ticker, carusel automat sau animații continue.

### 17.8. Accesibilitate și performanță

- statutul nu este transmis exclusiv prin culoare;
- navigarea funcționează cu tastatura;
- ierarhia semantică este păstrată;
- preferința pentru mișcare redusă este respectată;
- interogările solicită numai câmpurile publice necesare;
- strategia de cache permite eliminarea rapidă a unei informații retrase.

### 17.9. Implementare controlată

- modificările tehnice sunt împărțite în PR-uri mici;
- schema inițială nu include automat toate câmpurile din starea țintă;
- fiecare schimbare de schemă utilizează migrații versionate;
- `PAYLOAD_DB_PUSH` rămâne dezactivat;
- migrațiile sunt testate mai întâi în staging;
- producția este modificată numai după validare și aprobare separată.

### 17.10. Documentație suficientă pentru implementare

Documentul trebuie să permită echipei tehnice să determine fără presupuneri:

- scopul colecției;
- structura de date țintă;
- câmpurile obligatorii și condiționale;
- regulile de acces;
- fluxul editorial;
- contractul public de date;
- cerințele frontend;
- riscurile și dependențele;
- ordinea PR-urilor;
- scenariile obligatorii de testare.

---

## 18. Rezumatul deciziilor aprobate

### 18.1. Structura Payload

- `FlashAI` va fi o Payload Collection distinctă;
- slugul tehnic recomandat este `flash-ai`;
- denumirea administrativă este `Flash AI`;
- colecția nu înlocuiește și nu dublează `Articole`;
- schema va fi introdusă ulterior prin migrații controlate Payload/PostgreSQL.

### 18.2. Rolul editorial

- colecția va administra informații scurte, recente și verificabile;
- fiecare element publicat va avea sursă, statut factual și dată de verificare;
- publicarea automată fără verificare umană este interzisă;
- corecțiile și retragerile vor fi documentate transparent;
- informațiile care necesită analiză amplă vor fi dezvoltate în `Articole`.

### 18.3. Acces și securitate

- administrarea inițială va fi permisă numai rolului `admin`;
- operațiile publice de creare, actualizare și ștergere vor fi blocate;
- citirea publică va fi limitată la elementele aprobate;
- câmpurile interne și relațiile către `Useri` nu vor fi expuse;
- contractul public de date va fi definit și testat separat.

### 18.4. Frontend public

- arhivele aprobate sunt `/ro/flash` și `/en/flash`;
- homepage-ul va afișa între trei și cinci elemente compacte;
- sursa, statutul și data vor fi vizibile direct;
- secțiunea nu va utiliza ticker, carusel automat sau animații continue;
- paginile individuale rămân o decizie ulterioară.

### 18.5. Protecția informațiilor medicale

- informațiile medicale vor utiliza reguli suplimentare de validare;
- nivelul dovezilor și stadiul tehnologiei vor fi documentate;
- validarea clinică nu va fi generalizată dincolo de utilizarea confirmată;
- verificarea medicală va fi obligatorie în cazurile relevante;
- conținutul nu va oferi diagnostice sau recomandări individualizate.

### 18.6. Ordinea implementării

Ordinea aprobată este:

1. schema inițială a colecției;
2. fluxul editorial și validările avansate;
3. relațiile cu celelalte colecții;
4. contractul public de date;
5. arhiva publică localizată;
6. integrarea în homepage;
7. paginile individuale, numai dacă sunt aprobate.

### 18.7. Starea actuală

Documentul definește arhitectura țintă pentru `FlashAI`.

În această etapă:

- nu a fost modificată configurația Payload;
- nu a fost creată colecția în cod;
- nu a fost generată nicio migrație;
- nu a fost modificată baza de date staging;
- nu a fost realizat deployment în Railway;
- producția nu a fost atinsă.

Următoarea activitate arhitecturală planificată în cadrul `UX-001A` este definirea Globalului `Homepage`.
