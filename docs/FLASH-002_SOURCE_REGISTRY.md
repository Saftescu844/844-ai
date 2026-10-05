# FLASH-002 — Configurarea monitorizării în CMS

Continuă FLASH-001. Acest pas extinde colecția `Surse`, fără să pornească
monitorizarea periodică sau publicarea. Schedulerul cu buget și cursor rămâne
o etapă separată.

## Câmpuri

| Câmp | Valoare inițială | Semnificație |
|---|---|---|
| discoveryMethod | disabled | disabled / rss / html / research |
| discoveryUrl | gol | Pagina HTML sau punctul de pornire al cercetării |
| scanIntervalMinutes | 360 | Întreg, între 60 și 10080 minute |
| maxCandidatesPerScan | 10 | Întreg, între 1 și 20 |
| maxCandidatesPerDay | 40 | Întreg, între 1 și 500 |
| discoveryNotes | gol | Ce poate susține sursa și când cere confirmare |

Pentru RSS folosim câmpul existent `feedRSS`, evitând două adrese concurente.
Metodele configurate cer HTTPS fără credențiale/fragment și același hostname
ca sursa (cu echivalență pentru prefixul www). Protecția DNS/IP și verificarea
redirecturilor rămân în retriever, la fiecare cerere; validarea CMS nu este
o dovadă că un endpoint este sigur sau accesibil.

Hook-ul validează configurația combinată dintre documentul existent și
actualizarea parțială. O modificare izolată a feedului nu poate ocoli regula
domeniului. Sursele vechi rămân editabile cu metoda disabled. Limitele nu
permit valori fracționare, zero sau valori din afara intervalelor.

Permisiunile de editare rămân admin-only. `activa`, `allowIngestion` și
`allowAutoPublish` sunt păstrate. Selectarea metodei nu activează un cron
și nu schimbă aceste permisiuni. Comenzile controlate existente își păstrează
comportamentul; noile câmpuri sunt configurație pentru monitorizarea viitoare.

## Migrare

Generată prin CLI Payload 3.85.1 pe Node 22.17.0:
`20261003_210058_flash002_source_discovery` (TS, snapshot JSON, index).
Generarea folosește `disableDBConnect` din CLI, fără conexiune la baze reale.

Up: un enum și șase coloane noi în `surse`; metoda implicită disabled.
Nu șterge date, nu reclasifică surse și nu activează ingestia/publicarea.
Down: elimină aceste câmpuri; se folosește numai înainte de configurarea
efectivă sau după exportarea configurației, deoarece valorile noi s-ar pierde.

Țintă inițială: staging `tvtnpcqawaekhmhyfrnc`, proiect Railway
`resilient-harmony`. Nu se aplică manual schema în Supabase. Migrarea se
aplică prin mecanismul Payload al deploymentului. Producția nu este inclusă.

## Validare și următorul pas

- 18 teste: defaults, RSS canonic, HTML/research, HTTPS, domeniu, limite,
  actualizări parțiale.
- TypeScript și ESLint pe modificare.
- Generare tipuri Payload și inspectarea SQL-ului/snapshotului.
- CI pe Node 22 înainte de integrare.
- După deploy: confirmarea coloanelor, migrării și păstrării permisiunilor.
- Pilotul va configura CE și cele trei RSS, cu AUTO oprit. Sursele noi
  se înregistrează fără ingestie automată, până la validarea completă.

Proba RSS read-only folosește serviciul staging `flash-article-preview-once`,
cu comanda `node --import tsx scripts/flash-source-catalog-preview.ts --probe-rss`,
fără cron, restart NEVER. Aceasta înlocuiește comanda veche de generare GPAI;
nu mai lansează modelul AI. Nu este un crawler periodic și nu scrie în CMS.
