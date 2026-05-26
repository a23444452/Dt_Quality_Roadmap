from sqlalchemy import Float, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class GTrackingMonthlyTarget(Base):
    __tablename__ = "g_tracking_monthly_target"
    __table_args__ = (
        UniqueConstraint("year", "month", name="uq_monthly_target_year_month"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    budget: Mapped[float] = mapped_column(Float, default=0, server_default="0", nullable=False)
    stretch: Mapped[float] = mapped_column(Float, default=0, server_default="0", nullable=False)


class GTrackingPlantTarget(Base):
    __tablename__ = "g_tracking_plant_target"
    __table_args__ = (
        UniqueConstraint("year", "plant_id", name="uq_plant_target_year_plant"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    plant_id: Mapped[int] = mapped_column(ForeignKey("plant.id"), nullable=False)
    budget: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    stretch: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
