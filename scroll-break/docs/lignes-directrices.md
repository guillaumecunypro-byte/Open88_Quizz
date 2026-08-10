# Application anti-scroll — Lignes directrices

Document de conception. Version 1, août 2026.
Usage personnel, PWA, pas d'interception : l'utilisateur vient de lui-même.

---

## Partie 1 — Lignes directrices

### 1.1 Principe fondateur

L'application ne lutte pas contre le scroll. Elle **occupe le même geste avec une charge cognitive différente**.

Le réflexe visé n'est pas « je décide d'apprendre » mais « j'ai trente secondes de vide, mon pouce cherche quelque chose ». C'est ce réflexe-là qu'il faut capter. Toute décision de conception qui suppose une intention consciente de l'utilisateur est une décision fausse.

### 1.2 Les cinq règles non négociables

**R1 — Le deck a une fin.**
25 cartes, un compteur visible en permanence, un écran de clôture. C'est la seule supériorité structurelle sur un feed infini : la satisfaction d'avoir terminé. Ne jamais ajouter de « charger plus ».

**R2 — Le geste est identique.**
Swipe vertical, cartes plein écran, une idée par carte. On ne change pas le geste, on change ce qu'il révèle. Aucun menu, aucun onglet, aucune navigation avant la fin du deck.

**R3 — Zéro latence perçue.**
Le deck du lendemain est téléchargé et mis en cache la veille. L'application doit s'ouvrir et être jouable hors ligne, instantanément. Trois secondes de chargement suffisent à faire basculer vers Instagram.

**R4 — Aucune métrique de vanité.**
Pas de badges, pas de niveaux, pas de points d'expérience, pas de classement. Un seul indicateur conservé : le streak (jours consécutifs). Toute gamification supplémentaire recrée la machine à dopamine dont l'application est censée sortir.

**R5 — Rien n'est publié, rien n'est partagé.**
Pas de compte, pas de social, pas de partage. Le contenu reste local. C'est ce qui différencie structurellement l'app d'un réseau.

### 1.3 Anatomie du deck

Un deck quotidien = 25 cartes, ordre mélangé mais ratio fixe.

| Type | Nb | Durée | Rôle |
|---|---|---|---|
| Brief | 8 | 15 s | Neutralise l'alibi « je scrolle pour m'informer » |
| Question | 7 | 20 s | Effort actif, ancrage mémoriel |
| Notion | 5 | 20 s | Un concept expliqué, sans quiz |
| Feuilleton | 4 | 30 s | Épisode coupé sur cliffhanger, rétention J+1 |
| Clôture | 1 | — | Score, streak, fin |

Le ratio compte davantage que le contenu lui-même. Sept questions d'affilée transforment la session en examen ; huit briefs d'affilée la transforment en scroll passif. L'alternance forcée est ce qui rend la session tenable.

### 1.4 Format des cartes

**Contrainte dure : une carte tient sur un écran de téléphone sans défilement interne.** Si le texte déborde, il est trop long — c'est une contrainte de rédaction, pas de mise en page.

- Brief : titre (max 60 caractères), 2 phrases, source nommée, date.
- Question : énoncé, 4 options, puis révélation avec une explication de 2 phrases. L'explication est obligatoire : sans elle, une réponse fausse n'apprend rien.
- Notion : un terme, une définition en une phrase, un exemple concret, une erreur fréquente à éviter.
- Feuilleton : 120 à 180 mots, se termine sur une tension non résolue.

### 1.5 Modèle de données

```
Card {
  id, type, theme, difficulty (1-3), createdAt,
  payload,          // structure selon le type
  sources[]         // obligatoire pour brief et notion
}

Deck {
  date, cards[25], generatedAt, pipelineVersion
}

Progress {              // localStorage
  streak, lastPlayed, decksCompleted,
  answered: { cardId: { correct, ts } },
  serialPosition         // avancement dans le feuilleton
}
```

Une seule subtilité : conserver l'historique des réponses permet la **répétition espacée**. Une question ratée revient dans un deck sous 7 jours, sous une formulation différente. C'est ce qui transforme un divertissement en apprentissage réel.

### 1.6 Stack

