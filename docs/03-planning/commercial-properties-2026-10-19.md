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
- 72 tests unitaires frontend passent ; TypeScript, Ruff et mypy passent. Les vérifications de compilation, navigateur, sécurité et CI seront consignées ici après exécution.
- Aucun enregistrement de développement/production n'a été migré, seedé ou supprimé. Port 8000 intact.

## Compétences UI et revue

Design-system-ops : géométrie et tokens existants, aucun nouveau composant. Frontend Responsive Design Standards et uncodixfy : option native et badge existants, cibles tactiles préservées. Vercel React Best Practices : une source partagée pour les catégories évite les branches spécifiques aux pages. Design-taste-frontend est hors périmètre pour ce CRM dense. Antislop core s'applique en audit AFTER, sans correction esthétique non sélectionnée par Khalid. La référence V3 approuvée et la référence Projets D39 ont été inspectées ; la nouvelle catégorie ne change pas leur composition.

Revue produit/design humaine : en attente.
