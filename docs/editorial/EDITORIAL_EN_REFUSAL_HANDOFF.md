# EDITORIAL-EN-001 — Recuperare editorială umană după refuz AI

**Proiect:** 844-ai.ro  
**Tip:** Procedură editorială, nu automatizare  
**Stare:** propunere / aprobare editorială necesară înainte de orice scriere în producție  
**Domeniu:** articole RO nepublicate cărora le lipsește perechea EN din cauza unui refuz explicit al furnizorului  
**Caz inițial:** articol RO ID `1066`  
**Principiu:** un refuz AI nu autorizează o retrimitere automată, ocolirea refuzului sau publicarea unilaterală.

## 1. Ce există deja

Colecția Payload `articole` păstrează câte un document separat pentru fiecare limbă (`limba=ro|en`). Legătura este în `versiuneAlternativa`, iar statutul de publicare reală în `_status`. `editorialStatus=review` înseamnă revizuire editorială, **nu publicare**.

- `editor` poate crea și modifica numai drafturi; `admin` controlează publicarea;
- există previzualizare autentificată `/{lang}/preview/articol/{id}`, cu `noindex`;
- câmpurile de titlu, rezumat (`excerpt`), conținut Lexical, surse, pilon, subcategorie, SEO și legătură între limbi există deja;
- `EDITORIAL_INTERVENTION_REQUIRED` este în prezent un semnal **doar în jurnalele GitHub Actions**. Nu există un câmp persistent de „intervenție necesară” în Payload și nu trebuie presupus că există.

**Această procedură nu adaugă stări noi, migrații, joburi ori automatizări.** Nu dezactivează, nu activează și nu operează Auto-Publisher.

## 2. Triere — fără modificări

1. Identifică în GitHub Actions execuția și diagnosticul fix `reason=provider_refusal` / `stopReason=refusal`, apoi notează numărul articolului și linkul rulării în jurnalul editorial intern.
2. Nu folosi `rerun` sau `apply` repetat. Nu interpreta refuzul ca problemă de conectare, de număr de tokenuri sau de redactare a promptului.
3. Citește în Payload Admin articolul RO **în modul draft**; verifică `limba=ro`, `_status=draft`, `editorialStatus=review`, sursa și dacă există deja `versiuneAlternativa`.
4. Caută în colecția `Articole` și după **URL-ul sursei originale**, cu `limba=en`, pentru a exclude o pereche EN nelegată. Dacă găsești o pereche sau legături ambigue, **oprește-te**: nu crea un duplicat.
5. Dacă RO a fost modificat după redactarea traducerii umane, refă verificarea de fidelitate înainte de a continua.

**Cazul 1066 — verificare read-only la 17 octombrie 2026:**

| Câmp | Situație verificată |
| --- | --- |
| ID RO | 1066 |
| Titlu | Viruși proiectați de inteligența artificială: un pas spre viața creată artificial? |
| `limba`, `_status`, `editorialStatus` | `ro`, `draft`, `review` |
| `pilon` | 2 (Sănătate) |
| `subcategorie` | `medicamente` |
| `tip` | `stire-auto` |
| `sursaNume` | MIT Tech Review AI |
| `sursaLink` | https://www.technologyreview.com/2026/10/16/1146224/roundtables-a-conversation-with-the-creator-of-ai-designed-viruses/ |
| Excerpt / conținut | Existente |
| Pereche EN / `versiuneAlternativa` | Inexistentă / null |

Aceste valori sunt un **instantaneu**, nu permisiunea de a scrie în producție. Repetă verificările chiar înainte de orice editare.

## 3. Traducere umană, în afara fluxului automat

1. Un traducător/editor desemnat pregătește traducerea în engleză într-un document de lucru separat, fără a cere generatorului să reîncerce același conținut refuzat.
2. Păstrează fidel sensul, citatele, atribuirea surselor, incertitudinile și nuanțele științifice. Nu introduce afirmații noi, promisiuni clinice sau detalii operaționale despre proiectarea ori manipularea agenților biologici.
3. Pregătește separat **titlul EN**, **excerpt EN**, toate blocurile de conținut EN, **metaTitle** și **metaDescription**.
4. Verifică structura textului: pentru 1066, referința de audit are **10 blocuri de text**; dacă există încărcări media, păstrează-le în pozițiile aprobate și drepturile de utilizare.
5. Un al doilea editor verifică fidelitatea traducerii, ortografia, eventualele formulări cu risc științific și drepturile asupra conținutului.
6. Nu copia integral articolul-sursă extern; versiunea editorială trebuie să respecte drepturile de autor și să atribuie corect sursele.

**Punct de control:** până aici, nicio modificare în Payload sau Supabase.

## 4. Crearea perechii EN în Payload — numai după aprobare distinctă

Nu începe această fază fără **aprobare explicită, specifică articolului, pentru crearea draftului EN în producție**. Faptul că există acest ghid ori că PR-ul a fost integrat nu constituie aprobare.

