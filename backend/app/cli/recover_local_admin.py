"""Recover the sole local development administrator using hidden terminal input."""

import getpass
import re
import sys
import warnings

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.identity.local_admin_recovery import (
    recover_only_local_administrator,
    require_local_database_identity,
    require_local_development_configuration,
)
from app.identity.security import IdentityError
from app.runtime import require_venv
from app.settings import ConfigurationError, load_settings


def main() -> int:
    if len(sys.argv) != 1:
        print("ARGUMENTS_NOT_ALLOWED: lancez le module sans argument.")
        return 2
    if not sys.stdin.isatty() or not sys.stdout.isatty():
        print("TTY_REQUIRED: utilisez un terminal interactif local.")
        return 2

    database = None
    stage = "configuration"
    try:
        require_venv()
        settings = load_settings()
        configured_url = settings.database_url.get_secret_value()
        require_local_development_configuration(settings.app_environment, configured_url)

        print("Cette opération rétablit l’accès du seul administrateur de développement.")
        print("Elle révoque ses sessions actives et enregistre une action d’audit.")
        if input("Tapez RECOVER pour continuer : ").strip() != "RECOVER":
            print("RECOVERY_CANCELLED")
            return 1

        with warnings.catch_warnings():
            warnings.simplefilter("error", getpass.GetPassWarning)
            password = getpass.getpass("Nouveau mot de passe (12 caractères minimum) : ")
            confirmation = getpass.getpass("Confirmez le mot de passe : ")
        if password != confirmation:
            raise IdentityError("PASSWORD_MISMATCH")

        from app.db.session import Database

        stage = "database_check"
        database = Database(settings.selected_database_url())
        with database.session() as session:
            target = session.execute(
                text("SELECT current_database(), inet_server_addr()::text")
            ).one()
        require_local_database_identity(str(target[0]), target[1])
        stage = "credential_transaction"
        recover_only_local_administrator(
            database, settings.facade_secret.get_secret_value(), password
        )
        print("LOCAL_ADMIN_RECOVERED: connectez-vous avec l’adresse déjà créée.")
        return 0
    except ConfigurationError as error:
        print(str(error))
        return 1
    except IdentityError as error:
        print(error.code)
        return 1
    except KeyboardInterrupt, EOFError:
        print("RECOVERY_INTERRUPTED: aucune modification partielle.")
        return 1
    except getpass.GetPassWarning:
        print("TTY_REQUIRED: la saisie masquée n’est pas disponible.")
        return 2
    except SQLAlchemyError as error:
        original = getattr(error, "orig", None)
        sqlstate = getattr(original, "sqlstate", None)
        constraint = getattr(getattr(original, "diag", None), "constraint_name", None)
        details = [stage, type(error).__name__]
        if isinstance(sqlstate, str) and re.fullmatch(r"[0-9A-Z]{5}", sqlstate):
            details.append(sqlstate)
        if isinstance(constraint, str) and re.fullmatch(r"[a-zA-Z0-9_]+", constraint):
            details.append(constraint)
        print("RECOVERY_UNAVAILABLE:" + ":".join(details))
        return 1
    except RuntimeError:
        print(f"RECOVERY_UNAVAILABLE:{stage}:RUNTIME")
        return 1
    finally:
        if database is not None:
            database.close()


if __name__ == "__main__":
    raise SystemExit(main())
