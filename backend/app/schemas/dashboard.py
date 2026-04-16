from pydantic import BaseModel


class SankeyNode(BaseModel):
    id: str
    name: str
    layer: str


class SankeyLink(BaseModel):
    source: str
    target: str
    value: int


class PlantCoverage(BaseModel):
    plant: str
    mp_percentage: float
    total: int


class KpiData(BaseModel):
    total_solutions: int
    mp_count: int
    mp_percentage: float
    developing_count: int
    planned_count: int
    coverage_by_plant: list[PlantCoverage]


class SankeyData(BaseModel):
    nodes: list[SankeyNode]
    links: list[SankeyLink]


class DashboardSummary(BaseModel):
    kpi: KpiData
    sankey: SankeyData