1. Autentifică-te în **Payload Admin → Articole** ca editor/admin autorizat. Confirmă din nou că RO nu are pereche EN și că nu există un EN cu același `sursaLink`.
2. Folosește **Create New** și creează un **document distinct**, nu `Copy to locale` (articolele nu folosesc câmpuri localized). Evită duplicarea automată a articolului RO fără verificarea fiecărui câmp.
3. Completează câmpurile astfel:

| Câmp EN | Valoare / regulă |
| --- | --- |
| `limba` | `en` |
| `titlu`, `excerpt`, `continut` | Traducerea umană verificată; `excerpt` max. 300 de caractere |
| `slug` | Slug unic, valid; verifică URL-ul generat înainte de salvare |
| `pilon` | Același pilon ca RO (`2` pentru 1066) |
| `subcategorie` | Aceeași subcategorie (`medicamente` pentru 1066) |
| `tip` | Păstrează tipul editorial al RO (`stire-auto` pentru 1066), fără a pretinde că traducerea a fost automată |
| `sursaNume`, `sursaLink` | Aceleași valori/surse ca RO |
| `numarConfirmari` | Păstrează numai confirmările justificate de dovezi; nu inventa verificări |
| `generatAutomat` | **False** pentru traducerea EN produsă manual |
| `editorialStatus` | `review` — „În revizuire” |
| `_status` | **`draft`** — nu apăsa **Publish**, **Publish changes** sau **Schedule Publish** |
| `metaTitle` / `metaDescription` | EN, max. 60 / 160 caractere |
| `versiuneAlternativa` | Se completează în etapa de asociere controlată de mai jos |

4. Folosește **Save Draft**. Notează ID-ul noului articol EN, fără a publica. Dacă salvarea nu reușește, oprește-te, verifică starea actuală și **nu crea alt articol** înainte de verificare.

## 5. Asociere reciprocă RO/EN — operațiune controlată

**Necesită aprobare specifică pentru modificarea legăturilor din producție**, inclusiv pentru actualizarea articolului RO. Nu presupune că aprobarea de creare a draftului EN acoperă automat și modificarea RO.

1. Verifică existența unui singur EN care corespunde sursei RO și că ambele sunt drafturi. Verifică ID-urile exacte și categoria.
2. În draftul EN: setează `versiuneAlternativa = ID_RO` și **Save Draft**.
3. În draftul RO: setează `versiuneAlternativa = ID_EN` și **Save Draft**. **Nu modifica titlul, textul ori sursa RO**.
4. Redeschide ambele articole și confirmă relațiile în ambele sensuri. Dacă apare o eroare între cele două salvări, **nu publica și nu relansa automat vreun workflow**. Notează exact legătura existentă și cere verificare înainte de remediere.

## 6. Controlul editorial final înainte de orice publicare

- [ ] Exact un RO și un EN pentru sursa respectivă; fără duplicate;
- [ ] Ambele documente sunt `_status=draft` și `editorialStatus=review`;
- [ ] RO indică EN și EN indică RO prin `versiuneAlternativa`;
- [ ] Titlul, excerptul și tot conținutul EN sunt prezente, coerente și verificate;
- [ ] Categoria, subcategoria, tipul, sursele și atribuirea corespund;
- [ ] URL-urile, metaTitle și metaDescription sunt corecte;
- [ ] Persoana care a efectuat verificarea editorială este consemnată în câmpurile existente, unde este cazul;
- [ ] Ambele versiuni sunt deschise în preview autentificat: `/ro/preview/articol/1066` și `/en/preview/articol/{ID_EN}`;
- [ ] Paginile publice nu au fost modificate; nu s-a programat nicio publicare;
- [ ] Decizia de publicare rămâne **separată și rezervată administratorului**, după revizie.

Nu transforma automat `editorialStatus` în `blocked` sau `approved` doar pe baza refuzului furnizorului. Acestea sunt decizii editoriale/administrative.

## 7. Reguli de oprire și limite

**Oprește fluxul** dacă: există un EN identic sau un partener ambiguu; RO s-a modificat; diferă sursa sau categoria; excerptul/conținutul este incomplet; statutul nu este draft; nu există aprobarea explicită; ori un pas de asociere a eșuat. Nu presupune că poți corecta situația prin rerun.

**Interzis fără aprobare distinctă:** ștergere, rollback, modificarea RO, publicare, migrație DB, modificarea permisiunilor, deployment Railway, reactivarea Auto-Publisher și apeluri AI repetate după `refusal`.

## 8. Evidență și închidere

În jurnalul editorial intern notează numai: articolul RO, ID EN (dacă a fost creat), URL-ul execuției GitHub care a semnalat refuzul, data, persoana responsabilă, revizia finală și aprobările relevante. **Nu copia secretele sau răspunsul furnizorului AI în jurnal.**

Cazul se închide doar când o persoană confirmă că perechea EN este completă și asociată corect în *draft*. **Publicarea bilaterală este un proiect/act separat, cu aprobare explicită.**

---

**Acest document este un runbook de propunere.** Nu execută, nu declanșează și nu autorizează singur modificări în producție.