- **PWA React + Vite**, déployée sur Vercel. Installée sur l'écran d'accueil, plein écran, à l'emplacement exact où se trouvait l'icône du réseau social.
- **Service worker** : cache du deck, fonctionnement hors ligne total.
- **localStorage** pour la progression. Pas de base de données, pas de compte, pas de backend d'état.
- **n8n (VPS Hostinger)** : génération nocturne du deck, exposition par webhook GET.

### 1.7 Critère d'échec

Si au bout de trois semaines les sessions durent moins de 90 secondes, le contenu est expédié en pilote automatique et l'application ne sert à rien. Le correctif n'est jamais d'ajouter des fonctionnalités : c'est d'augmenter la densité du contenu (questions plus difficiles, briefs plus techniques).

---

## Partie 2 — Alimentation en nouveautés

### 2.1 Le problème central

Vérification faite en août 2026 : **le web francophone sur l'actualité IA est massivement pollué**. Les premiers résultats de recherche générique contiennent des modèles qui n'existent pas, des classements inventés et des chiffres non sourcés, produits en masse pour le référencement.

Conséquence directe : une chaîne « recherche web → résumé par LLM → carte » produit un corpus faux avec une apparence de crédibilité. C'est le pire résultat possible, puisque l'objectif est précisément d'apprendre des choses justes.

**Le pipeline doit être bâti sur des sources primaires en liste blanche, jamais sur une recherche ouverte.**

### 2.2 Liste blanche de sources

**Recherche et technique (primaire)**
- arXiv, catégories cs.AI, cs.CL, cs.LG — flux Atom natif
- Blogs de laboratoires : Anthropic, Google DeepMind, Meta AI, Mistral, Allen Institute
- Papers with Code, Hugging Face (annonces de modèles)

**Actualité générale**
- AFP via France Info, Le Monde, Les Échos (RSS)
- Reuters, Associated Press (fils en anglais, plus rapides et moins réécrits)
- Hacker News, filtré sur un seuil de points

**Institutionnel et juridique**
- Journal officiel de l'UE, EUR-Lex
- CNIL, ANSSI, Bureau européen de l'IA
- Légifrance (via le connecteur Openlegi déjà en place)

**Culture générale et science**
- Nature, Science (résumés en accès libre)
- INSEE, Eurostat pour les données chiffrées

### 2.3 Règle de vérification

Toute carte de type Brief passe trois filtres avant publication :

1. **Source primaire ou double confirmation.** Un fait issu d'une seule source secondaire est rejeté, sans exception.
2. **Le nom propre est vérifiable.** Un modèle, une entreprise, une personne citée doit exister dans la source primaire. C'est le filtre qui aurait éliminé les faux modèles rencontrés en recherche.
3. **Le chiffre est attribué.** Un pourcentage sans institution nommée et sans date est supprimé de la carte, pas reformulé.

En cas de doute, la carte est écartée. Un deck de 23 cartes est préférable à un deck de 25 dont deux sont fausses.

### 2.4 Workflow n8n

Exécution quotidienne à 5h30.

```
1. Collecte
   Nœuds RSS parallèles sur la liste blanche → agrégation
   Fenêtre : dernières 24 h

2. Déduplication
   Regroupement par similarité de titre
   Un même événement couvert par 4 sources = 1 item, 4 sources

3. Sélection
   Appel Claude : classer les items par importance et durabilité
   Critère : « ce fait aura-t-il encore un sens dans six mois ? »
   Sortie : 8 items retenus

4. Rédaction
   Un appel par item, prompt strict :
   - 2 phrases maximum
   - aucun adjectif d'appréciation
   - tout chiffre accompagné de sa source
   - si l'information est incertaine, renvoyer REJET

5. Questions
   Génération de 7 QCM à partir du corpus statique (partie 3)
   + réinjection des questions ratées de plus de 7 jours

6. Assemblage
   Mélange selon le ratio, ajout du feuilleton et des notions
   Écriture JSON, exposition par webhook

7. Contrôle
   Si moins de 20 cartes valides : conservation du deck de la veille
   et notification d'alerte
```

Coût estimé : environ 0,20 € par jour en API. Négligeable.

### 2.5 Le feuilleton

