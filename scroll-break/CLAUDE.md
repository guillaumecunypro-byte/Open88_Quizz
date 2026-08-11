# Scroll Break — instructions de développement

Application personnelle anti-scroll. PWA React. Un utilisateur unique, pas de compte, pas de backend d'état.

## Ce que fait l'application

L'utilisateur ouvre l'app à la place d'un réseau social. Il reçoit un **deck de 25 cartes**, qu'il parcourt par swipe vertical exactement comme un feed. À la 25e, c'est terminé : écran de clôture, l'app le congédie.

Le contenu mêle actualité vérifiée, questions de culture générale, notions expliquées et un feuilleton à épisodes.

## Principes à ne jamais violer

Ces règles priment sur toute optimisation d'expérience utilisateur. Si une demande d'évolution les contredit, signale-le avant d'implémenter.

**R1 — Le deck a une fin.** 25 cartes, compteur visible, écran de clôture. Ne jamais ajouter de chargement infini, de « voir plus », de deck bonus. La finitude est la seule supériorité structurelle sur un feed.

**R2 — Le geste est identique à celui d'un réseau.** Swipe vertical, une carte plein écran, une idée par carte. Pas de menu, pas d'onglets, pas de navigation pendant le deck.

**R3 — Zéro latence perçue.** Le deck est en cache avant l'ouverture. L'app doit être jouable hors ligne. Aucun écran de chargement au démarrage : si le deck n'est pas prêt, afficher celui de la veille.

**R4 — Aucune métrique de vanité.** Pas de badges, de niveaux, de points, de classement. Un seul indicateur : le streak. Toute gamification supplémentaire recrée la boucle dopaminergique que l'app combat.

**R5 — Rien n'est partagé.** Pas de compte, pas de social, pas d'export social. Tout reste en local.

## Architecture

```
src/
  main.jsx              point d'entrée, enregistre le service worker
  App.jsx               orchestration, machine à états du deck
  styles.css            styles globaux, variables CSS
  components/
    Deck.jsx            conteneur scroll-snap vertical
    Cards.jsx           les 5 types de cartes
    Progress.jsx        compteur de position
  hooks/
    useDeck.js          chargement du deck (réseau puis cache puis fallback local)
    useProgress.js      streak, réponses, persistance
  lib/
    storage.js          wrapper localStorage tolérant aux erreurs
    deckBuilder.js      assemblage d'un deck à partir du corpus
content/
  ia-histoire.json      corpus statique, 5 modules
  ia-fonctionnement.json
  ia-idees-recues.json
  ia-reglementaire.json
  feuilleton.json
  briefs-local.json     briefs de secours, remplacés dès que n8n répond
scripts/
  check-deck.js         contrôles du corpus et de l'assemblage — npm run check
n8n/
  workflow-deck-quotidien.json
docs/
  lignes-directrices.md document de conception complet
```

## Composition du deck

Ratio fixe, ordre mélangé. Ne pas modifier sans raison mesurée.

| Type | Nombre | Rôle |
|---|---|---|
| `brief` | 8 | Actualité vérifiée, neutralise l'alibi « je m'informe » |
| `question` | 7 | QCM avec explication obligatoire après réponse |
| `notion` | 5 | Un concept, une définition, un exemple, une erreur fréquente |
| `serial` | 4 | Épisodes du feuilleton, se terminent sur une tension |
| `closing` | 1 | Score, streak, fin |

Contrainte de rédaction : **une carte tient sur un écran de téléphone sans scroll interne**. Si ça déborde, le texte est trop long — on raccourcit le texte, on ne rend pas la carte scrollable.

## Schéma de données

```js
Card = {
  id: string,
  type: 'brief' | 'question' | 'notion' | 'serial' | 'closing',
  theme: string,
  difficulty: 1 | 2 | 3,
  payload: { ... },      // dépend du type, voir content/*.json
  sources: [{ name, url, date }]   // obligatoire pour brief et notion
}

Deck = { date: 'YYYY-MM-DD', cards: Card[], generatedAt: ISO }

Progress = {              // localStorage, clé 'sb:progress'
  streak: number,
  lastPlayed: 'YYYY-MM-DD',
  decksCompleted: number,
  answered: { [cardId]: { correct: boolean, ts: number } }
}
```

## Répétition espacée

Une question ratée doit revenir dans un deck sous 7 jours. La logique vit dans `deckBuilder.js` : au moment de tirer les 7 questions, prioriser celles dont `answered[id].correct === false` et `ts` vieux de plus de 7 jours. C'est ce qui distingue un jeu d'un outil d'apprentissage — ne pas le retirer pour simplifier.

## Alimentation en contenu

Le corpus des modules `question` et `notion` est **statique** : ce sont des faits établis, ils ne changent pas. Il vit dans `content/`.

Les `brief` sont générés chaque nuit par n8n à 5h30 depuis une liste blanche de sources primaires (arXiv, blogs de laboratoires, AFP, Reuters, EUR-Lex, CNIL). Voir `n8n/workflow-deck-quotidien.json`.

**Règle de vérification, non négociable.** Toute carte `brief` passe trois filtres avant publication :
1. Source primaire, ou deux sources secondaires concordantes.
2. Tout nom propre cité doit exister dans la source primaire.
3. Tout chiffre doit être accompagné de l'institution qui le produit et de sa date.

En cas de doute, la carte est écartée. **Un deck de 23 cartes vaut mieux qu'un deck de 25 dont deux sont fausses.** Le web sur l'actualité IA est fortement pollué par du contenu généré : ne jamais alimenter le pipeline par une recherche web ouverte.

## Ordre de développement

**Étape 1 — validation du format.** L'app tourne avec le deck local de `content/`, sans n8n. Objectif : vérifier sur trois semaines d'usage réel que le format tient. Si les sessions durent moins de 90 secondes, le contenu est expédié : augmenter la difficulté avant d'ajouter quoi que ce soit.

**Étape 2 — pipeline.** Brancher n8n, implémenter les trois filtres, vérifier sur trente jours qu'aucune carte fausse ne passe.

**Étape 3 — profondeur.** Répétition espacée complète, feuilleton long, notification matinale unique quand le deck est prêt.

Ne pas inverser. Un pipeline parfait alimentant une app qu'on n'ouvre plus ne sert à rien.

## Conventions techniques

- React 18, hooks uniquement, pas de bibliothèque d'état externe.
- Pas de framework CSS. CSS natif avec variables, dans `styles.css`.
- Le swipe utilise `scroll-snap-type: y mandatory` en CSS natif, pas une bibliothèque de gestes. C'est plus fluide et ça reproduit exactement le comportement d'un feed.
- `localStorage` toujours via `lib/storage.js`, qui avale les exceptions (mode privé Safari).
- Aucun appel réseau bloquant au démarrage.
- Français dans toute l'interface et le contenu ; anglais pour le code et les identifiants.

## Déploiement

Vercel, projet statique. `npm run build`, dossier `dist`. Le webhook n8n est configuré via la variable `VITE_DECK_URL`.

Après déploiement, installer la PWA sur l'écran d'accueil **à l'emplacement exact où se trouvait l'icône du réseau social**. Ce détail n'est pas cosmétique : le geste du pouce est déjà mémorisé, on le détourne au lieu de le combattre.
