# Plan — lot de fonctionnalités n°2

Chaque écran existe en **deux thèmes** : `notion` (sobre, `PageHeader`, bordures `line`) et `journal`
(`JournalTitle`, lavande `#A3A8EE` / encre `#2F2B6E`, police `font-plate`, ombres décalées).
Toute nouvelle UI passe par `useTheme()` et réutilise `Segmented`, `PanelCard`, `ProgressBar`, `journalMenuClass`.

Ordre d'implémentation : le modèle de données d'abord (7, 9), puis ce qui en dépend.

---

## 0. Modèle de données et migration (socle)

- `Task` : `urgent?: boolean`, `important?: boolean` (absent = « pas encore classée »). `doneAt` existe déjà.
- `Slot` : `done?: boolean` (créneau coché, tâches étalées).
- `DataState.trash: TrashItem[]` (voir 9).
- `Settings` :
  - `colorMode: 'category' | 'eisenhower'` + `eisenhowerColors: { q1, q2, q3, q4 }` (12)
  - `pomodoro: { workMin, shortBreakMin, longBreakMin, cyclesBeforeLong, sound }` (2)
  - `mascot: { idle: string[], clickTodo: string[], clickDone: string[], clickEmpty: string[] }` (3)
- `DataState.pomodoroSessions: { id, taskId?, startedAt, minutes }[]` (2)
- Persist `version: 5` : migration qui remplit les valeurs par défaut.
- Seed : quelques tâches avec urgence et priorité, quelques `doneAt` étalés sur 30 jours (courbe du bilan).

## 7. Urgence + date de fin

- Fiche tâche (`TaskPropertyFields`) : propriété **Urgence** (Vide / Urgent / Pas urgent), en sélecteur façon Notion
  (étiquette colorée), comme la **Priorité**. L'importance n'est pas un champ : priorité haute ou moyenne = importante,
  basse = pas importante, aucune = non classée.
- `doneAt` : mis à jour à **chaque** passage fait ↔ non fait, quel que soit le chemin
  (case de la fiche, calendrier, liste catégories, cocher le dernier créneau). Centralisé dans un helper `setDone(task, done)`.
- Propriété en lecture seule « Terminée le … » dans la fiche quand la tâche est faite.

## 9. Poubelle (30 jours)

- `TrashItem = { id, kind: 'task' | 'category' | 'subcategory', deletedAt, task? , category?, subcategories?, links? }`
  - catégorie : on garde la catégorie, ses sous-catégories et, pour chaque tâche, ses liens d'avant (pour les recréer).
- `deleteTask / deleteCategory / deleteSubcategory` mettent dans la poubelle (le `withUndo` reste).
  Exception : annulation d'une création rapide (titre vide) = suppression définitive.
- Actions store : `restoreTrash(id)`, `purgeTrash(id)`, `emptyTrash()`, purge auto des éléments > 30 jours (au chargement).
- Restaurer une sous-catégorie dont la catégorie est aussi dans la poubelle → restaure la catégorie parente.
- Page `/trash` + entrée « Poubelle » dans les deux menus latéraux : liste (type, nom, supprimé il y a…, jours restants),
  boutons Restaurer / Supprimer définitivement / Vider la poubelle.

## 10. Tâche simple → habitude