C'est le seul élément à écrire à l'avance et à la main. Une histoire de 60 à 80 épisodes (soit 4 à 5 mois à raison de 4 épisodes par jour), rédigée en amont plutôt que générée quotidiennement.

Raison : un récit généré au jour le jour n'a pas d'architecture. Les retournements ne fonctionnent que si la structure est connue depuis le début. Un LLM peut aider à rédiger les épisodes, mais le plan doit être fixé et immuable.

Suggestion thématique : une histoire romancée d'un épisode réel de l'histoire des sciences ou de l'IA — l'hiver de l'IA vu depuis un laboratoire, le pari d'AlexNet, la conférence de Dartmouth. Le feuilleton devient alors lui-même un vecteur d'apprentissage.

---

## Partie 3 — Bloc IA

Corpus de base, vérifié. Il alimente les cartes Question et Notion. Contrairement aux Briefs, ce corpus est **statique et stable** : ce sont des faits établis, pas de l'actualité.

### 3.1 Module Histoire

**Les fondations (1943–1956)**

- 1943 — Warren McCulloch et Walter Pitts publient un modèle mathématique du neurone : le neurone formel. C'est l'acte de naissance des réseaux de neurones artificiels, quinze ans avant le premier ordinateur capable de les faire tourner.
- 1950 — Alan Turing publie « Computing Machinery and Intelligence » dans la revue *Mind*. Il y écarte la question « les machines peuvent-elles penser ? » comme mal posée, et lui substitue le jeu de l'imitation, connu depuis sous le nom de test de Turing.
- 1956 — Conférence de Dartmouth, organisée par John McCarthy, Marvin Minsky, Nathaniel Rochester et Claude Shannon. C'est McCarthy qui forge l'expression *artificial intelligence*, choisie notamment pour se démarquer de la cybernétique de Norbert Wiener.

**L'optimisme et sa chute (1957–1980)**

- 1957 — Frank Rosenblatt conçoit le Perceptron, premier réseau de neurones capable d'apprendre par ajustement de poids.
- 1966 — Joseph Weizenbaum crée ELIZA, qui simule un psychothérapeute par simple reformulation. Weizenbaum est troublé de voir des utilisateurs lui prêter une compréhension réelle : c'est la première observation documentée de ce qu'on appelle aujourd'hui l'effet ELIZA.
- 1969 — Minsky et Papert publient *Perceptrons*, démontrant qu'un perceptron à une couche ne peut pas résoudre la fonction XOR. L'ouvrage est souvent tenu pour responsable de l'arrêt des financements sur les réseaux de neurones pendant une décennie.
- 1974–1980 — Premier hiver de l'IA. Les promesses de traduction automatique et de raisonnement général ne se matérialisent pas ; les crédits publics sont coupés au Royaume-Uni et aux États-Unis.

**Systèmes experts et second hiver (1980–1993)**

- Années 1980 — Essor des systèmes experts, fondés sur des règles écrites par des humains. MYCIN diagnostique des infections bactériennes, XCON configure des ordinateurs pour Digital Equipment. Ils fonctionnent, mais coûtent cher à maintenir et ne généralisent pas.
- 1986 — Rumelhart, Hinton et Williams popularisent la rétropropagation du gradient, qui permet d'entraîner des réseaux à plusieurs couches. La méthode existait auparavant sous d'autres formes, mais c'est cette publication qui la diffuse.
- 1987–1993 — Second hiver. Le marché des machines LISP s'effondre, les systèmes experts déçoivent.

**Le retour par la donnée (1997–2016)**

- 1997 — Deep Blue bat Garry Kasparov en match. La machine ne « comprend » rien aux échecs : elle explore des millions de positions par seconde. C'est une victoire de la force de calcul, pas de l'apprentissage.
- 2012 — AlexNet, de Krizhevsky, Sutskever et Hinton, remporte le concours ImageNet avec une marge inédite. Trois ingrédients convergent : de grandes bases de données annotées, des GPU, et des réseaux de neurones profonds. C'est le point de bascule du deep learning.
- 2014 — Ian Goodfellow propose les GAN (réseaux antagonistes génératifs) : deux réseaux s'entraînent l'un contre l'autre, l'un générant, l'autre discriminant.
- 2016 — AlphaGo bat Lee Sedol 4 parties à 1. Le coup 37 de la deuxième partie, jugé aberrant par les commentateurs, se révèle décisif. Il illustre qu'un système peut découvrir des stratégies absentes du répertoire humain.

