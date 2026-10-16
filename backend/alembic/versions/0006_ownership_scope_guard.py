"""Limit contact-assignment checks to ownership changes, not unrelated identity edits."""

# ruff: noqa: S608
# DDL is composed exclusively from fixed migration literals and a boolean.

from alembic import op

revision = "0006_ownership_scope_guard"
down_revision = "0005_ownership_history"
branch_labels = None
depends_on = None


def replace_guard(*, ownership_only: bool) -> None:
    ownership = (
        """
      IF TG_TABLE_NAME='contact' THEN
        IF OLD.primary_agent_id=NEW.primary_agent_id AND OLD.merged_into_contact_id
          IS NOT DISTINCT FROM NEW.merged_into_contact_id THEN RETURN NULL; END IF;
      END IF;
    """
        if ownership_only
        else ""
    )
    op.execute(
        """CREATE OR REPLACE FUNCTION kay_contact_assignment_check()
    RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE cid uuid;
    BEGIN
    """
        + ownership
        + """
      IF TG_TABLE_NAME='contact' THEN cid:=NEW.id;
      ELSIF TG_OP='DELETE' THEN cid:=OLD.contact_id; ELSE cid:=NEW.contact_id; END IF;
      IF EXISTS(SELECT 1 FROM enquiry e JOIN contact c ON c.id=e.contact_id
        LEFT JOIN "user" u ON u.id=e.assigned_agent_id
        WHERE c.id=cid AND e.assigned_agent_id IS NOT NULL
        AND NOT (u.state='active' AND (u.role IN ('manager','administrator')
          OR c.primary_agent_id=u.id
          OR EXISTS(SELECT 1 FROM contact_collaborator cc WHERE cc.contact_id=c.id
            AND cc.user_id=u.id AND cc.revoked_at IS NULL)))) THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='ENQUIRY_ASSIGNEE_SCOPE'; END IF;
      RETURN NULL;
    END $$"""
    )


def upgrade() -> None:
    replace_guard(ownership_only=True)


def downgrade() -> None:
    replace_guard(ownership_only=False)
