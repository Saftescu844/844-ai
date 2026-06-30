import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

function h(tag: string, text: string) {
  return { type: 'heading', tag, format: '', indent: 0, version: 1, children: [{ type: 'text', text, format: 0, version: 1 }] }
}
function p(text: string) {
  return { type: 'paragraph', format: '', indent: 0, version: 1, children: [{ type: 'text', text, format: 0, version: 1 }] }
}

async function main() {
  const payload = await getPayload({ config })

  // găsește draftul Aidoc existent
  const existent = await payload.find({
    collection: 'articole',
    where: { slug: { like: 'aidoc-ai-radiologie' } },
    limit: 5,
  })

  const cat = await payload.find({ collection: 'categorii', where: { slug: { equals: 'sanatate' } }, limit: 1 })
  const categorieId = (cat.docs[0] as any).id

  const continut = {
    root: {
      type: 'root', format: '', indent: 0, version: 1,
      children: [
        p('Inteligența artificială a devenit una dintre cele mai discutate tehnologii din radiologie. Printre companiile care au transformat această promisiune în produse folosite zilnic în spitale se numără Aidoc. Acest articol explică, pe înțelesul tuturor și apoi în detaliu pentru specialiști, ce face această tehnologie, ce dovezi există în spatele ei, ce rezultate s-au obținut în spitale reale din Europa și ce limite are.'),

        h('h2', 'Pentru pacient: ce înseamnă, pe scurt'),
        p('Dacă ajungi la urgență și ți se face o tomografie computerizată (CT), imaginile tale sunt analizate de un medic radiolog. În spitalele aglomerate, acestea se citesc de regulă în ordinea sosirii. O tehnologie de tip Aidoc funcționează ca un „al doilea set de ochi" automat: scanează rapid imaginea și, dacă observă semne ale unei probleme grave (de exemplu o hemoragie cerebrală sau un cheag pe plămân), o marchează ca prioritară, astfel încât medicul să se uite mai repede la cazurile urgente.'),
        p('Este esențial de știut: această tehnologie NU înlocuiește medicul. Decizia finală rămâne întotdeauna a radiologului. Rolul instrumentului este să ajute la prioritizare și să reducă riscul ca un caz urgent să aștepte prea mult. Medicul rămâne în centrul deciziei medicale, iar AI-ul este un asistent care îi atrage atenția mai devreme asupra cazurilor critice.'),

        p('[IMAGINE: schemă simplă a fluxului — pacient → CT → AI analizează → cazurile urgente urcă în lista radiologului. Ideal o diagramă proprie, fără drepturi de autor.]'),

        h('h2', 'Pentru medici și cercetători: analiză detaliată'),

        h('h3', 'Ce este Aidoc și cât de răspândit este'),
        p('Aidoc este unul dintre cei mai mari furnizori de AI clinic dedicat radiologiei. Potrivit datelor din 2026, compania deține peste 31 de autorizări FDA și rulează în aproximativ 1.600–2.000 de spitale, procesând în jur de 60 de milioane de cazuri de pacienți pe an. Sistemul se integrează în fluxul de lucru radiologic, analizând automat imaginile și reordonând lista de priorități a radiologului în funcție de gravitatea constatărilor.'),
        p('În aprilie 2026, compania a atras o finanțare de tip Serie E de 150 de milioane de dolari, condusă de Goldman Sachs, cu participarea NVentures (fondul de investiții al NVIDIA), depășind 500 de milioane de dolari finanțare totală — un indicator al ritmului de adopție a AI clinic la scară largă.'),

        h('h3', 'Modelul CARE și autorizarea din ianuarie 2026'),
        p('În ianuarie 2026, Aidoc a primit autorizarea FDA pentru prima soluție de triaj din domeniul sănătății bazată pe un model de tip „foundation" (model fundamental), denumit CARE. Spre deosebire de instrumentele clasice, care analizează o singură afecțiune pe rând, această soluție acoperă 14 condiții acute într-un singur flux de lucru pentru CT — de exemplu leziuni hepatice, leziuni splenice, ocluzie intestinală sau apendicită.'),
        p('Potrivit studiului pivotal evaluat de FDA, indicațiile au atins o sensibilitate medie de 97% (până la 98,5%) și o specificitate medie de 98% (până la 99,7%). Compania raportează și o reducere semnificativă a alertelor false comparativ cu soluțiile dedicate unei singure afecțiuni.'),

        h('h3', 'Studiu de caz european: grupul Asklepios (Germania)'),
        p('Un exemplu concret de adopție la scară în Europa este grupul spitalicesc german Asklepios, care a finalizat o implementare Aidoc în 28 de spitale. Software-ul analizează automat imaginile CT și radiografiile în timp real, marcând cazuri suspecte de patologii acute precum hemoragii cerebrale, embolii pulmonare sau fracturi.'),
        p('Sistemul procesează peste 35.000 de imagini CT și radiografii lunar în toate locațiile. Important pentru contextul european și românesc: implementarea respectă o abordare securizată, conformă cu Regulamentul General privind Protecția Datelor (GDPR), cu o platformă AI găzduită local (on-premises). Medicii din rețea descriu sistemul ca pe o ușurare, în special în timpul turelor de noapte și de weekend, când personalul este redus.'),

        p('[IMAGINE: hartă/ilustrație a Europei cu marcaje, SAU logo/foto a unui spital din rețea — DOAR dacă ai drepturi sau e liberă de drepturi. Altfel, omite.]'),

        h('h3', 'Rezultate într-un spital din SUA'),
        p('Un alt exemplu concret: la spitalul Montefiore Nyack din Statele Unite, directorul de radiologie a relatat că, într-o singură lună, sistemul a semnalat 77 de pacienți cu hemoragie intracraniană acută — cazuri în care identificarea rapidă poate fi decisivă pentru supraviețuire.'),

        h('h3', 'Perspectivă critică: dovezi independente vs. studii ale producătorului'),
        p('O prezentare onestă trebuie să distingă între cifrele furnizate de companie și cele verificate independent. Cifrele de mai sus (sensibilitate 97%, specificitate 98%) provin din studiul pivotal al companiei, evaluat de FDA — solide și verificate de autoritatea de reglementare, dar nu independente.'),
        p('Există însă și dovezi independente. Un studiu realizat de Spitalul Universitar din Basel, prezentat la Congresul European de Radiologie, a testat algoritmul Aidoc pentru detecția emboliei pulmonare și a obținut o sensibilitate de 93% și o specificitate de 95%. Se observă că aceste cifre, măsurate independent, sunt ușor mai mici decât cele raportate de companie în studiile pivot. Acest tipar — performanța independentă ceva mai modestă decât cea din studiile producătorului — este frecvent în literatura AI medicală și este un motiv pentru care evaluarea independentă rămâne esențială.'),
        p('Un aspect metodologic important: aproximativ 95–97% dintre autorizările FDA pentru AI medical folosesc calea 510(k), care demonstrează „echivalență substanțială" cu un dispozitiv deja existent, nu validarea clinică riguroasă a căilor De Novo sau PMA. În plus, majoritatea dovezilor publicate în AI radiologic sunt retrospective (pe date istorice), nu prospective (pe pacienți reali, în timp real) — acestea din urmă fiind standardul de aur. O analiză din 2025 a 347 de lucrări despre AI în imagistică a constatat că peste 80% pretindeau superioritate față de clinicieni, ceea ce justifică prudență în interpretarea afirmațiilor de marketing.'),

        h('h3', 'Reticența profesională: legitimă, dar separată de date'),
        p('Există și o rezervă de altă natură, umană și de înțeles: o parte din reticența unor medici provine din temerea că tehnologia le-ar putea diminua rolul sau autoritatea profesională. Această preocupare merită recunoscută, însă nu invalidează datele clinice. Consensul actual este că AI funcționează ca instrument de asistare a radiologului — preia sarcini repetitive și prioritizarea, lăsând interpretarea și decizia finală în seama medicului. Departe de a marginaliza specialistul, tehnologia urmărește să îi redirecționeze atenția către cazurile care contează cel mai mult. Cifrele rămân relevante; maturitatea cu care le interpretăm face diferența.'),

        h('h3', 'Limitări și întrebări deschise'),
        p('Rămân întrebări care necesită cercetare suplimentară: efectele pe termen lung asupra rezultatelor pacienților (nu doar asupra vitezei de citire), validarea prospectivă independentă în populații diverse, riscul de dependență excesivă a medicilor de algoritm (automation bias) și performanța reală în spitale cu resurse și fluxuri diferite de cele din studiile pivot. În practică, integrarea în sistemul informatic al spitalului (PACS) contează adesea mai mult decât acuratețea brută a algoritmului.'),

        h('h3', 'Concluzie'),
        p('Aidoc reprezintă unul dintre cele mai mature exemple de AI clinic în radiologie, cu adopție largă (inclusiv în Europa, prin rețele precum Asklepios), cifre de performanță validate de FDA și rezultate concrete în spitale reale. Tehnologia aduce beneficii reale în prioritizarea cazurilor urgente. În același timp, o evaluare profesionistă cere prudență în fața afirmațiilor de marketing, atenție la natura dovezilor (independente vs. ale producătorului, prospective vs. retrospective) și recunoașterea faptului că rolul medicului rămâne central.'),
      ],
    },
  }

  const date: any = {
    titlu: 'Aidoc și AI-ul în radiologie: ce poate face, ce este dovedit și ce rămâne de demonstrat',
    excerpt: 'O analiză amplă a uneia dintre cele mai folosite platforme de AI în radiologie: cum funcționează, dovezile clinice (inclusiv studii independente), studiu de caz european (Asklepios, 28 spitale), perspectiva critică asupra autorizărilor FDA și ce înseamnă pentru pacienți și medici.',
    continut,
    subcategorie: 'diagnostic',
    sursaNume: 'STAT News, FDA, Aidoc, Spitalul Universitar Basel, npj Digital Medicine (surse multiple)',
    sursaLink: 'https://www.statnews.com/2026/01/21/fda-clears-aidoc-tool-detect-multiple-conditions-from-ct-scan/',
    status: 'draft',
  }

  if (existent.docs.length > 0) {
    const id = (existent.docs[0] as any).id
    await payload.update({ collection: 'articole', id, data: date })
    console.log('\n✓ DRAFT EXTINS (actualizat ID ' + id + ')')
  } else {
    await payload.create({
      collection: 'articole',
      data: { ...date, slug: 'aidoc-ai-radiologie-prezentare-' + Date.now().toString(36), limba: 'ro', pilon: categorieId, tip: 'analiza', generatAutomat: false, numarConfirmari: 1, tags: [{ tag: 'radiologie' }, { tag: 'Aidoc' }, { tag: 'FDA' }] } as any,
    })
    console.log('\n✓ DRAFT NOU creat')
  }
  console.log('  Status: draft | Pilon: Sănătate / diagnostic')
  console.log('  3 locuri marcate [IMAGINE: ...] în text\n')
  process.exit(0)
}
main().catch((e) => { console.error('EROARE:', e.message); process.exit(1) })
