// Rejoue les nœuds Code du workflow n8n hors de n8n, en stubbant $input / $ / console.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

const wf = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'n8n', 'workflow-deck-quotidien.json'), 'utf8')
)
const code = (nom) => wf.nodes.find((n) => n.name === nom).parameters.jsCode

function run(nom, items, amont = {}) {
  const logs = []
  const $input = { all: () => items, first: () => items[0] }
  const $ = (n) => ({ all: () => amont[n] || [] })
  const stubConsole = { log: (m) => logs.push(m), warn: (m) => logs.push(m) }
  const fn = new Function('$input', '$', 'console', '$getWorkflowStaticData', code(nom))
  const out = fn($input, $, stubConsole, () => ({}))
  return { out, logs }
}

const j = (json) => ({ json })
let echecs = 0
const verifie = (titre, condition, detail = '') => {
  console.log(`${condition ? '  ok  ' : 'ECHEC '} ${titre}${detail ? ' — ' + detail : ''}`)
  if (!condition) echecs++
}

// --- Filtre 1 : concordance ---------------------------------------------
console.log('\nFiltre 1 — source primaire ou double confirmation')
{
  const items = [
    j({ title: 'A', link: 'https://blog-inconnu.example/x', sources: ['https://blog-inconnu.example/x'] }),
    j({ title: 'B', link: 'https://www.lemonde.fr/y', sources: ['https://www.lemonde.fr/y', 'https://francetvinfo.fr/y'] }),
    j({ title: 'C', link: 'https://arxiv.org/abs/1706.03762', sources: ['https://arxiv.org/abs/1706.03762'] })
  ]
  const { out } = run('Filtre 1 — concordance', items)
  const gardes = out.map((o) => o.json.title)
  verifie('source unique non primaire écartée', !gardes.includes('A'))
  verifie('deux sources concordantes gardées', gardes.includes('B'))
  verifie('source primaire seule gardée', gardes.includes('C'), 'arxiv.org')
}

// --- Filtre 2 : noms propres --------------------------------------------
console.log('\nFiltre 2 — tout nom propre doit exister dans la source')
{
  const source = {
    json: {
      link: 'https://arxiv.org/abs/x',
      sources: ['https://arxiv.org/abs/x'],
      date: '2026-08-11',
      primaire: true,
      sourceText:
        "Des chercheurs de Google publient une architecture nommée Transformer. Le laboratoire indique que la méthode abandonne la récurrence."
    }
  }
  const rep = (obj) => j({ content: [{ text: JSON.stringify(obj) }] })

  const honnete = rep({ title: 'Google publie le Transformer', body: 'Google publie une architecture nommée Transformer. La méthode abandonne la récurrence.', institution: 'Google' })
  const invente = rep({ title: 'Un nouveau modele est annonce', body: 'Le laboratoire Zylantic annonce le modele Prometheus-9. La methode abandonne la recurrence.', institution: '' })

  const a = run('Filtre 2 — noms propres', [honnete], { Retenir: [source] })
  verifie('carte fidèle à la source conservée', a.out.length === 1)

  const b = run('Filtre 2 — noms propres', [invente], { Retenir: [source] })
  verifie('noms propres inventés écartés', b.out.length === 0, b.logs[0] || '')

  const c = run('Filtre 2 — noms propres', [j({ content: [{ text: '{"rejet":true}' }] })], { Retenir: [source] })
  verifie('REJET du modèle respecté', c.out.length === 0)

  const d = run('Filtre 2 — noms propres', [j({ content: [{ text: 'pas du json' }] })], { Retenir: [source] })
  verifie('réponse illisible écartée', d.out.length === 0)
}

// --- Filtre 3 : chiffres attribués --------------------------------------
console.log('\nFiltre 3 — tout chiffre attribué, titre sous 60 caractères')
{
  const carte = (o) => j({ title: 'Titre court', body: 'Corps.', institution: 'CNIL', date: '2026-08-11', link: 'https://cnil.fr/x', sources: ['https://cnil.fr/x'], ...o })

  const sansChiffre = run('Filtre 3 — chiffres attribués', [carte({ institution: '' })])
  verifie('carte sans chiffre gardée même sans institution', sansChiffre.out.length === 1)

  const chiffreAttribue = run('Filtre 3 — chiffres attribués', [carte({ body: 'Les sanctions atteignent 7 % du chiffre d affaires mondial.' })])
  verifie('chiffre avec institution et date gardé', chiffreAttribue.out.length === 1)

  const chiffreOrphelin = run('Filtre 3 — chiffres attribués', [carte({ body: 'Les sanctions atteignent 7 % du chiffre d affaires mondial.', institution: '' })])
  verifie('chiffre sans institution écarté', chiffreOrphelin.out.length === 0, chiffreOrphelin.logs[0] || '')

  const sansDate = run('Filtre 3 — chiffres attribués', [carte({ body: 'Le montant atteint 35 millions d euros.', date: '' })])
  verifie('chiffre sans date écarté', sansDate.out.length === 0)

  const titreLong = run('Filtre 3 — chiffres attribués', [carte({ title: 'x'.repeat(61) })])
  verifie('titre de 61 caractères écarté', titreLong.out.length === 0)
}

