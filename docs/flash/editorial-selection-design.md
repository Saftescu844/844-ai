# Selecția editorială Flash AI — proiectare pentru staging

Data: 24 octombrie 2026. Bază: `10002a3` (PR #274).
Statut: proiectare locală, fără integrare în runtime, migrare sau activare de surse.

## Problema verificată

Execuția staging nr. 37, 19:01:40–19:02:12 Europe/Bucharest, a examinat 100 de elemente, a păstrat 20 de candidați tehnici și a încercat trei materiale MIT. Toate au fost oprite înaintea modelului prin `event_identity_not_grounded`. Cele 20 de elemente nu reprezintă o selecție editorială aprobată.

În prezent, ordonarea RSS folosește data, apoi sursa și URL-ul. Verificarea MIT la încredere `standard` precedă clasificarea semantică existentă. `missing_paper_label` este un diagnostic al adaptorului, nu dovada că un material este fals, inutil sau lipsit de orice document original.

## Mecanisme reutilizate

| Responsabilitate | Implementare existentă | Decizie |
|---|---|---|
| Scanare și limite | `scripts/flash-rss-stage-next.ts`, `rssCandidateIngestion.ts` | Păstrăm scanarea 50/sursă, limitele eligibile și maxAttempts=3. |
| Sursa și extragerea | retriever, `researchArticleAdapters.ts`, normalizare | Păstrăm controlul domeniului și conținutul vizibil; numele adaptorului nu clasifică automat orice pagină drept studiu. |
| Identitate | `explicitGroundedEventIdentity.ts`, `groundedEventFingerprint.ts` | Păstrăm identitatea explicită. Nu fabricăm identificatori din titlu, dată, URL sau verdictul modelului. |
| Deduplicare | evaluarea read-only și memoria RSS | Păstrăm URL/source/event dedup; relevanța nu anulează un duplicat. |
| Pilon, flashType, risc, subcategorie | `prePersistenceClassificationSemanticProducer.ts` și parserul strict | Reutilizăm clasificatorul o singură dată când traseul permite apelul; nu introducem un al doilea model pentru aceeași clasificare. |
| Scriere și RO/EN | `flashAiStagingWriteInput.ts`, `payloadFlashAiAtomicReviewPairWriter.ts` | Păstrăm gate-urile finale, perechea atomică și revizuirea. |
| Evidența execuției | `FlashEngineRuns`, diagnostic RSS | Folosim registrul existent; nu creăm o a doua coadă sau bază editorială. |

## Cele două decizii independente

1. **Dispoziție editorială:** candidatul merită analizat pentru Flash, necesită dovezi, este context sau necesită revizuire umană.
2. **Eligibilitate tehnică:** sursa, identitatea, deduplicarea, bugetele și writerul permit sau nu generarea/persistarea.

Un candidat relevant editorial poate rămâne blocat tehnic. `review_required` în proiectare înseamnă o dispoziție de selecție; nu înseamnă că există sau poate fi salvat un draft CMS.

## Preselecție înaintea generării

După verificarea sursei și deduplicarea preliminară, examinăm formatul și afirmația centrală. Pentru pilot folosim fișe revizuite de om, fără apeluri AI. Un viitor extractor determinist va accepta numai indicii explicite și documentate în corpul/metadata paginii, de exemplu eticheta Interview; titlul sau cuvântul AI nu sunt suficiente. Absența etichetei Paper nu clasifică automat materialul ca interviu sau anunț. Indiciile contradictorii/neconcludente produc `review_required`.

`sourceFormat` este metadată internă de preselecție: research_result, institutional_announcement, interview, profile, background, unknown. Nu extindem enumul CMS `flashType`; acesta descrie un alt lucru și rămâne contractul existent. Nu atribuim automat statutul confirmed tuturor afirmațiilor unui interviu oficial.

| Afirmație / format | Dovada necesară | Dispoziție inițială |
|---|---|---|
| Rezultat științific concret | Lucrarea originală corespunzătoare, identificare și limite verificate; o legătură către o lucrare nu dovedește singură concluzia | `needs_primary_evidence` până la verificare, apoi candidat pentru evaluare |
| Act sau anunț al instituției | Documentul original/anunțul propriu cu acțiune, dată și responsabil clar; opiniile și beneficiile prognozate rămân atribuite | Candidat pentru evaluare, cu identitatea încă verificată separat |
| Interviu/opinie | Interviul original și vorbitorul identificați; separarea opiniilor, predicțiilor și afirmațiilor factuale | `review_required`, fără a cere arbitrar un DOI pentru opinie |
| Profil sau retrospectivă | Sursa originală; pentru rezultate concrete, documentele corespunzătoare | `context_only` dacă nu este documentată o noutate utilă |
| Format/afirmație neclară | Clarificare editorială | `review_required` |

Ordine pentru candidații care au trecut pragurile: actualitate documentată, utilitate pentru elevi/profesori/studenți și ceilalți utilizatori, impact susținut, valoare explicativă, diversitate. Nu introducem ponderi numerice înaintea calibrării pe exemple reale. Nu folosim scorul pentru a înlocui probele.

Data originală se păstrează și este afișată în fișa de selecție. Un material din 8 octombrie nu devine știre din 24 octombrie. Contextul mai vechi cere o justificare explicită pentru un Flash nou sau rămâne context; nu introducem aici un prag numeric arbitrar de expirare.

Diversitatea se aplică numai între materiale eligibile, fără cote care impun publicarea. Un model viitor de intercalare a surselor trebuie evaluat separat; nu schimbăm ordinea workerului prin acest document.

## Pilotul pe cele trei materiale reale

Evaluări editoriale umane pentru audit, nu rezultate produse de software:

| URL MIT (sufix) | Format / relevanță | Dispoziție editorială | Stare tehnică la execuția 37 |
|---|---|---|---|
| `3-questions-best-path-forward-for-ai-academia-1008` | Interviu cu Sasha Rakhlin; educație și cercetare. 8 octombrie. | `review_required`; utilitate ridicată pentru Educație, actualitatea pentru Flash trebuie justificată; opiniile sunt atribuite, afirmațiile concrete se verifică distinct. | Identitate pending, sursă standard; nicio generare/scriere permisă pe traseul curent. |
| `mitigating-environmental-threat-of-data-centers-christina-delimitrou-1008` | Profil Christina Delimitrou; activitate de cercetare și biografie. 8 octombrie. | `context_only` în lipsa unei noutăți specifice documentate; nu extragem rezultate noi din profil fără lucrare. | Identitate pending, sursă standard; respingere înaintea modelului. |
| `discovering-value-humanistic-inquiry-1007` | Prezentarea Concourse și a educației umaniste; AI este un element al discuției. 7 octombrie. | `context_only`; posibil material Educație separat, fără forțarea relevanței pentru Flash AI. | Identitate pending, sursă standard; respingere înaintea modelului. |

Surse primare citite:
- https://news.mit.edu/2026/3-questions-best-path-forward-for-ai-academia-1008
- https://news.mit.edu/2026/mitigating-environmental-threat-of-data-centers-christina-delimitrou-1008
- https://news.mit.edu/2026/discovering-value-humanistic-inquiry-1007

## Blocajul de identitate rămâne explicit

MIT este `primary/standard`, cu AUTO oprit. Excepția actuală pentru pending identity în writer și perechea atomică cere `primary/high` plus alte protecții. Nu creștem global încrederea MIT și nu schimbăm această excepție. Clasificarea unui interviu ca relevant nu îi acordă o identitate verificată.

Pentru anunțurile non-științifice fără identificator recunoscut, prima implementare poate explica și direcționa dispoziția editorială, dar nu le va genera automat. Extinderea identității pe tip de eveniment ar necesita un contract distinct pentru autoritatea identificatorului, deduplicare între surse și aceeași identitate RO/EN. Documentul de față nu autorizează această extindere.

## Contract de diagnostic propus

Metadate minime în evidența existentă: versiunea politicii; sourceFormat; tipul afirmației; editorialDisposition; reasonCodes; data publicării; dovada/indiciul folosit și originea lui (om/metadată explicită); identityStatus; generationAllowed. Orice generationAllowed este derivat de gate-urile existente, niciodată furnizat de model.

Motive distincte propuse: `needs_primary_evidence`, `context_only`, `editorial_review_required`, `identity_unresolved`, `relevance_not_established`. Acestea sunt propuneri, nu valori acceptate deja de memoria RSS. Nu introducem etichete noi în acel enum înainte de actualizarea și testarea tuturor cititorilor/scriitorilor.

Un context_only nu este automat o respingere factuală de șapte zile. Pentru prima etapă read-only, nu scriem și nu ștergem intrări în memoria curentă. O eventuală memorare editorială necesită versiune de politică, motiv, TTL și invalidare la schimbarea conținutului, definite înaintea integrării. Nu resetăm cele 16 intrări MIT pentru a forța reîncercarea.

## Implementare recomandată și probe de acceptare

Prima etapă: helper pur pentru dispoziția pe metadate explicite/fișe revizuite + preview offline, fără importarea Payload sau a producătorilor AI. Nu conectăm încă helperul la cron. Testele trebuie să demonstreze:

1. Lipsa Paper nu este, singură, dovada unui format editorial.
2. Un interviu cu afirmații științifice nu scapă de verificarea acelor afirmații.
3. Contextul vechi nu primește data de azi și nu intră automat la generare.
4. Unknown/contradicție/absența indiciilor cer revizuire, fără presupuneri din titlu.
5. Nicio dispoziție editorială nu schimbă sursa, încrederea, AUTO, identitatea sau dedup.
6. Cele trei fișe MIT au rezultatele descrise mai sus; sourceFormat nu se confundă cu flashType.
7. Previzualizarea nu are scrieri, apeluri provider sau efect asupra bugetului maxAttempts=3.

A doua etapă, după validarea helperului: integrare diagnostică read-only în traseul existent, cu contoare și cache/TTL definite, fără a permite drafturi care nu trec writerul. Refolosim clasificatorul semantic existent când este eligibil, în loc să îi duplicăm funcția.

Criteriul de succes inițial este o selecție explicabilă și fidelă dovezilor; nu numărul de articole generate.

## Implementarea locală a pilotului

Helper: `src/lib/flash/ingestion/editorialSelection.ts`. Fișe umane: `editorialSelectionPilot.ts`. Preview: `node --import tsx scripts/flash-editorial-selection-preview.ts`. Ceasul de evaluare este fix, explicit, pentru reproducerea pilotului din 24 octombrie, nu data curentă a unei rulări viitoare.

Helperul nu detectează singur formatul paginilor: consumă observații explicite/revizuite și nu validează autenticitatea originii declarate. Un viitor apelant trebuie să le construiască din extragerea verificată, niciodată direct din instrucțiuni sau JSON arbitrar ale sursei. Nu este un gate de securitate sau autoritate de publicare. `generationAllowed` rămâne întotdeauna false în acest preview, inclusiv pentru `candidate_for_evaluation` și identitate grounded, deoarece gate-urile writerului nu sunt evaluate aici.

Rafinarea fișei interviului: textul original include afirmații despre rezultate de cercetare, pe lângă opinii. Dispoziția precisă a preview-ului este `needs_primary_evidence`, cu actualitatea și identitatea încă nerezolvate; aceasta precizează motivul revizuirii recomandate în tabelul editorial. Profilul și prezentarea Concourse sunt evaluate ca materiale de context, fără a propune preluarea rezultatelor concrete ca noutăți.

Validare locală: 13 teste noi și 20 de regresie, 33/33 PASS; TypeScript, ESLint pe fișierele noi și diff-check PASS. Preview offline și --help executate cu `node --import tsx`, fără acces DB sau provider. Runtime local Node 24; CI Node 22 rămâne necesar înainte de integrare. Nicio conexiune la worker, nicio modificare de schemă, memorie de respingere sau flag de sursă.
