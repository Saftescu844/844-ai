# Editorul Articole și pregătirea versiunii EN

## Utilizare

1. Scrie și formatează articolul RO în `/admin`. Bara fixă păstrează opțiunile de titluri, liste, aliniere și formatare. Fonturile, dimensiunile, culorile și evidențierea sunt opțiuni controlate.
2. Inserează un tabel editabil din `+ → Table`. Tabelele vechi, de tip bloc, rămân disponibile și se afișează în continuare.
3. Încarcă imaginile și graficele în Media. Pentru fiecare inserare poți seta lățimea, alinierea, textul alternativ, descrierea și creditul. Pe ecrane înguste imaginile trec pe rând separat.
4. Folosește „Extinde editorul” pentru spațiu suplimentar. Revii cu același buton sau Escape.
5. „Previzualizează conținutul” afișează textul și imaginile curente, inclusiv modificările nesalvate, la lățime desktop sau mobil. Previzualizarea paginii complete rămâne cea nativă, după salvare.
6. Completează rezumatul și salvează. „Pregătește versiunea EN” este activ doar pentru un document RO salvat, fără modificări nesalvate.
7. Verifică draftul EN rezultat. Este în starea „În revizuire” și este asociat reciproc cu RO. Publicarea folosește fluxul editorial existent.

## Comportament și limite

- Traducerea folosește serviciul Anthropic existent, cu costul obișnuit al cererilor API. Nu este necesar un abonament nou pentru editor.
- Se păstrează structura Lexical, stilurile, listele, legăturile, ID-urile media, dimensiunile și celulele unite ale tabelelor. Se traduc fragmentele de text, descrierile și textele alternative introduse în articol, callout-urile, tabelele vechi, titlurile video, descrierile galeriei și etichetele.
- Creditele și identitatea autorilor se păstrează. Verificatorii ediției RO nu sunt preluați automat drept verificatori ai traducerii.
- Pentru EN existent, „Pregătește actualizarea EN” generează o propunere fără salvare. Compară EN existentă cu traducerea propusă, apoi alege „Renunță la propunere” sau „Aplică traducerea în draftul EN”. Aplicarea înlocuiește textele traduse, inclusiv corecturile manuale, și păstrează versiunea anterioară în istoricul Payload. EN revine în revizuire, iar verificatorii editorial și medical trebuie reconfirmați pentru noul text. O ediție deja publicată rămâne publicată în forma anterioară până la publicarea separată a draftului.
- Propunerea este semnată, legată de editor, pereche și reviziile RO/EN, și expiră după 10 minute. Modificarea RO sau EN între pregătire și aplicare invalidează propunerea. Aplicarea nu apelează din nou modelul și nu creează alt articol EN.
- Două salvări formează o singură tranzacție Payload. Traducerea se face înainte de tranzacție. În etapa de salvare, un lock PostgreSQL și verificarea reviziei RO previn salvarea unei perechi pe un original schimbat între timp. Nu se scrie conținut editorial prin SQL.
- Nu se promite reproducerea fidelă a oricărui document Word prin clipboard. Proba cu documentele reale ale autorilor se face în staging.
- Tabelele native Payload sunt marcate experimental de furnizor. Payload este fixat la versiunea existentă 3.91.0. Upgrade-urile editorului trebuie să repete proba tabelelor.

## Validare înainte de promovare

- CI cu PostgreSQL izolat verifică asocierea, rollback-ul, lipsa duplicatelor la cereri simultane și semnalarea modificărilor RO.
- În staging, creează un articol de probă cu un tabel cu antet și celule unite, o listă, text formatat, link, imagine cu credit și callout. Salvează și reîncarcă, apoi verifică previzualizarea la ambele lățimi.
- Testează lipirea unui tabel real din Word/Excel, editarea celulelor și redimensionarea coloanelor.
- Pregătește EN și verifică sensul, textele celulelor, imaginile, formatarea și legăturile reciproce. Repetarea butonului trebuie să deschidă aceeași ediție.
- Verifică un articol vechi cu tabel de tip bloc și o imagine fără noile câmpuri.
- Staging și main au istoric divergent. Acest PR este delimitat față de main. Nu se promovează întreaga ramură staging pentru a livra editorul.
