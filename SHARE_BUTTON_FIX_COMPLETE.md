from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '61961837bfc8'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Enum handling
    conn = op.get_bind()
    existing_enums = conn.execute(
        sa.text("SELECT typname FROM pg_type WHERE typname = 'meal_share_request_status'")
    ).fetchall()
    if not existing_enums:
        status_enum = sa.Enum("pending", "accepted", "declined", name="meal_share_request_status")
        status_enum.create(conn, checkfirst=True)
    else:
        print("⚠️ Enum 'meal_share_request_status' already exists, reusing existing type.")
        status_enum = sa.Enum(name="meal_share_request_status", metadata=sa.MetaData())

    op.create_table(
        'meal_share_requests',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('requester_id', sa.Integer, nullable=False),
        sa.Column('meal_id', sa.Integer, nullable=False),
        sa.Column('status', status_enum, nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )


def downgrade():
    op.drop_table('meal_share_requests')
    status_enum = sa.Enum(name="meal_share_request_status")
    status_enum.drop(op.get_bind(), checkfirst=True)
