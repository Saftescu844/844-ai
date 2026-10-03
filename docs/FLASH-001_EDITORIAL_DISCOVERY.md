# FLASH-001 — Politica editorială și descoperirea surselor

Data inventarului: 3 octombrie 2026, Europe/Bucharest.
Bază verificată: staging `93c4599ea16fd00ade2deb95b1528e43d5d8a58c`.

## Scop și statut

Închidem traseul descoperire → selecție → surse → verificare → RO/EN →
revizuire → publicare → afișare în secțiunea potrivită.
Acest prim pas livrează politica, inventarul real și un catalog de căutare
cu previzualizare read-only. Nu activează surse, cronuri sau autopublicare.
Catalogul propus nu înlocuiește autoritatea registrului `Surse` din CMS.

Direcția a fost acceptată în conversația din 3 octombrie; valorile operaționale
de mai jos sunt configurația inițială propusă, de calibrat printr-un pilot.
Nu sunt prezentate drept funcții deja instalate.

## Inventar verificat prin SELECT, separat pe medii

| Mediu | Sursă | Rol / încredere | Activă | Ingestie Flash | AUTO | RSS | Piloni asociați |
|---|---|---|---|---|---|---|---|
| Staging | Comisia Europeană, id 4 | primary / high | da | da | nu | absent | stiri |
| Producție | OpenAI, id 1 | secondary / restricted | da | nu | nu | absent | niciunul |
| Producție | Reuters, id 2 | secondary / restricted | da | nu | nu | absent | niciunul |
| Producție | MIT Tech Review, id 3 | secondary / restricted | da | nu | nu | absent | niciunul |
| Producție | Comisia Europeană, id 4 | primary / high | da | da | nu | absent | niciunul |

`activa=true` nu înseamnă `allowIngestion=true`. Valorile OpenAI sunt cele
din baza de date, nu aprecierea noastră editorială; înaintea activării trebuie
corectată clasificarea pentru anunțurile proprii și actualizată adresa veche
`https://openai.com/blog`. Asocierea CE cu pilonul lipsește în producție.
Nu schimbăm aceste date prin acest PR. Interogarea repetabilă este
`scripts/flash-source-registry-audit.sql`.

Workerul Railway staging rulează la `*/15 * * * *`, dar comanda
`flash-engine-run-next.ts` procesează cel mult o evaluare eligibilă deja pusă
în coadă. Nu caută noutăți și nu publică Flash-uri. Separat, vechiul workflow
`.github/workflows/publisher.yml` declară patru intervale UTC și scripturi cu
liste proprii RSS pentru articole. Aceste liste nu sunt registrul Flash.
Nu le dezactivăm înainte de un plan verificat de înlocuire.

## Acoperirea meniurilor existente

Păstrăm structura și etichetele bilingve ale navigației. Configurația publică
SiteSettings consultată la audit avea `primaryNavigation=[]`, deci meniul
utilizează cei cinci piloni din frontend.

| Pilon / subcategorie | Semnale căutate |
|---|---|
| stiri | Modele, cercetare, robotică, infrastructură, securitate, reglementare, efecte sociale |
| sanatate / diagnostic | Diagnostic și imagistică: rezultate, limite, validare |
| sanatate / medicamente | Descoperire de medicamente, rezultate preclinice și studii |
| sanatate / asistenta-clinica | Instrumente pentru medici/asistenți, documentare și organizare |
| sanatate / reglementare | Decizii oficiale, etică, date și responsabilitate |
| sanatate / pacienti | Instrumente pentru pacienți, accesibilitate și informare |
| educatie / invatare-ai | Resurse, cursuri și alfabetizare AI pentru toate vârstele |
| educatie / institutii | Implementări, politici și evaluări în școli/universități |
| educatie / instrumente-edu | Instrumente utile elevilor, profesorilor și studenților |
| educatie / cercetare | Metode de învățare, evaluare și inovație educațională |
| educatie / cariere | Competențe, reconversie, programe și studii despre muncă |
| tools | Lansări/actualizări, funcții, disponibilitate, costuri și limite |
| afaceri | Productivitate, IMM, industrie, energie, agricultură, finanțări |

Educația este prioritară. România și Europa sunt urmărite explicit, cu
deschidere globală. Știrile despre o companie nu trebuie să domine oferta.
Un eveniment are o identitate și ediții RO/EN, chiar dacă este relevant în
mai multe locuri; afișarea multiplă nu justifică duplicate de conținut.
Legătura cu o fișă Tool Directory nu acordă automat scor sau recomandare.

## Unde și cum căutăm

