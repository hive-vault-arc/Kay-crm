"""Small safe error envelope shared by HTTP handlers and middleware."""

from fastapi.responses import JSONResponse


def error_response(
    status: int, code: str, request_id: str, details: dict[str, object] | None = None
) -> JSONResponse:
    """Never copy exception messages, submitted input or database diagnostics."""
    messages = {
        "DEAL_VERSION_CONFLICT": (
            "Cette affaire a changé. Comparez la version actuelle avant de réessayer."
        ),
        "DEAL_STAGE_UNCHANGED": "Choisissez une autre étape.",
        "DEAL_DEDICATED_COMMAND_REQUIRED": (
            "La réservation et la clôture nécessitent leurs commandes dédiées."
        ),
        "INVALID_DEAL_CONTEXT": "Choisissez une demande et une recherche appartenant à ce contact.",
        "DEAL_OFFER_PERIOD_MISMATCH": (
            "La période de la proposition doit correspondre à l’achat ou à la location."
        ),
        "REQUIREMENT_VERSION_CONFLICT": "Cette recherche a changé. Comparez la version actuelle.",
        "REQUIREMENT_INTENT_IN_USE": (
            "Une sélection ou une affaire liée nécessite le type actuel de cette recherche. "
            "Retirez la sélection, adaptez l’affaire ou créez une autre recherche."
        ),
        "OFFERING_INTENT_MISMATCH": "Choisissez une offre du même type que la recherche.",
        "OFFERING_VERSION_CONFLICT": "Cette offre a changé. Actualisez ses conditions.",
        "SHORTLIST_LIMIT": "La limite de cette sélection est atteinte.",
        "INVALID_PHONE": "Saisissez un numéro international valide avec son indicatif.",
        "INVALID_ASSIGNEE": "Choisissez un agent actif ayant accès à ce contact.",
        "PHONE_OWNED_ELSEWHERE": (
            "Ce numéro est privé. Demandez un accès ou un transfert à l’agent responsable."
        ),
        "DUPLICATE_CONFIRMATION_REQUIRED": (
            "Ce numéro appartient à un contact accessible. Confirmez sa réutilisation."
        ),
        "SOURCE_SUBMISSION_CONFLICT": (
            "Cette référence existe déjà. Retrouvez le Lead avant une nouvelle tentative."
        ),
        "LAST_ADMIN_REQUIRED": (
            "Conservez au moins un administrateur actif avec un mot de passe définitif."
        ),
        "EMAIL_IN_USE": "Cette adresse e-mail est déjà utilisée.",
        "VERSION_CONFLICT": (
            "Cette fiche a changé. Comparez la version actuelle avant de réessayer."
        ),
        "ADMIN_PASSWORD_INVALID": "Votre mot de passe administrateur est incorrect.",
        "TEMPORARY_EXPIRED": "Le mot de passe temporaire a expiré. Réinitialisez-le.",
        "INVALID_STATE": "L’état de ce compte ne permet pas cette action.",
        "IDEMPOTENCY_CONFLICT": "Cette tentative ne correspond pas à la demande initiale.",
        "ONE_TIME_RESULT_UNAVAILABLE": (
            "Cette demande a déjà abouti. Le mot de passe ne peut pas être réaffiché."
        ),
        "USE_OWN_PASSWORD_CHANGE": "Utilisez le changement de votre propre mot de passe.",
        "BOOTSTRAP_REQUIRED": "L’installation doit d’abord être initialisée.",
        "DEPENDENCY_UNAVAILABLE": "Le service est indisponible. Réessayez dans un instant.",
        "FORBIDDEN": "Cette opération n’est pas autorisée.",
        "NOT_FOUND": "Cette ressource est introuvable.",
        "VALIDATION_ERROR": "La requête n’est pas valide.",
        "INTERNAL_ERROR": "Une erreur est survenue. Réessayez dans un instant.",
        "METHOD_NOT_ALLOWED": "Cette méthode n’est pas autorisée.",
        "UNAUTHENTICATED": "Votre session a expiré. Reconnectez-vous.",
        "INVALID_CREDENTIALS": "Adresse e-mail ou mot de passe incorrect.",
        "RATE_LIMITED": "Trop de tentatives. Réessayez plus tard.",
        "PASSWORD_POLICY": "Choisissez un mot de passe de 12 caractères minimum.",
        "PASSWORD_UNCHANGED": "Choisissez un nouveau mot de passe différent.",
        "PASSWORD_CHANGE_REQUIRED": "Changez votre mot de passe pour accéder à KAY.",
    }
    return JSONResponse(
        status_code=status,
        content={
            **(details or {}),
            "error": {
                "code": code,
                "message": messages.get(code, messages["INTERNAL_ERROR"]),
                "field_errors": {},
                "request_id": request_id,
            },
        },
        headers={"Cache-Control": "no-store", "X-Request-ID": request_id},
    )
