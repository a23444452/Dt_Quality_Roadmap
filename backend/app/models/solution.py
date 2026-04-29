from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class Solution(TimestampMixin, Base):
    __tablename__ = "solution"
    __table_args__ = (UniqueConstraint("defect_type_id", "station_id", "name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    defect_type_id: Mapped[int] = mapped_column(ForeignKey("defect_type.id"), nullable=False)
    station_id: Mapped[int] = mapped_column(ForeignKey("station.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    quality_attribute: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    document_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    document_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_g_item: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
