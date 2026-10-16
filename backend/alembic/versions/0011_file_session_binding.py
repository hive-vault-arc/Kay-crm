"""Bind direct transfers to separate transient session proof and tighten hash/lease checks."""

import sqlalchemy as sa

from alembic import op

revision = "0011_file_session_binding"
down_revision = "0010_protected_files"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("file_permit", sa.Column("session_proof_hash", sa.LargeBinary(32)))
    # Already-issued legacy permits fail closed; no raw session/permit secret is recovered.
    op.execute("UPDATE file_permit SET session_proof_hash=decode(repeat('00',32),'hex')")
    op.alter_column("file_permit", "session_proof_hash", nullable=False)
    op.create_check_constraint(
        "file_permit_hash_lengths",
        "file_permit",
        "octet_length(token_hash)=32 AND octet_length(session_proof_hash)=32",
    )
    op.create_check_constraint(
        "document_sha256_length", "document_version", "sha256 IS NULL OR octet_length(sha256)=32"
    )
    op.drop_constraint("job_lease", "job", type_="check")
    op.create_check_constraint(
        "job_lease",
        "job",
        "(state='running' AND lease_token IS NOT NULL AND lease_until IS NOT NULL) OR "
        "(state<>'running' AND lease_token IS NULL AND lease_until IS NULL)",
    )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.scalar(sa.text("SELECT current_database()")) == "kayrealestate":
        raise RuntimeError("DEVELOPMENT_DOWNGRADE_REFUSED")
    if connection.scalar(sa.text("SELECT EXISTS(SELECT 1 FROM document)")):
        raise RuntimeError("FILE_HISTORY_DOWNGRADE_REFUSED")
    op.drop_constraint("job_lease", "job", type_="check")
    op.create_check_constraint(
        "job_lease",
        "job",
        "(state='running')=(lease_token IS NOT NULL AND lease_until IS NOT NULL)",
    )
    op.drop_constraint("document_sha256_length", "document_version", type_="check")
    op.drop_constraint("file_permit_hash_lengths", "file_permit", type_="check")
    op.drop_column("file_permit", "session_proof_hash")
