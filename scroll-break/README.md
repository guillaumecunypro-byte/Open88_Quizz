# Scroll Break

Application personnelle anti-scroll. On ouvre l'app à la place d'un réseau social : elle sert un deck de 25 cartes — actualité vérifiée, questions de culture générale, notions expliquées, feuilleton — puis elle s'arrête.

Le pari est simple : ne pas combattre le geste, mais l'occuper autrement. Le scroll infini n'a pas de fin ; ce deck en a une, et c'est sa seule supériorité structurelle.

## Démarrer

```bash
npm install
npm run dev
```

L'application tourne immédiatement avec le corpus local de `content/`. Aucune configuration requise pour l'étape 1.

## Configuration

| Variable | Rôle |
|---|---|
| `VITE_DECK_URL` | Webhook n8n servant le deck du jour. Sans elle, le deck est assemblé localement. |

## Structure

```
CLAUDE.md      instructions de développement — à lire en premier
docs/          document de conception complet
src/           application React
content/       corpus statique (histoire, fonctionnement, réglementaire, feuilleton)
n8n/           workflow de génération quotidienne des briefs
```

## Règles du projet

Cinq principes priment sur toute optimisation d'expérience : le deck a une fin, le geste reste celui d'un feed, aucune latence perçue, aucune métrique de vanité, rien n'est partagé. Le détail figure dans `CLAUDE.md`.

Sur le contenu, une règle prime sur toutes : **un deck de 23 cartes vaut mieux qu'un deck de 25 dont deux sont fausses.** Le web sur l'actualité IA est fortement pollué par du contenu généré — le pipeline ne s'alimente jamais par recherche ouverte, uniquement par liste blanche de sources primaires.

## État

Étape 1 : validation du format sur corpus local. Le pipeline n8n (étape 2) n'est branché qu'une fois le format éprouvé sur trois semaines d'usage réel.
