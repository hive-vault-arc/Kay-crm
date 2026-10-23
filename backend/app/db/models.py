"""Register the complete migration-owned metadata for HTTP and standalone CLIs."""

from app.contacts import history_models  # noqa: F401
from app.contacts import models as contact_models  # noqa: F401
from app.deals import history_models as deal_history_models  # noqa: F401
from app.deals import models as deal_models  # noqa: F401
from app.deals import outcome_models as deal_outcomes  # noqa: F401
from app.deals import project_models as deal_project_models  # noqa: F401
from app.discovery import models as discovery_models  # noqa: F401
from app.files import models as file_models  # noqa: F401
from app.finance import models as finance_models  # noqa: F401
from app.identity import models as identity_models  # noqa: F401
from app.imports import models as import_models  # noqa: F401
from app.intake import models as intake_models  # noqa: F401
from app.inventory import (
    hierarchy_models,  # noqa: F401
    outcome_models,  # noqa: F401
    reservation_models,  # noqa: F401
)
from app.inventory import models as inventory_models  # noqa: F401
from app.realtime import models as realtime_models  # noqa: F401
from app.requirements import models as requirement_models  # noqa: F401
from app.schedule import models as schedule_models  # noqa: F401
from app.work import models as work_models  # noqa: F401