// --- Contrôle : seuil de publication ------------------------------------
console.log('\nAssemblage — seuil de publication')
{
  const carte = (n) => j({ title: 'T' + n, body: 'Corps.', institution: 'CNIL', date: '2026-08-11', link: 'https://cnil.fr/x', sources: ['https://cnil.fr/x'], primaire: true })
  const peu = run('Assembler', [carte(1), carte(2)])
  verifie('2 briefs : publication refusée', peu.out[0].json.suffisant === false)
  const assez = run('Assembler', [1, 2, 3, 4, 5, 6].map(carte))
  verifie('6 briefs : publication acceptée', assez.out[0].json.suffisant === true)
  verifie('format de carte conforme au schéma', assez.out[0].json.briefs.every((b) => b.type === 'brief' && b.payload.title && b.sources.length))
}

// --- Topologie ------------------------------------------------------------
// Le défaut le plus coûteux n'est pas dans le code d'un nœud mais dans le
// câblage : plusieurs RSS branchés directement sur un nœud Code s'exécutent
// une fois par flux, et la déduplication entre sources devient impossible.
console.log('\nTopologie du workflow')
{
  const noms = new Set(wf.nodes.map((n) => n.name))
  const conn = wf.connections
  const cibles = new Set(Object.values(conn).flatMap((v) => (v.main || []).flat().map((c) => c.node)))
  const sortants = new Set(Object.keys(conn))

  const flux = wf.nodes.filter((n) => n.type.endsWith('rssFeedRead')).map((n) => n.name)
  const merges = new Set(wf.nodes.filter((n) => n.type.endsWith('.merge')).map((n) => n.name))
  const fluxDirects = flux.filter((f) =>
    ((conn[f] || {}).main || []).flat().some((c) => !merges.has(c.node))
  )
  verifie(
    'les flux RSS passent par un nœud Merge',
    flux.length < 2 || fluxDirects.length === 0,
    fluxDirects.length ? `branchés en direct : ${fluxDirects.join(', ')}` : ''
  )

  const sansContinue = flux.filter((f) => !wf.nodes.find((n) => n.name === f).continueOnFail)
  verifie('chaque flux RSS tolère une panne', sansContinue.length === 0, sansContinue.join(', '))

  const inconnues = Object.entries(conn).flatMap(([src, v]) =>
    [!noms.has(src) ? src : null, ...(v.main || []).flat().map((c) => (noms.has(c.node) ? null : c.node))].filter(Boolean)
  )
  verifie('toutes les connexions pointent vers un nœud existant', inconnues.length === 0, inconnues.join(', '))

  const orphelins = [...noms].filter((n) => !cibles.has(n) && !sortants.has(n))
  verifie('aucun nœud orphelin', orphelins.length === 0, orphelins.join(', '))

  const webhooks = wf.nodes.filter((n) => n.type.endsWith('.webhook')).map((n) => n.name)
  const webhookEnSortie = webhooks.filter((w) => cibles.has(w))
  verifie(
    'aucun webhook branché en sortie (c’est un déclencheur)',
    webhookEnSortie.length === 0,
    webhookEnSortie.join(', ')
  )

  for (const n of wf.nodes.filter((n) => n.parameters.jsCode)) {
    try {
      new Function(n.parameters.jsCode)
    } catch (e) {
      verifie(`le code de « ${n.name} » est syntaxiquement valide`, false, e.message)
    }
  }
  verifie('exécution en ordre v1', wf.settings?.executionOrder === 'v1')
}

console.log(`\n${echecs === 0 ? 'Tous les contrôles passent.' : echecs + ' contrôle(s) en échec.'}`)
process.exit(echecs ? 1 : 0)
