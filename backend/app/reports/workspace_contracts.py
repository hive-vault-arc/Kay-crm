"""Selected dashboard filters and pages; never caller-selected authority or clock."""

from typing import Annotated, Literal
from uuid import UUID

from pydantic import StringConstraints

from app.reports.contracts import PeriodQuery
from app.work.contracts import PageQuery

WorkspaceMetric = Literal["enquiries", "active_deals", "upcoming_visits", "follow_ups"]


class WorkspaceQuery(PeriodQuery):
    assigned_agent_id: UUID | None = None


class WorkspaceRecords(WorkspaceQuery, PageQuery):
    metric: WorkspaceMetric


class WorkspaceAgents(PageQuery):
    q: Annotated[str, StringConstraints(strip_whitespace=True, max_length=160)] | None = None
