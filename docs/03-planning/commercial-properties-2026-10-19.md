# Locaux commerciaux — exécution D40

Date : 2026-10-19. C02/C04, BR-25/26, AT-31. Décision propriétaire : ajouter les locaux commerciaux aux biens. Cette tranche emploie la clé stable `commercial` et le libellé français « Local commercial » ; aucune donnée réelle n'est créée, et aucune nouvelle règle de stock, champ métier ou autorisation n'est introduite.

## Critères observables

- Un responsable peut créer un local commercial indépendant, un programme commercial ou mixte, un type commercial et une unité commerciale directement rattachée ou structurée ; un agent ne gagne aucun droit d'écriture.
- La catégorie apparaît dans les formulaires, listes, filtres/facettes, cartes, offres et critères de recherche, sans retirer les quatre catégories existantes.
- Les contraintes SQL acceptent `commercial` sur les quatre emplacements concernés ; une migration depuis 0027 préserve les biens existants et refuse un retour qui perdrait des données commerciales.
- Les écrans restent français, responsive et utilisent les composants/tokens KAY existants. Aucun changement de grille ou de navigation n'est prévu.

## Implémentation et déploiement

La migration additive 0028 élargit les contraintes de `property`, `development`, `unit_type` et `requirement_criterion`. L'API garde les mêmes endpoints, droits, pages numérotées et sémantique de facettes. La façade Next utilise les contrats partagés : les menus, filtres et cartes héritent automatiquement du nouveau libellé.

En production, 0028 doit précéder l'usage de la nouvelle catégorie. Vérifier le head et la cible de la base, effectuer une sauvegarde contrôlée selon le runbook de production, appliquer 0028 sur la base autorisée, puis déployer/vérifier le backend et le frontend de la même version. La PR seule ne migre pas une base distante. Aucun accès ni migration de production n'est autorisé par cette exécution locale.

## Vérification

- Le premier essai des tests PostgreSQL a échoué sur la contrainte 0027 de la base de test ; l'inspection a confirmé `environment=test`, base `kayrealestate_test`, OID 109061 et head 0027. Mise à niveau 0028 uniquement de cette base isolée, puis relance : 77 tests ciblés passent en 103,31 s.
- 72 tests unitaires frontend, TypeScript, Ruff, format, mypy, ESLint et build passent. L'audit des dépendances : zéro vulnérabilité runtime ; l'exception temporaire déjà approuvée couvre neuf alertes de développement. Les deux scénarios Chrome visibles passent : création/filtrage commercial (42,3 s) et répertoire de référence avec les cinq cases (1,2 min). Les captures synthétiques `frontend/output/playwright/projects-reference/desktop.png` et `mobile-filters.png` ont été ouvertes : rail, carte, badge orange, label et cible tactile sont lisibles sans débordement visible.
- La première régression backend complète s'arrête à 241 succès/3 échecs : deux tests de fichiers faute de ClamAV local, puis un contrôle Alembic qui révèle la dérive préexistante de 0027 (colonnes/index Lead/Deal absents des modèles ORM). Après démarrage du conteneur ClamAV sain, les deux tests de fichiers repassent (2/2). Une seconde passe, excluant seulement le premier contrôle Alembic connu, atteint 556 succès puis s'arrête à trois autres tests qui font le même `alembic check` (un test exclu). Ce n'est pas une régression complète verte et le défaut 0027 ne sera pas masqué en modifiant les tests. L'intégration hébergée sur la révision finale reste à faire ; la PR reste brouillon.
- Les contrôles automatiques GitHub de la première révision de PR #18 passent. Une révision finale est nécessaire après l'alignement du scénario Projets ; l'exécution manuelle initiale sur l'ancien SHA a été annulée, sans être présentée comme un passage.
- Aucun enregistrement de développement/production n'a été migré, seedé ou supprimé. Port 8000 intact.

## Compétences UI et revue

Design-system-ops : géométrie et tokens existants, aucun nouveau composant. Frontend Responsive Design Standards et uncodixfy : option native et badge existants, cibles tactiles préservées. Vercel React Best Practices : une source partagée pour les catégories évite les branches spécifiques aux pages. Design-taste-frontend est hors périmètre pour ce CRM dense. Antislop core s'applique en audit AFTER, sans correction esthétique non sélectionnée par Khalid. La référence V3 approuvée et la référence Projets D39 ont été inspectées ; la nouvelle catégorie ne change pas leur composition.

Revue produit/design humaine : en attente.

## Suivi de régression et exploitation — 19 octobre

- La migration 0027 était déjà présente dans le code déployé, mais absente des modèles ORM Lead/Deal. Les champs, clés étrangères, contraintes et index correspondants ont été ajoutés aux modèles sans activer la fonctionnalité d'archivage de la PR #17. `APP_ENVIRONMENT=test -m alembic check` ne détecte plus d'opération ; Ruff et mypy passent.
- Une première relance complète s'est arrêtée à 186 succès/1 échec car ClamAV local était arrêté. Après redémarrage du conteneur de test épinglé et état `healthy`, la suite PostgreSQL intégrale passe : 843/843, 94 % de couverture, 1138,10 s. Les 72 tests unitaires frontend, lint, TypeScript et build passent. Le contrôle hébergé exact-commit reste requis avant merge.
- Dans DigitalOcean, le déploiement vivant de `main` est `707c9ae` (migration disponible 0027). La base de production était à 0026 ; la restauration transactionnelle sur sept jours était proposée dans la console. Avec l'autorisation explicite du propriétaire, `alembic upgrade 0027_record_archive` a réussi et `alembic current` a confirmé 0027. L'API publique répond 200, et la session existante charge tableau de bord, Prospects et Affaires. Aucune donnée réelle n'a été exportée, importée ou affichée dans cette preuve. 0028 attend toujours la publication du code correspondant.
