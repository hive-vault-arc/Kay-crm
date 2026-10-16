"""Run locally by the intended administrator; no secret input except hidden TTY."""

import getpass
import sys
import warnings

from sqlalchemy.exc import SQLAlchemyError

from app.db.isolation import assert_runtime_target
from app.db.session import Database
from app.identity.bootstrap import bootstrap_administrator
from app.identity.security import IdentityError
from app.settings import ConfigurationError, load_settings


def main() -> int:
    if len(sys.argv) != 1:
        print("ARGUMENTS_NOT_ALLOWED: lancez le module sans argument.")
        return 2
    if not sys.stdin.isatty() or not sys.stdout.isatty():
        print("TTY_REQUIRED: utilisez un terminal interactif local.")
        return 2
    database: Database | None = None
    try:
        name = input("Nom affiché : ")
        email = input("Adresse e-mail : ")
        with warnings.catch_warnings():
            warnings.simplefilter("error", getpass.GetPassWarning)
            password = getpass.getpass("Mot de passe (12 caractères minimum) : ")
            confirmation = getpass.getpass("Confirmez le mot de passe : ")
        if password != confirmation:
            raise IdentityError("PASSWORD_MISMATCH")
        configuration = load_settings()
        assert_runtime_target(configuration)
        database = Database(configuration.selected_database_url())
        user_id = bootstrap_administrator(database, name, email, password)
        print(f"BOOTSTRAP_COMPLETED: compte {user_id}. Connectez-vous depuis l’interface KAY.")
        return 0
    except ConfigurationError as error:
        print(str(error))
        return 1
    except IdentityError as error:
        print(error.code)
        return 1
    except KeyboardInterrupt, EOFError:
        print("BOOTSTRAP_INTERRUPTED: aucune création partielle.")
        return 1
    except getpass.GetPassWarning:
        print("TTY_REQUIRED: la saisie masquée n’est pas disponible.")
        return 2
    except SQLAlchemyError, RuntimeError:
        print("BOOTSTRAP_UNAVAILABLE: vérifiez la configuration et les migrations.")
        return 1
    finally:
        if database is not None:
            database.close()


if __name__ == "__main__":
    raise SystemExit(main())
