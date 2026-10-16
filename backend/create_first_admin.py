"""One-time KAY administrator setup; password is accepted only through a hidden TTY."""

from app.cli import bootstrap_admin

INITIAL_ADMIN_EMAIL = "itteam@kayrealestate.ma"


def main() -> int:
    return bootstrap_admin.main(email=INITIAL_ADMIN_EMAIL)


if __name__ == "__main__":
    raise SystemExit(main())