Catalogul versionat: `src/lib/flash/ingestion/flashDiscoveryCatalog.ts`.
Include 15 puncte de pornire, adrese exacte, domenii, intervale, limite pe
scanare și limitele autorității. Este o propunere, fără ID-uri CMS fabricate.

1. RSS/API verificat când există; HTML cu adaptor specific în celelalte cazuri.
2. Căutare tematică RO/EN pentru golurile din ofertă, cercetare independentă,
   universități, proiecte open-source și idei interdisciplinare.
3. O pagină agregatoare sau un rezultat de căutare conduce la materialul
   original. Nu este singură dovada concluziei relatate.
4. O sursă nouă intră în evaluare înaintea ingestiei. Nu acordăm automat
   încredere unui domeniu doar pentru că apare într-un rezultat.
5. Materialul extern este conținut de analizat, niciodată instrucțiune pentru
   motor. Respectăm refuzurile, limitele de acces și drepturile de utilizare.

Intervale inițiale: 1 oră pentru flux rapid, 6 ore pentru instituții și
cercetare instituțională, 24 ore pentru explorare. Limite: 10 candidați/scanare
în flux normal, 20 la explorare. Sunt limite de selecție inițială, nu cote de
publicare și nici permisiune de a elimina restul fără evidență: schedulerul
viitor trebuie să păstreze cursorul/backlogul pentru a evita pierderea
materialelor în zilele aglomerate.

Din catalog, preview-ul tehnic verifică numai cele trei intrări RSS:
Google Research, MIT News AI și OpenAI News. HTML-ul existent este specific
CE (`/en/news/`); nu este un extractor universal. UNESCO/Anthropic au nevoie
de adaptoare proprii; intrările `research` sunt piste editoriale și au nevoie
de interogări/adaptoare înainte de monitorizare automată. PubMed/arXiv/
OpenReview/Hugging Face nu conferă automat validare lucrărilor descoperite.

### Selecție și diversitate

Înaintea modelului: URL normalizat, data publicării, conținut schimbat,
duplicat de URL/conținut și grupare pe eveniment. Materialele fără dată sigură
intră la verificare, nu sunt prezentate drept noutăți de azi. Articolele vechi
pot fi context, cu data păstrată. O actualizare substanțială se poate publica
ca actualizare a evenimentului, cu diferența explicată.

După validarea surselor, prioritatea se ordonează prin: noutate, relevanță
pentru public, impact documentat, valoare explicativă, apoi diversitate.
Scorul editorial nu decide dacă o afirmație este adevărată și nu poate
anula un gate factual. Prima versiune va reține motivul selecției/respingerii;
ponderile numerice se calibrează pe candidați reali înainte de automatizare.

Propunere inițială: maximum două evenimente despre aceeași companie/zi,
cu excepție motivată editorial pentru un eveniment major. RO+EN contează
împreună ca un eveniment. Echilibrul domeniilor se urmărește săptămânal,
fără publicare forțată pentru umplerea cotelor. Generarea are un plafon
de cost/zi care trebuie configurat înaintea rulării automate.

### Ce poate susține o sursă

- Instituția confirmă propriul act/anunț; autorul confirmă ce a raportat.
- Compania confirmă lansarea proprie; performanța comparativă cere dovezi
  adecvate, nu doar declarația de marketing.
- Comunicatul universitar conduce la lucrarea originală când discutăm rezultate.
- Presa poate furniza relatări atribuite; pentru concluzii sensibile sau
  contestate căutăm documentul original și confirmare independentă.
- Zece republicări ale aceluiași comunicat nu sunt zece confirmări.

## Rubrica exploratorie

Denumire RO agreată: **Idei poate nebunești, dar revoluționare**.
Denumire EN de lucru: **Ideas that may sound crazy, but could be revolutionary**.

| Etichetă RO | Etichetă EN de lucru | Sens |
|---|---|---|
| Fapt verificat | Verified fact | Afirmația precisă relatată are dovezi verificabile |
| Cercetare timpurie | Early-stage research | Rezultate inițiale, limite și stadiu explicit |
| Ipoteză promițătoare | Promising hypothesis | Argumente/indicii, demonstrație incompletă |
| Idee exploratorie | Exploratory idea | Propunere argumentată care merită urmărită |

Eticheta nu validează întreaga idee. Faptul că o lucrare există poate fi
verificat, în timp ce concluzia sa rămâne cercetare timpurie. Etichetele
editoriale nu înlocuiesc stările tehnice `informationStatus`.
Nu folosim termenul respins în conversație ca etichetă editorială.

