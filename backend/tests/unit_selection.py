"""Explicitly reviewed pure modules; unlisted tests remain database-gated by default."""

MODULES = frozenset(
    {
        "test_runtime.py",
        "test_serve.py",
        "test_packaging.py",
        "test_ci_setup.py",
        "test_supervised_worker.py",
        "test_production_settings.py",
        "test_antivirus_settings.py",
        "test_benchmark_totals.py",
        "test_first_admin.py",
        "test_isolation_unit.py",
        "test_qualification_unit.py",
        "test_unit_selection.py",
        "test_generated_unit.py",
        "test_generated_history_actor_unit.py",
        "test_property_listing_unit.py",
        "test_visit_notes_unit.py",
        "test_workspace_reports_unit.py",
        "test_prepared_search_unit.py",
        "test_audit_options_unit.py",
        "test_intake_workspace_unit.py",
    }
)
NODES = frozenset({"test_foundation.py::test_runtime_is_project_venv"})
DATABASE_FIXTURES = frozenset({"settings", "database", "clean_identity"})


def is_unit(nodeid: str) -> bool:
    module, separator, name = nodeid.partition("::")
    relative = module.replace("\\", "/").rsplit("/", 1)[-1]
    return relative in MODULES or f"{relative}{separator}{name}" in NODES
