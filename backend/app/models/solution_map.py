from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SolutionMap(Base):
    __tablename__ = "solution_map"
    __table_args__ = (
        UniqueConstraint("solution_id", "tank_line_id"),
        Index("ix_solution_map_solution", "solution_id"),
        Index("ix_solution_map_tank_line", "tank_line_id"),
        Index("ix_solution_map_status", "status_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    solution_id: Mapped[int] = mapped_column(ForeignKey("solution.id"), nullable=False)
    tank_line_id: Mapped[int] = mapped_column(ForeignKey("tank_line.id"), nullable=False)
    status_id: Mapped[int] = mapped_column(ForeignKey("status_definition.id"), nullable=False)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    is_g_tracking: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0", nullable=False)
    g_complete_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