**L'ère des transformeurs (2017–aujourd'hui)**

- 2017 — Publication de « Attention Is All You Need » par une équipe de Google. L'architecture Transformer abandonne la récurrence au profit du seul mécanisme d'attention, ce qui rend l'entraînement massivement parallélisable. C'est l'article fondateur de tout ce qui suit.
- 2018 — BERT (Google) et GPT-1 (OpenAI) appliquent le Transformer au langage, chacun dans une direction différente : compréhension pour l'un, génération pour l'autre.
- 2020 — GPT-3, 175 milliards de paramètres, démontre l'apprentissage en contexte : le modèle exécute une tâche à partir de quelques exemples dans la requête, sans réentraînement.
- 2020 — AlphaFold 2 résout pour l'essentiel le problème du repliement des protéines lors du concours CASP14, après cinquante ans de blocage.
- Novembre 2022 — ChatGPT. La rupture n'est pas technique mais d'interface : elle rend une technologie existante accessible à tous.
- 2024 — Le prix Nobel de physique est décerné à John Hopfield et Geoffrey Hinton pour leurs travaux fondateurs sur les réseaux de neurones ; le prix Nobel de chimie à Demis Hassabis et John Jumper (AlphaFold) ainsi qu'à David Baker.
- 2024–2026 — Trois axes dominent : les modèles de raisonnement, qui produisent une chaîne de réflexion avant de répondre ; les agents, capables d'enchaîner des actions et d'utiliser des outils ; et la standardisation des connexions aux données externes, notamment via le protocole MCP publié par Anthropic fin 2024.

### 3.2 Module Fonctionnement

**Tokens.** Un modèle ne lit pas des mots mais des tokens — des fragments de texte. « Bonjour » est un token, « anticonstitutionnellement » en compte plusieurs. C'est pourquoi un modèle peut échouer à compter les lettres d'un mot : il ne les voit pas individuellement.

**Embeddings.** Chaque token est converti en un vecteur de plusieurs milliers de dimensions. Les mots de sens proche occupent des positions proches dans cet espace. C'est ce qui permet de manipuler du sens par des opérations arithmétiques.

**Attention.** Pour chaque token, le modèle calcule un poids d'importance vis-à-vis de tous les autres tokens du contexte. Dans « la clé de la voiture qu'il avait garée hier », c'est l'attention qui rattache « garée » à « voiture » et non à « clé ». C'est le mécanisme central du Transformer.

**Entraînement en trois temps.**
1. *Pré-entraînement* : le modèle apprend à prédire le token suivant sur un très grand corpus. Il n'apprend aucune tâche particulière, seulement la structure statistique du langage.
2. *Ajustement supervisé* : on lui montre des exemples de bonnes réponses à des instructions.
3. *Apprentissage par renforcement à partir de retours* : des préférences humaines ou automatisées orientent le comportement vers l'utilité et l'innocuité.

**Inférence.** Générer une réponse est un processus token par token : à chaque étape le modèle produit une distribution de probabilités sur le vocabulaire, et en tire un token. La température règle le degré d'aléa de ce tirage.

**Pourquoi les hallucinations existent.** Un modèle est optimisé pour produire une suite plausible, pas pour dire vrai. Quand il ignore un fait, rien dans son objectif ne le pousse à s'abstenir : il génère ce qui ressemble le plus à une réponse. C'est une propriété du mécanisme, pas un défaut d'implémentation — ce qui explique qu'on la réduise sans l'éliminer.

**Fenêtre de contexte.** C'est la quantité de texte que le modèle peut prendre en compte simultanément. Au-delà, l'information est perdue. Le modèle n'a aucune mémoire entre deux conversations : tout ce qui ressemble à un souvenir est du texte réinjecté dans le contexte.

**RAG.** La génération augmentée par récupération consiste à chercher des documents pertinents et à les injecter dans le contexte avant de répondre. Cela ne modifie pas le modèle : cela lui fournit une documentation à consulter.

