"""
pattern.py
----------
الـ Endpoint الأساسي لتوليد باترون البنطلون. يستقبل المقاسات وإعدادات
الـ Nesting، ويرجع كل القطع جاهزة للرسم في الفرونت إند كـ Pydantic models
(والتي تتحول تلقائياً لـ JSON بواسطة FastAPI).
"""

import numpy as np
from fastapi import APIRouter

from app.models.schemas import (
    PatternGenerationRequest,
    PatternGenerationResponse,
    PatternPiece,
    PatternPath,
    Point,
    BoundingBox,
)
from app.services.trousers_model import TrousersParametricModel
from app.services.nesting import generate_nested_layout

router = APIRouter(prefix="/api/pattern", tags=["Pattern"])


# أسماء عرض عربية لكل مسار، وألوان/أنماط ثابتة تطابق الكود الأصلي في matplotlib
PATH_DISPLAY_CONFIG = {
    "waist": {"name_ar": "خط الخصر", "style": "solid", "color": "#1e3799"},
    "outseam": {"name_ar": "الخط الجانبي", "style": "solid", "color": "#1e3799"},
    "hem": {"name_ar": "خط الكفة", "style": "solid", "color": "#1e3799"},
    "inseam": {"name_ar": "الخط الداخلي", "style": "solid", "color": "#1e3799"},
    "crotch": {"name_ar": "خط فتحة الحوض (القُب)", "style": "solid", "color": "#1e3799"},
    "grainline": {"name_ar": "خط اتجاه القماش", "style": "dashdot", "color": "#2ed573"},
    "dart": {"name_ar": "البنس (الكسرة)", "style": "solid", "color": "#1e3799"},
}


def _np_to_points(arr: np.ndarray) -> list:
    """تحويل مصفوفة NumPy من نقاط (N, 2) إلى قائمة Point models."""
    return [Point(x=float(row[0]), y=float(row[1])) for row in arr]


@router.post("/generate", response_model=PatternGenerationResponse)
def generate_pattern(request: PatternGenerationRequest) -> PatternGenerationResponse:
    """
    يحسب باترون البنطلون كاملاً (مع كل قطعه المكررة لو طُلب nesting)
    ويرجعه كنقاط جاهزة للرسم المباشر على Fabric.js في الفرونت إند.
    """
    measurements_dict = request.measurements.model_dump()
    model = TrousersParametricModel(
        measurements=measurements_dict, seam_allowance=request.seam_allowance
    )

    base_paths = model.generate_pattern_paths()
    base_sa_path = model.generate_seam_allowance(base_paths)

    nested_pieces = generate_nested_layout(
        base_paths=base_paths,
        base_sa_path=base_sa_path,
        seam_allowance=request.seam_allowance,
        num_pieces=request.num_pieces,
        spacing=request.spacing,
        auto_flip=request.auto_flip,
    )

    response_pieces = []
    global_min_x, global_max_x = float("inf"), float("-inf")
    global_min_y, global_max_y = float("inf"), float("-inf")

    for piece in nested_pieces:
        path_models = []
        for key, arr in piece["paths"].items():
            cfg = PATH_DISPLAY_CONFIG.get(
                key, {"name_ar": key, "style": "solid", "color": "#1e3799"}
            )
            path_models.append(
                PatternPath(
                    name=key,
                    name_ar=cfg["name_ar"],
                    points=_np_to_points(arr),
                    is_closed=False,
                    style=cfg["style"],
                    color=cfg["color"],
                )
            )

            # تحديث الصندوق المحيط الكلي مع مراعاة الإزاحة الأفقية لكل قطعة
            shifted_x = arr[:, 0] + piece["offset_x"]
            global_min_x = min(global_min_x, float(np.min(shifted_x)))
            global_max_x = max(global_max_x, float(np.max(shifted_x)))
            global_min_y = min(global_min_y, float(np.min(arr[:, 1])))
            global_max_y = max(global_max_y, float(np.max(arr[:, 1])))

        response_pieces.append(
            PatternPiece(
                piece_id=f"piece-{piece['index']}",
                piece_index=piece["index"],
                is_flipped=piece["is_flipped"],
                offset_x=piece["offset_x"],
                offset_y=0.0,
                paths=path_models,
                seam_allowance_path=_np_to_points(piece["sa_path"]),
            )
        )

    return PatternGenerationResponse(
        pieces=response_pieces,
        bounding_box=BoundingBox(
            min_x=global_min_x, max_x=global_max_x, min_y=global_min_y, max_y=global_max_y
        ),
        measurement_lines=[
            model.y_waist,
            model.y_hip,
            model.y_crotch,
            model.y_knee,
            model.y_hem,
        ],
    )