- Dans la fiche, à côté de « Transformer en tâche étalée » : **Transformer en habitude**.
- Récurrence déduite du créneau : jour de la semaine du créneau, date de début = ce jour (ou aujourd'hui),
  heure + durée si créneau horaire. Les créneaux sont vidés, `done` remis à faux (avec confirmation).

## 5. Cocher un créneau (tâche étalée)

- Fiche d'une tâche étalée : case à cocher devant chaque créneau.
- Règle : `task.done` ⇔ tous les créneaux cochés. Cocher le dernier créneau termine la tâche (`doneAt`) ;
  cocher la tâche entière coche tous les créneaux, la décocher les décoche tous.
- Le calendrier garde sa règle actuelle (la case d'une entrée étalée coche toute la tâche).

## 6. Barre de progression dans la fiche

- Juste au-dessus du titre de la fiche :
  - sous-tâches présentes → progression des sous-tâches ;
  - sinon tâche étalée avec créneaux → progression des créneaux cochés.
- Réutilise `ProgressBar` (style selon thème/réglage) + libellé `x / y`. Couleur = couleur de la tâche.
- Logique dans `domain/progress.ts` : `taskProgress(task, color)` (testée).

## 4. Couleurs prédéfinies

- `ColorPicker` : rangée de **7 couleurs prédéfinies** (rouge, orange, jaune, vert, bleu, violet, rose) en grandes pastilles,
  puis section « Couleur personnalisée » (roue, HEX, pipette), toujours accessible.
  Ouverte automatiquement si la couleur actuelle n'est pas une des 7.
- Vaut pour tous les formulaires qui l'utilisent (catégorie, sous-catégorie, événement, paramètres, couleurs Eisenhower).

## 1. Style de toutes les catégories d'un coup

- Page Catégories, en-tête (Notion et Journal, quel que soit l'affichage Notion / Cartes / Pixel) :
  bouton **Style des tâches** → popover avec les 3 aperçus (Label / Fond / Bordure, comme dans le `ColorPicker`).
- Action store `setAllStyleTargets(target)` : applique à toutes les catégories et sous-catégories, avec « Annuler ».

## 12. Couleur des tâches : catégories ou Eisenhower

- Paramètres → Apparence : « Couleur des tâches » `Catégories | Matrice d'Eisenhower` + 4 couleurs
  (urgent & important, important pas urgent, urgent pas important, ni l'un ni l'autre).
- `resolveTaskStyle` reçoit le réglage (via `Lookup.settings`) : en mode Eisenhower, couleur = quadrant,
  présentation = celle de la catégorie (fond par défaut), icône inchangée ; tâche non classée → style neutre.

## 8. Vue matrice d'Eisenhower (calendrier)

- Route `/calendar/matrix`, entrée « Matrice » sous Calendrier (deux menus) et dans le sélecteur Mois / Semaine / Jour.
- Période au choix **Jour / Semaine / Mois** + navigation (précédent / aujourd'hui / suivant), mémorisée dans `prefs`.
- 4 quadrants (couleurs du réglage 12) avec les tâches simples et étalées ayant un créneau dans la période
  (dédoublonnées), cochables, ouvrables.
- Panneau droit **« À classer »** (comme « Non planifiées ») : tâches de la période sans urgence ou sans priorité.
- Glisser-déposer (`@dnd-kit`) d'un quadrant à l'autre ou depuis le panneau → règle `urgent` / `important`.
- Logique pure `domain/eisenhower.ts` : `quadrantOf(task)`, `matrixTasks(data, range)` (testée).

## 11. Bilan enrichi

- Nouvelle carte « Statistiques » (Notion et Journal) :
  tâches complétées (total + 30 derniers jours), catégories, sous-catégories, projets, projets terminés
  (projet dont toutes les tâches, au moins une, sont faites).
- **Courbe de complétion** : tâches terminées par jour sur les 30 derniers jours (à partir de `doneAt`), SVG maison.
- Logique dans `domain/stats.ts` (testée).

## 2. Pomodoro

- Page `/pomodoro` + entrée de menu (deux thèmes).
- Minuteur travail / pause courte / pause longue, cycles avant la pause longue ; démarrer / pause / passer / réinitialiser.
- Tâche liée facultative (choix parmi les tâches non faites), compteur de pomodoros du jour.
- État du minuteur dans un store dédié persistant (`endsAt` horodaté) → continue en changeant de page ;
  petit badge du temps restant à côté de l'entrée de menu quand il tourne.
- Fin de phase : son court (Web Audio, désactivable) + toast ; chaque session de travail terminée est enregistrée.
- Réglages des durées sur la page même.

## 3. Personnaliser la mascotte

- Page `/mascot` + entrée de menu.
- 4 listes de phrases éditables (ajout / suppression / modification) :
  au repos, au clic s'il reste des tâches, au clic quand tout est fait, au clic quand rien n'est prévu.
- Codes insérables (boutons « + {code} ») : `{prenom}`, `{restantes}`, `{faites}`, `{total}`, `{evenements}`,
  `{habitudes}`, `{prochaine}` (prochaine tâche à heure fixe), `{heure}`, `{jour}`, `{pomodoros}`.
- Aperçu en direct avec les vraies valeurs du jour ; bouton « Remettre les phrases par défaut ».
- `domain/mascot.ts` : `mascotContext(data, now)` + `fillTemplate(text, ctx)` (testés). `Mascot.tsx` les utilise.

---

## Vérification

- `npm run typecheck`, `npm test` (nouveaux tests : eisenhower, stats, progression de tâche, gabarits mascotte, poubelle).
- Contrôle visuel des deux thèmes sur chaque écran touché.
