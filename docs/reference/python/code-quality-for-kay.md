# Proposed Python code-quality standard for KAY

Status: proposal for the future FastAPI backend; not yet applied or tested  
Date: 2026-10-14  
Confirmed decisions: KAY's backend is planned as a FastAPI modular monolith with SQLAlchemy, Alembic, PostgreSQL, workers, exact MAD amounts, and authorization on every request.  
Technical proposals: the conventions and automated checks below; choose tool versions and thresholds when the backend repository is created.  
References: [KAY engineering rules](../../01-working-agreements/coding-standards.md), [KAY architecture](../../04-design/architecture.md), [data model](../../04-design/data-model.md), [acceptance tests](../../05-quality/acceptance-tests.md), [PEP 8](standards/PEP-0008.rst), [PEP 257](standards/PEP-0257.rst), [typing best practices](https://typing.python.org/en/latest/reference/best_practices.html), [PyPA project configuration](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/), [Ruff](https://docs.astral.sh/ruff/), and [pytest](https://docs.pytest.org/en/stable/contents.html).

## Runtime and project setup

- Record the backend's supported Python version in its project configuration and CI. The approved local roadmap selects Python 3.14.3 with FastAPI, SQLAlchemy, Alembic and Psycopg; verify and lock their installation in SP-02. Production support is a later boundary.
- Always use backend/.venv explicitly for every backend launch, install, worker, migration, test, quality/load/certificate/backup utility and Python subprocess (sys.executable). Only its initial creation uses base Python. Use a project-local, disposable virtual environment. Keep application dependencies and development tools declared and reproducible, not installed ad hoc into the machine's global Python. Use `pyproject.toml` for project and tool configuration. See the [official `venv` guide](3.14.3/html/library/venv.html) and [PyPA guidance](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/).
- Keep HTTP handlers thin. Put permission checks, business operations, transaction boundaries, and persistence behind explicit module interfaces as described in the [architecture](../../04-design/architecture.md). Do not let route code or workers bypass the same rules.

## Readability and contracts

- Follow PEP 8 for naming, imports, layout, and consistency. Prefer clear, cohesive functions and explicit state changes over clever compression. Keep one formatter/linter configuration for the team; do not impose conflicting formatters.
- Write PEP 257 docstrings for public modules, classes, and non-obvious functions. Explain behavior, constraints, side effects, and exceptions rather than restating a function name or its type annotations. Keep comments accurate when code changes.
- Annotate service interfaces, domain operations, and public functions. Prefer precise types at boundaries and avoid spreading `Any` through the domain model. Type hints help static analysis but do **not** validate runtime input; validate request, import, and connector data explicitly. See the [typing module](3.14.3/html/library/typing.html) and [typing best practices](https://typing.python.org/en/latest/reference/best_practices.html).
- Use specific exceptions for expected failures, translate them into the agreed API error codes at the HTTP boundary, and avoid silently swallowing errors. Use context managers for resources and transactions. See the [exceptions tutorial](3.14.3/html/tutorial/errors.html).

## KAY data and security rules

- Represent money and percentages with `decimal.Decimal`, not binary `float`; preserve original rental terms and use exact comparison rules. Match the database `numeric` fields and API decimal strings in the [data model](../../04-design/data-model.md). See [`decimal`](3.14.3/html/library/decimal.html).
- Use timezone-aware instants, store them as UTC according to the data model, and interpret business calendar dates in `Africa/Casablanca`. Do not mix naive datetimes with aware instants. See [`datetime`](3.14.3/html/library/datetime.html) and [`zoneinfo`](3.14.3/html/library/zoneinfo.html).
- Log actionable events with a request or job identifier, while excluding credentials, session tokens, private documents, and unnecessary contact details. Prefer module loggers over `print` in server code. See the [logging guide](3.14.3/html/howto/logging.html) and [KAY security rules](../../04-design/security-and-privacy.md).
- Treat CSV, website-form payloads, file metadata, and serialized data as untrusted. Never unpickle untrusted content; the [Python `pickle` documentation](3.14.3/html/library/pickle.html) explicitly warns against it. Authorization must be checked against current database state, not a role or owner value supplied by a client.

## Proposed quality gates

Before a backend change is merged, run one configured formatter and linter, a static type check for the changed modules, focused unit tests, and integration tests against the real PostgreSQL behavior affected by the change. The approved local baseline selects Ruff and mypy; install/lock them in SP-02 and invoke them through backend/.venv. Their commands remain unverified until run. Use Ruff format/check, mypy, focused pytest and PostgreSQL integration evidence as defined in the local roadmap.

Use pytest for KAY's [identified acceptance scenarios](../../05-quality/acceptance-tests.md): allowed, forbidden, invalid, concurrent, interrupted, and recovered cases. Use synthetic fixtures. In particular, test duplicate phones, stock reservation races, over-collection, atomic import rollback, authorization, exact money calculations, and reminder retries. A passing unit test is not a substitute for a database transaction or permission test. Keep tests and docs in the same change as the behavior they verify.

No backend application, quality tool, or application test was run while preparing this reference.
