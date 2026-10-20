"""The twelve owner-supplied blank PDFs, expressed as bounded editable fields."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Field:
    key: str
    label: str
    group: str
    multiline: bool = False


@dataclass(frozen=True)
class Template:
    code: str
    title: str
    source: str
    warning: str
    fields: tuple[Field, ...]
    restricted: bool = False


def fields(*items: tuple[str, str, str, bool]) -> tuple[Field, ...]:
    return tuple(Field(*item) for item in items)


PARTY = (
    ("client_name", "Nom du client / partie", "Parties", False),
    ("client_phone", "Téléphone du client", "Parties", False),
    ("agent_name", "Représentant KAY", "Parties", False),
)
PROPERTY = (
    ("property_reference", "Référence du bien", "Bien", False),
    ("property_address", "Adresse / localisation", "Bien", False),
    ("property_description", "Description du bien", "Bien", True),
)
TERMS = (
    ("price_mad", "Prix ou loyer annoncé (MAD)", "Conditions", False),
    ("conditions", "Conditions particulières", "Conditions", True),
)
WORKING = (
    "Modèle de travail non validé juridiquement. "
    "Vérifier les clauses et les pièces avant toute signature."
)


TEMPLATES = (
    Template(
        "01",
        "Bon de visite immobilière",
        "01_Bon_de_visite.pdf",
        WORKING,
        fields(
            *PARTY,
            *PROPERTY,
            ("visit_at", "Date et heure de visite", "Visite", False),
            ("visit_observations", "Observations et suite souhaitée", "Visite", True),
            *TERMS,
        ),
    ),
    Template(
        "02",
        "Mandat de vente",
        "02_Mandat_de_vente.pdf",
        WORKING,
        fields(
            *PARTY,
            *PROPERTY,
            *TERMS,
            ("mandate_duration", "Durée du mandat", "Mandat", False),
            ("fees", "Honoraires et partie débitrice", "Mandat", False),
        ),
    ),
    Template(
        "03",
        "Mandat de location",
        "03_Mandat_de_location.pdf",
        "Mandat de recherche de locataire uniquement ; il ne couvre pas la gestion locative. "
        + WORKING,
        fields(
            *PARTY,
            *PROPERTY,
            *TERMS,
            ("mandate_duration", "Durée du mandat", "Mandat", False),
            ("fees", "Honoraires et partie débitrice", "Mandat", False),
        ),
    ),
    Template(
        "04",
        "Contrat de location longue durée",
        "04_Contrat_location_longue_duree.pdf",
        WORKING,
        fields(
            *PARTY,
            ("second_party", "Bailleur / seconde partie", "Parties", False),
            *PROPERTY,
            ("start_date", "Début du bail", "Conditions", False),
            ("duration", "Durée du bail", "Conditions", False),
            ("price_mad", "Loyer mensuel (MAD)", "Conditions", False),
            ("deposit_mad", "Dépôt de garantie (MAD)", "Conditions", False),
            ("conditions", "Conditions particulières", "Conditions", True),
        ),
    ),
    Template(
        "05",
        "Contrat de location courte durée",
        "05_Contrat_location_courte_duree.pdf",
        WORKING,
        fields(
            *PARTY,
            ("second_party", "Exploitant / seconde partie", "Parties", False),
            *PROPERTY,
            ("start_date", "Arrivée", "Séjour", False),
            ("end_date", "Départ", "Séjour", False),
            ("price_mad", "Prix du séjour (MAD)", "Séjour", False),
            ("conditions", "Conditions particulières", "Séjour", True),
        ),
    ),
    Template(
        "06",
        "Bail commercial",
        "06_Contrat_bail_commercial.pdf",
        WORKING,
        fields(
            *PARTY,
            ("second_party", "Bailleur / seconde partie", "Parties", False),
            *PROPERTY,
            ("activity", "Activité autorisée", "Conditions", False),
            ("start_date", "Début du bail", "Conditions", False),
            ("duration", "Durée", "Conditions", False),
            ("price_mad", "Loyer (MAD)", "Conditions", False),
            ("conditions", "Conditions particulières", "Conditions", True),
        ),
    ),
    Template(
        "07",
        "Préparation pour le notaire",
        "07_Compromis_de_vente_PROJET_NOTAIRE.pdf",
        "Document préparatoire exclusivement destiné au notaire ou aux adouls. "
        "Ce PDF ne constitue pas un compromis signable et n'autorise aucun acompte.",
        fields(
            *PARTY,
            ("second_party", "Vendeur / seconde partie", "Parties", False),
            *PROPERTY,
            *TERMS,
            ("notary", "Notaire / adouls chargé(s) du dossier", "Préparation", False),
        ),
    ),
    Template(
        "08",
        "Fiche descriptive du bien",
        "08_Fiche_descriptive_bien_immobilier.pdf",
        WORKING,
        fields(
            *PROPERTY,
            ("property_area", "Surface (m²)", "Bien", False),
            ("property_rooms", "Nombre de pièces", "Bien", False),
            *TERMS,
            ("features", "Équipements et points forts", "Présentation", True),
        ),
    ),
    Template(
        "09",
        "Fiche client confidentielle",
        "09_Fiches_clients_proprietaire_acquereur_locataire.pdf",
        "Fiche confidentielle ; ne collecter que les données nécessaires et ne pas "
        "demander une CIN par défaut au premier contact. " + WORKING,
        fields(
            *PARTY,
            ("client_role", "Profil (propriétaire, acquéreur, locataire)", "Parties", False),
            ("client_email", "E-mail", "Parties", False),
            *PROPERTY,
            ("requirements", "Recherche / objectifs", "Besoin", True),
            ("budget", "Budget", "Besoin", False),
            ("consent_notes", "Information et consentement", "Confidentialité", True),
        ),
    ),
    Template(
        "10",
        "Brouillon de reçu de paiement",
        "10_Recu_de_paiement.pdf",
        "Ne jamais remettre comme reçu acquitté avant vérification des fonds "
        "effectivement encaissés. Chèque remis ≠ fonds encaissés. " + WORKING,
        fields(
            *PARTY,
            ("payment_reference", "Référence du paiement vérifié", "Paiement", False),
            ("payment_date", "Date d'encaissement vérifiée", "Paiement", False),
            ("price_mad", "Montant encaissé (MAD)", "Paiement", False),
            ("payment_method", "Mode de paiement", "Paiement", False),
            ("payment_reason", "Objet du paiement", "Paiement", True),
        ),
        True,
    ),
    Template(
        "11",
        "Brouillon de facture de commission",
        "11_Facture_de_commission.pdf",
        "Vérification comptable obligatoire : identité fiscale, honoraires et TVA "
        "ne sont jamais inventés automatiquement. " + WORKING,
        fields(
            *PARTY,
            ("invoice_number", "Numéro de facture", "Facturation", False),
            ("invoice_date", "Date", "Facturation", False),
            ("fees", "Commission convenue (MAD)", "Facturation", False),
            ("tax", "TVA validée par la comptabilité", "Facturation", False),
            ("conditions", "Référence et précisions", "Facturation", True),
        ),
        True,
    ),
    Template(
        "12",
        "État des lieux — entrée / sortie",
        "12_Etat_des_lieux_entree_et_sortie.pdf",
        WORKING,
        fields(
            *PARTY,
            ("second_party", "Bailleur / seconde partie", "Parties", False),
            *PROPERTY,
            ("inspection_type", "Entrée ou sortie", "Constat", False),
            ("inspection_at", "Date et heure", "Constat", False),
            ("meters", "Relevés des compteurs", "Constat", True),
            ("condition_notes", "État par pièce et observations", "Constat", True),
        ),
    ),
)

BY_CODE = {template.code: template for template in TEMPLATES}
