"""
ReserveEstimate — Mineral resource and reserve estimates compliant with
NI 43-101 / JORC / SEC Industry Guide 7 standards.

Tracks proven/probable reserves and measured/indicated/inferred resources
with grade, tonnage, and contained-metal calculations.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from typing import Optional


class ResourceClassification(str, Enum):
    PROVEN = "Proven"
    PROBABLE = "Probable"
    MEASURED = "Measured"
    INDICATED = "Indicated"
    INFERRED = "Inferred"


class ReportingStandard(str, Enum):
    NI_43_101 = "NI 43-101"
    JORC = "JORC"
    SEC_IG7 = "SEC Industry Guide 7"
    VALMIN = "VALMIN"
    UNCLASSIFIED = "Unclassified"


@dataclass
class ReserveEstimate:
    mine_name: str
    commodity: str
    classification: ResourceClassification
    reporting_standard: ReportingStandard = ReportingStandard.NI_43_101
    tonnage_kt: float = 0.0
    grade: float = 0.0
    grade_unit: str = "g/t"  # "g/t", "%", "oz/t", "lb/t", "ppm"
    effective_date: date = field(default_factory=date.today)
    source_document: str = ""
    qualified_person: str = ""
    data_source: str = "manual"

    @property
    def contained_metal(self) -> float:
        if self.grade_unit == "g/t":
            return (self.tonnage_kt * self.grade * 1000) / 31.1035
        elif self.grade_unit == "%":
            return self.tonnage_kt * self.grade / 100
        elif self.grade_unit == "lb/t":
            return self.tonnage_kt * self.grade * 1000
        elif self.grade_unit == "ppm":
            return self.tonnage_kt * self.grade * 1000 / 1_000_000
        elif self.grade_unit == "oz/t":
            return self.tonnage_kt * self.grade * 1000
        return 0.0

    @property
    def contained_metal_label(self) -> str:
        unit_map = {"g/t": "oz", "%": "kt", "lb/t": "lbs", "ppm": "kg", "oz/t": "oz"}
        return unit_map.get(self.grade_unit, "units")

    @property
    def is_reserve(self) -> bool:
        return self.classification in (
            ResourceClassification.PROVEN, ResourceClassification.PROBABLE)

    @property
    def is_resource(self) -> bool:
        return self.classification in (
            ResourceClassification.MEASURED, ResourceClassification.INDICATED,
            ResourceClassification.INFERRED)

    @property
    def confidence_level(self) -> int:
        mapping = {
            ResourceClassification.PROVEN: 5, ResourceClassification.PROBABLE: 4,
            ResourceClassification.MEASURED: 3, ResourceClassification.INDICATED: 2,
            ResourceClassification.INFERRED: 1,
        }
        return mapping.get(self.classification, 0)

    def to_dict(self) -> dict:
        return {
            "mine_name": self.mine_name,
            "commodity": self.commodity,
            "classification": self.classification.value,
            "reporting_standard": self.reporting_standard.value,
            "tonnage_kt": self.tonnage_kt,
            "grade": self.grade,
            "grade_unit": self.grade_unit,
            "contained_metal": round(self.contained_metal, 2),
            "contained_metal_label": self.contained_metal_label,
            "is_reserve": self.is_reserve,
            "confidence_level": self.confidence_level,
            "effective_date": self.effective_date.isoformat(),
            "data_source": self.data_source,
        }
