# REG-001D — Flash AI Architecture

**Status:** CANONICAL  
**Supersedes:** `docs/ux/UX-001A-08_FLASHAI_ARCHITECTURE.md`

## 1. Scop

Flash AI este formatul editorial rapid al 844-ai.ro.

Un Flash trebuie să explice:
- ce s-a întâmplat;
- de ce contează;
- pentru cine este relevant;
- ce este confirmat și ce este încă incert;
- limitele informației;
- ce întrebări importante deschide.

Țintă editorială: **400–1000 de cuvinte**.

Flash AI este separat de colecția `Articole`.

## 2. Principii

- Arhitectura veche nu este normativă; reutilizăm doar ce este util.
- Orice conținut editorial publicat trebuie să existe în **RO și EN**.
- Flash RO și EN sunt documente separate, legate reciproc.
- Nu este obligatorie migrarea niciunui Flash legacy.
- Autorul standard pentru Flash automatizat este **Redacția 844 AI**.
- Toate Flash-urile publicate vor putea avea comentarii moderate.

## 3. Model FlashAI

Colecție Payload: `flash-ai`

Câmpuri principale:
- `titlu`
- `slug`
- `limba`: `ro | en`
- `versiuneAlternativa`
- `excerpt`
- `continut`
- `flashType`
- `informationStatus`
- `riskLevel`
- `autorPrincipal`
- `verificatorEditorial`
- `verificatorMedical`
- `relatedArticle`
- `relatedFlash`
- `publishedAt`
- `significantUpdatedAt`
- `editorialStatus`
- `automationDecision`
- `decisionReason`
- `eventFingerprint`
- `sourceFingerprint`

`flashType`:
- `announcement`
- `research`
- `regulation`
- `product`
- `business`
- `incident`
- `update`
- `other`

## 4. Statutul informației

`informationStatus`:
- `official`
- `confirmed`
- `emerging`
- `preliminary`
- `disputed`
- `unverified`

`emerging` și `preliminary` pot fi publicabile dacă informația este relatată corect și trece toate celelalte verificări.

`unverified` nu este publicabil.

## 5. Nivel de risc

`riskLevel`:
- `low`
- `medium`
- `high`

Riscul este independent de statutul informației.

Caracterul nou sau potențial revoluționar al unei informații nu este motiv automat de blocare.

## 6. Sănătate și medicină

Flash poate relata cercetări, tehnologii, instrumente și rezultate medicale emergente sau validate.

Trebuie diferențiat clar între:
- promițător / emergent / experimental;
- validat / autorizat / aprobat pentru o utilizare precisă.

Flash NU oferă:
- diagnostic individual;
- alegerea tratamentului pentru un pacient;
- modificarea medicației;
- alte decizii clinice individuale.

`medicalEvidenceType`:
- `notApplicable`
- `preclinical`
- `clinicalStudy`
- `systematicReview`
- `guidelineOrConsensus`
- `regulatoryDecision`
- `realWorldEvidence`
- `productOrCompanyClaim`
- `other`

`clinicalValidationStatus`:
- `notApplicable`
- `notValidated`
- `underEvaluation`
- `limitedEvidence`
- `validatedForSpecificUse`
- `authorizedOrApproved`
- `unclear`

## 7. Disclaimer contextual

`disclaimerTypes`:
- `medicalInformational`
- `emergingEvidence`
- `notClinicallyValidated`
- `regulatoryStatusLimitedOrUnclear`
- `specialistDecision`

Textele standard vor fi gestionate central în RO și EN.

Principiu editorial:

> Flash-ul poate informa pacientul despre tehnologii, cercetări și opțiuni despre care poate discuta cu medicul și îl poate ajuta să formuleze întrebări pertinente. Interpretarea situației individuale și decizia medicală rămân la specialist.

## 8. Întrebări pentru specialist

Pentru Flash medical poate exista `specialistQuestions`, maximum 3 întrebări generale.

