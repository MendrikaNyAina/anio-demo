# Mon calendrier — démo UI/UX

Démo front de l'application décrite dans [../calendrier.md](../calendrier.md), construite selon [../plan-demo.md](../plan-demo.md).
Aucun backend : les données sont fictives et restent dans le navigateur (`localStorage`).

## Lancer

```bash
npm install
npm run dev        # http://localhost:5173
```

Autres scripts : `npm test` (tests de la logique métier), `npm run typecheck`, `npm run build`.

Prérequis : Node 20.11+ (Vite est fixé en v6 pour rester compatible avec cette version).

## Ce qu'on peut essayer

- **Calendrier semaine** : double-clic ou rectangle à la souris pour créer, glisser / redimensionner,
  « ⋯ » dans la ligne « Journée » pour le panneau persistant, glisser une tâche « non planifiée » dans la grille,
  clic droit sur une entrée (supprimer un créneau / toute la tâche, ou une habitude à partir d'aujourd'hui).
- **Mois** : « + » au survol d'une case, déplacer une tâche d'un jour à l'autre (l'heure est gardée).
- **Catégories** : clic droit ou « ⋯ » sur une ligne, glisser la poignée à gauche pour réordonner,
  « Nouvelle tâche » puis cocher : la ligne attend 10 s avant de descendre.
  Le sélecteur **Affichage** (en haut à droite) compare trois styles avec les mêmes données et actions :
  Notion, Cartes douces (inspiration `2.jpg`) et Pixel kawaii (`3.jpg`, une catégorie masquée du calendrier y passe en style « offline »).
- **Notion** (simulé) : « Intégrer une base Notion » en bas du menu du calendrier ;
  Paramètres → « Simuler une erreur réseau Notion » pour voir le retour arrière.
- **Paramètres** : comparer l'état coché « Ternie / Hachurée » et l'ouverture des tâches « Panneau / Fenêtre ».
- **Matrice** (Calendrier → Matrice) : tâches de la période (jour / semaine / mois) par urgence × importance,
  à glisser d'un quadrant à l'autre ; les tâches non classées attendent dans « À classer ».
- **Pomodoro** : minuteur concentration / pauses, tâche liée, compteur du jour ; il continue en changeant de page.
- **Mascotte** : phrases personnalisables avec des codes (`{restantes}`, `{prenom}`…).
- **Poubelle** : tâches et catégories supprimées, restaurables pendant 30 jours.
- Catégories → **Style des tâches** : label / fond / bordure pour toutes les catégories d'un coup.
- Paramètres → **Couleur des tâches** : par catégorie ou par quadrant d'Eisenhower (4 couleurs).
- Menu du compte (en haut à gauche) → **Réinitialiser la démo** pour revenir aux données de départ.

## Organisation du code

```
src/
├─ domain/      logique métier pure et testée (réutilisable dans le vrai projet)
├─ store/       état : données (appStore, sauvegardé) + interface (uiStore, éphémère)
├─ mock/        données de démo et faux espace Notion
├─ components/  composants partagés (CalendarEntry, ColorPicker, TaskForm…) et ui/ (bases Radix)
└─ features/    écrans : calendar, categories, events, icons, bilan, settings, notion, layout, auth
```
