# Backend working rules

The root AGENTS.md, current sprint and KAY contracts are authoritative.
Every Python execution/install/tool uses this directory's `.venv` explicitly.
Never import or launch the backend with a global interpreter. Use sys.executable
for subprocesses, the declared hash locks for dependencies, and the real QA register.

Private `.env` URLs and local-note credentials must never appear in output, tests,
screenshots, source or documentation. Use safe codes and request IDs in diagnostics.
Tests/migrations resolve database identity before DDL; never reset development or
stamp an unknown schema. Keep HTTP handlers thin, synchronous sessions short and
resources lifespan-owned. Add only modules required by the current sprint.
