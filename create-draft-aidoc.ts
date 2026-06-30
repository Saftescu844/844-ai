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
  const cat = await payload.find({ collection: 'categorii', where: { slug: { equals: 'sanatate' } }, limit: 1 })
  if (cat.docs.length === 0) { console.error('Lipsește categoria sanatate'); process.exit(1) }
  const categorieId = (cat.docs[0] as any).id

  const continut = {
    root: {
      type: 'root', format: '', indent: 0, version: 1,
      children: [
        p('Inteligența artificială a devenit, în ultimii ani, una dintre cele mai discutate tehnologii din radiologie. Printre companiile care au transformat această promisiune în produse folosite zilnic în spitale se numără Aidoc. Acest articol explică, pe înțelesul tuturor și apoi în detaliu pentru specialiști, ce face această tehnologie, ce dovezi există în spatele ei și ce limite are.'),

        h('h2', 'Pentru pacient: ce înseamnă, pe scurt'),
        p('Dacă ajungi la urgență și ți se face o tomografie (CT), imaginile tale sunt analizate de un medic radiolog. În spitalele aglomerate, acestea se citesc, de regulă, în ordinea sosirii. Tehnologia de tip Aidoc funcționează ca un „al doilea set de ochi" automat: scanează rapid imaginea și, dacă observă semne ale unei probleme grave (de exemplu o hemoragie sau un cheag), o semnalează ca prioritară, astfel încât medicul să se uite mai repede la cazurile urgente.'),
        p('Este important de știut: această tehnologie NU înlocuiește medicul. Decizia finală rămâne întotdeauna a radiologului. Rolul instrumentului este să ajute la prioritizare și să reducă riscul ca un caz urgent să aștepte prea mult. Medicul rămâne în centrul deciziei medicale.'),

        h('h2', 'Pentru medici și cercetători: analiză detaliată'),

        h('h3', 'Ce este Aidoc și cât de răspândit este'),
        p('Aidoc este unul dintre cei mai mari furnizori de AI clinic dedicat radiologiei. Potrivit datelor din 2026, compania deține peste 31 de autorizări FDA și rulează în aproximativ 1.600–2.000 de spitale, procesând în jur de 60 de milioane de cazuri de pacienți pe an. Sistemul se integrează în fluxul de lucru radiologic, analizând automat imaginile și reordonând lista de priorități a radiologului în funcție de gravitatea constatărilor.'),

        h('h3', 'Modelul CARE și autorizarea din ianuarie 2026'),
        p('În ianuarie 2026, Aidoc a primit autorizarea FDA pentru prima soluție de triaj din domeniul sănătății bazată pe un model de tip „foundation" (model fundamental), denumit CARE. Spre deosebire de instrumentele clasice, care analizează o singură afecțiune pe rând, această soluție acoperă 14 condiții acute într-un singur flux de lucru pentru CT (de exemplu: leziuni hepatice, leziuni splenice, ocluzie intestinală, apendicită).'),
        p('Potrivit studiului pivotal evaluat de FDA, indicațiile au atins o sensibilitate medie de 97% (până la 98,5%) și o specificitate medie de 98% (până la 99,7%). Compania raportează și o reducere semnificativă a alertelor false comparativ cu soluțiile dedicate unei singure afecțiuni.'),

        h('h3', 'Perspectivă critică: ce este dovedit și ce trebuie nuanțat'),
        p('O prezentare onestă trebuie să distingă între cifrele validate și contextul lor. Cifrele de mai sus (sensibilitate 97%, specificitate 98%) provin din studiul pivotal al companiei, evaluat de FDA — sunt solide și verificate de autoritatea de reglementare, dar nu provin dintr-un studiu independent de companie.'),
        p('Un aspect metodologic important: aproximativ 95–97% dintre autorizările FDA pentru AI medical folosesc calea 510(k), care demonstrează „echivalență substanțială" cu un dispozitiv deja existent, nu validarea clinică riguroasă a căilor De Novo sau PMA. În plus, majoritatea dovezilor publicate în AI radiologic sunt retrospective (pe date istorice), nu prospective (pe pacienți reali, în timp real) — acestea din urmă fiind standardul de aur al validării clinice. O analiză din 2025 a 347 de lucrări despre AI în imagistică a constatat că peste 80% pretindeau superioritate față de clinicieni, ceea ce justifică o doză sănătoasă de prudență în interpretarea afirmațiilor de marketing.'),
        p('Există și o rezervă de altă natură, legitimă uman dar diferită ca origine: o parte din reticența profesională provine din temerea unor medici că tehnologia le-ar putea diminua rolul sau autoritatea. Această preocupare este de înțeles, însă nu invalidează datele clinice. Consensul actual este că AI funcționează ca instrument de asistare a radiologului — preia sarcini repetitive și prioritizarea, lăsând interpretarea și decizia finală în seama medicului. Departe de a marginaliza specialistul, tehnologia urmărește să îi redirecționeze atenția către cazurile care contează cel mai mult.'),

        h('h3', 'Limitări și întrebări deschise'),
        p('Rămân întrebări care necesită cercetare suplimentară: efectele pe termen lung asupra rezultatelor pacienților (nu doar asupra vitezei de citire), validarea prospectivă independentă în populații diverse, riscul de dependență excesivă a medicilor de algoritm (automation bias) și performanța reală în spitale cu resurse și fluxuri diferite de cele din studiile pivot. Integrarea în sistemul informatic al spitalului (PACS) contează adesea mai mult decât acuratețea brută a algoritmului.'),

        h('h3', 'Concluzie'),
        p('Aidoc reprezintă unul dintre cele mai mature exemple de AI clinic în radiologie, cu o adopție largă și cifre de performanță validate de FDA. Tehnologia aduce beneficii reale în prioritizarea cazurilor urgente. În același timp, o evaluare profesionistă cere prudență în fața afirmațiilor de marketing, atenție la natura dovezilor (retrospective vs. prospective) și recunoașterea faptului că rolul medicului rămâne central. Cifrele sunt relevante și promițătoare; maturitatea cu care le interpretăm face diferența.'),
      ],
    },
  }

  const creat = await payload.create({
    collection: 'articole',
    data: {
      titlu: 'Aidoc și AI-ul în radiologie: ce poate face, ce este dovedit și ce rămâne de demonstrat',
      slug: 'aidoc-ai-radiologie-prezentare-' + Date.now().toString(36),
      limba: 'ro',
      pilon: categorieId,
      subcategorie: 'diagnostic',
      tip: 'analiza',
      excerpt: 'O analiză amplă a uneia dintre cele mai folosite platforme de AI în radiologie: cum funcționează, ce dovezi clinice există, perspectiva critică asupra autorizărilor FDA și ce înseamnă pentru pacienți și medici.',
      continut,
      sursaNume: 'STAT News, FDA, Aidoc, npj Digital Medicine (surse multiple)',
      sursaLink: 'https://www.statnews.com/2026/01/21/fda-clears-aidoc-tool-detect-multiple-conditions-from-ct-scan/',
      tags: [{ tag: 'radiologie' }, { tag: 'diagnostic AI' }, { tag: 'Aidoc' }, { tag: 'FDA' }],
      status: 'draft',
      generatAutomat: false,
      numarConfirmari: 1,
    } as any,
  })
  console.log('\n✓ DRAFT creat cu ID ' + creat.id)
  console.log('  Status: draft (NU publicat — îl vezi în admin la Articole)')
  console.log('  Pilon: Sănătate / subcategorie: diagnostic\n')
  process.exit(0)
}
main().catch((e) => { console.error('EROARE:', e.message); process.exit(1) })