Structură: ideea → argumentele și dovezile → limitele → ce ar trebui testat
→ scenariul explicit condiționat «Dacă ar fi posibil…». Ultima secțiune
necesită un contract de generare și QA distinct; promptul factual actual
interzice consecințe nesusținute. Nu slăbim acel prompt global.
Rubrica exploratorie necesită REVIEW, inclusiv când sursa poate intra în AUTO.

## RO/EN și publicarea

Fiecare ediție este redactată direct din același set verificat de surse.
EN nu traduce Flash-ul RO. Se păstrează cifrele, datele, atribuirea și nivelul
de certitudine, cu formulări naturale fiecărei limbi. QA existent compară
fiecare ediție cu sursele; controlul determinist actual cere 500–1000 cuvinte.
Nu schimbăm lungimea în acest pas și nu adăugăm fapte pentru a umple textul.

Legarea existentă verifică același `eventFingerprint`, limbi opuse și
conflicte, apoi scrie reciproc în tranzacție. Evaluatorul de completitudine
este mai restrâns: verifică prezența limbilor. Lipsește verificarea dedicată
a concordanței interlingvistice a faptelor și certitudinii.

Înainte de publicare trebuie revalidate versiunea efectivă, sursele,
evenimentul, legătura reciprocă și concordanța. O diferență materială sau o
corecție ulterioară redeschide revizuirea ambelor ediții. Nu este suficient
ca ambele texte să existe. `autoPublish` este eligibilitate calculată,
nu dovada unei publicări automate. Pilotul păstrează publicarea controlată.

## Etape și probe de acceptare

| Pas | Livrabil | Probă |
|---|---|---|
| 1 — acest PR | Inventar, politică, catalog propus, preview fără scrieri | SELECT separat pe medii; verificare separată a endpointurilor RSS; CLI fără acces DB/model |
| 2 | Registru CMS cu metodă, adresă, interval, limite și domenii | Plan de modificări verificat; surse staging înregistrate corect; fără AUTO implicit |
| 3 | Subcategorii, rubrică și etichete în schema/classificare/afișare | Flash sănătate și educație vizibile în filtrul corect; tools/afaceri afișate; cursuri/catalog păstrate |
| 4 | Contract exploratoriu și concordanță RO/EN | Exploratoriu trimis la REVIEW; pereche concordantă acceptată; diferență materială respinsă |
| 5 | Descoperire periodică, cursor, dedup, buget și retry limitat | Rulare repetată fără duplicate; sursă indisponibilă nu oprește restul; cost limitat |
| 6 | Probă completă și promovare controlată | Eveniment nou → surse → RO/EN → review → publicare și afișare; verificare în ambele limbi |

Pașii 2–6 rămân deschiși. Migrațiile vor fi aditive, prin fluxul Payload
al proiectului. Conținutul existent nu primește automat etichete noi.
Meniurile nu se modifică. Promovarea în producție rămâne o decizie separată.

## Comenzi de verificare

```bash
node --import tsx scripts/flash-source-catalog-preview.ts
node --import tsx scripts/flash-source-catalog-preview.ts --probe-rss
```

Prima comandă este complet offline. A doua face GET secvențial, cu timeout
HTTP de 15 secunde și limită 1 MB/endpoint, folosind protecțiile de rețea existente.
Rezolvarea DNS precedă timeoutul HTTP; acesta nu este un plafon total de rulare.
Raportează numai metadate și numărul intrărilor, fără a genera, persista sau
publica. Un RSS parsabil nu demonstrează relevanța sau adevărul articolelor.

Verificări externe 3 octombrie: UNESCO, Anthropic și edu.ro au pagini
accesibile prin instrumentul web. CE a răspuns 429 la reverificare; UEFISCDI
a avut timeout, iar DNSC nu a returnat conținut prin acel instrument.
Aceste rezultate nu sunt verdict editorial și nu justifică ocolirea refuzului.

Verificare RSS separată prin clientul HTTP disponibil în workspace:
Google Research HTTP 200 / 100 intrări, MIT News AI HTTP 200 / 50 intrări,
OpenAI News HTTP 200 / 1245 intrări; XML parsabil în limita de 1 MB.
Preview-ul cu retrieverul canonic a raportat `network_policy_blocked` pentru
toate trei în workspace. Protecția nu a fost relaxată. Proba canonică pe
runtime-ul staging rămâne de efectuat înainte de activarea ingestiei.

Validare locală: TypeScript fără emitere PASS; ESLint pe cele două fișiere
TypeScript noi PASS; preview offline PASS (15 chei unice, cei cinci piloni).
Revizuire independentă read-only: niciun blocaj pentru acest PR de propunere.
Nu este o validare end-to-end a ingestiei sau publicării. Workspace-ul rulează
Node 24; verificările proiectului pe Node 22 rămân autoritatea CI.