Exemple:
- Pentru ce tip de pacienți a fost evaluată această tehnologie?
- Există validare clinică pentru utilizarea descrisă?
- Care sunt limitele cunoscute ale metodei?

## 9. Surse

Colecția `Surse` devine registrul central pentru ingestie.

Câmpuri:
- `nume`
- `url`
- `feedRSS`
- `pilon`
- `regiune`
- `activa`
- `sourceRole`: `primary | secondary`
- `editorialTrust`: `high | standard | restricted`
- `citationMode`: `paraphrase | shortQuote`
- `allowIngestion`
- `allowAutoPublish`

`allowAutoPublish=true` permite doar intrarea în evaluarea AUTO; nu garantează publicarea.

## 10. Surse Flash și deduplicare

Flash trebuie să păstreze:
- sursa principală;
- surse suplimentare;
- URL-ul concret;
- data sursei când este disponibilă.

Deduplicare:
- URL;
- `sourceFingerprint`;
- `eventFingerprint`.

Obiectiv: un singur Flash bine documentat pentru același eveniment.

## 11. AUTO / REVIEW / BLOCK

`automationDecision`:
- `autoPublish`
- `review`
- `blocked`

AUTO este posibil doar dacă:
- RO și EN sunt complete;
- sursele sunt valide;
- deduplicarea trece;
- afirmațiile sunt susținute;
- nu există contradicții materiale;
- `riskLevel = low`;
- sursa permite AUTO;
- disclaimer-ele necesare sunt determinate;
- niciun safety gate nu este declanșat.

REVIEW este obligatoriu pentru:
- risc medium/high;
- informație disputed;
- contradicții materiale;
- interpretare medicală importantă;
- afirmații extraordinare care necesită verificare suplimentară;
- statut regulator neclar;
- incertitudine materială.

Principiu: **incertitudine materială → review**.

BLOCKED pentru:
- diagnostic individual;
- alegere de tratament individual;
- modificare de medicație;
- instrucțiuni periculoase;
- surse insuficiente sau neverificabile;
- informații/citări fabricate;
- `unverified`;
- duplicat evident.

## 12. Lifecycle

Payload `_status` rămâne autoritatea tehnică pentru publicare.

`editorialStatus`:
- `draft`
- `review`
- `approved`
- `blocked`

Nu se folosește `updatedAt` drept dată editorială publică.

## 13. Comentarii

Sistemul existent de comentarii moderate va fi extins controlat pentru:
- Articole;
- Flash.

Comentariile nu transformă Flash-ul într-un serviciu de consultație sau diagnostic.

## 14. Pipeline

Surse configurate  
→ ingestie  
→ normalizare  
→ deduplicare  
→ verificare surse  
→ clasificare  
→ `informationStatus`  
→ `riskLevel`  
→ generare RO  
→ generare EN  
→ validare RO↔EN  
→ safety gates  
→ AUTO / REVIEW / BLOCK  
→ publicare

## 15. Legacy

Auto-Publisher-ul actual este sistem legacy activ.

Noul Flash Engine se construiește și se validează separat în staging.

Cutover-ul către producție este o decizie separată.

## 16. EXT-001 — extensibilitate servicii

844-ai.ro trebuie să poată măsura nevoi recurente și, dacă există cerere reală, să poată direcționa ulterior utilizatorii către servicii specializate ale ecosistemului 844 AI.

Exemple posibile:
- consultații;
- psihologie / psihiatrie;
- meditații;
- profesori;
- mentorat;
- comunicare video.

Nu construim acum aceste servicii.

Înaintea oricărei extensii se măsoară:
- cererea;
- frecvența;
- persistența;
- interesul real;
- fezabilitatea operațională și economică.

Destinațiile viitoare nu vor fi hardcodate în articole sau Flash-uri; vor fi configurabile central.

## 17. Regula documentației

Acesta este documentul canonical pentru REG-001D.

Se actualizează numai când se schimbă o decizie arhitecturală importantă sau implementarea reală diferă intenționat de contract.

Nu se creează documente separate pentru fiecare micro-etapă.