**Fine-tuning.** Réentraîner un modèle existant sur des données spécifiques. Utile pour un format ou un style ; inefficace pour ajouter des connaissances factuelles, où le RAG est préférable.

**Distinction utile.** Un modèle plus grand n'est pas mécaniquement meilleur. Depuis 2022, la qualité des données et les méthodes d'entraînement expliquent une part croissante des écarts de performance, à taille comparable.

### 3.3 Module Réglementaire et sociétal

**AI Act — Règlement (UE) 2024/1689.** Premier cadre juridique mondial dédié à l'IA. Adopté le 13 juin 2024, entré en vigueur le 1er août 2024. Il classe les usages en quatre niveaux : risque inacceptable (interdit), haut risque (obligations strictes), risque limité (transparence), risque minimal (aucune obligation spécifique).

**Calendrier au 10 août 2026.**
- Depuis février 2025 : interdictions applicables (notation sociale, manipulation), ainsi que l'obligation de maîtrise de l'IA par le personnel.
- Depuis août 2025 : obligations pour les modèles à usage général (GPAI).
- Depuis le 2 août 2026 : obligations de transparence de l'article 50 et pouvoirs de sanction des autorités.
- Le paquet Digital Omnibus a reporté les obligations haut risque de l'annexe III au 2 décembre 2027, et celles de l'annexe I au 2 août 2028.
- Sanctions : jusqu'à 35 M€ ou 7 % du chiffre d'affaires mondial pour les pratiques interdites.

*Note : ce module évolue. Il doit être révisé trimestriellement, contrairement au reste du corpus.*

**Notions à couvrir également.** Biais algorithmiques et leur origine dans les données ; coût énergétique de l'entraînement et de l'inférence ; question du droit d'auteur sur les données d'entraînement ; deepfakes et obligations de marquage ; distinction entre IA générative et IA prédictive, cette dernière étant très majoritaire dans les usages industriels réels.

### 3.4 Module Idées reçues

Format idéal pour les cartes Question : l'énoncé propose l'idée reçue, la révélation la corrige.

| Idée reçue | Réalité |
|---|---|
| L'IA « comprend » ce qu'elle dit | Elle modélise des régularités statistiques ; la question de la compréhension reste philosophiquement ouverte et empiriquement indécidée |
| Le modèle apprend de mes conversations en temps réel | Non. Les poids sont figés après entraînement. Les données peuvent servir à un entraînement futur, ce qui est un autre sujet |
| Plus de paramètres = meilleur modèle | Faux depuis 2022. Données et méthode d'entraînement pèsent au moins autant |
| L'IA est objective car mathématique | Elle reproduit les biais de ses données d'entraînement et de ses évaluateurs |
| Une IA générale est imminente | Aucun consensus scientifique. Les estimations d'experts s'étalent sur plusieurs décennies et divergent radicalement |
| ChatGPT a inventé l'IA | L'IA a soixante-dix ans ; ChatGPT est une interface sur une technologie de 2017 |

### 3.5 Volumétrie cible

| Module | Cartes visées | Fréquence de révision |
|---|---|---|
| Histoire | 60 | Annuelle |
| Fonctionnement | 45 | Annuelle |
| Réglementaire | 30 | Trimestrielle |
| Idées reçues | 25 | Annuelle |
| **Total IA** | **160** | |

À raison de 5 cartes IA par deck, cela représente environ un mois sans répétition — durée suffisante pour que la répétition espacée devienne un atout plutôt qu'une lassitude.

Les autres thèmes (histoire générale, sciences, géographie, économie) suivent la même structure, avec une volumétrie comparable.

---

## Partie 4 — Mise en œuvre

**Étape 1.** PWA avec un deck codé en dur de 25 cartes, dont 10 issues du corpus IA. Objectif : vérifier que le format tient trois semaines.

**Étape 2.** Workflow n8n de collecte et de rédaction, avec les trois filtres de vérification. Objectif : vérifier qu'aucune carte fausse ne passe sur trente jours.

**Étape 3.** Répétition espacée, feuilleton, notification matinale unique.

Ne pas inverser l'ordre. La qualité du pipeline ne sert à rien si le format ne tient pas ; et un format qui tient avec du contenu faux est pire que pas d'application du tout.
