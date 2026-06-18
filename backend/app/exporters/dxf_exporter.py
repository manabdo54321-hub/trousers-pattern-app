"""
dxf_exporter.py
---------------
تصدير قطع الباترون كملف DXF، وهو التنسيق المعياري في صناعة CAD/CAM،
المستخدم مباشرة في ماكينات القطع بالليزر وماكينات القطع الأوتوماتيكية
في مصانع الملابس (مثل ماكينات Gerber أو Lectra).

كل خط في الباترون يُصدَّر في "طبقة" (Layer) منفصلة بالاسم المناسب
(PATTERN, SEAM_ALLOWANCE, GRAINLINE, DART) حتى يستطيع المشغّل في
المصنع التحكم في أي خطوط يريد القطع بها وأي خطوط للعرض فقط
(الـ grainline مثلاً لا يُقطَع، فقط يُستخدم كمرجع للمحاذاة مع نسيج القماش).
"""

import ezdxf
from typing import List

from app.models.schemas import PatternPiece


# تعريف الطبقات وألوانها (أكواد ألوان AutoCAD Color Index - ACI)
LAYER_CONFIG = {
    "PATTERN": {"color": 5},          # أزرق - خطوط القطع الأساسية
    "SEAM_ALLOWANCE": {"color": 1},   # أحمر - سماح الخياطة
    "GRAINLINE": {"color": 3},        # أخضر - خط اتجاه القماش (مرجعي، لا يُقطَع)
    "DART": {"color": 5},             # أزرق - البنس (يُقطَع أو يُحفَر جزئياً حسب الماكينة)
    "LABELS": {"color": 7},           # أبيض/أسود - النصوص التوضيحية
}


def export_pattern_to_dxf(
    pieces: List[PatternPiece],
    include_seam_allowance: bool = True,
    include_grainline: bool = True,
    include_labels: bool = True,
) -> bytes:
    """
    يبني مستند DXF من قطع الباترون ويرجعه كـ bytes جاهزة للحفظ كملف .dxf.

    يستخدم وحدات السنتيمتر مباشرة (DXF لا يفرض وحدة معينة، لكننا نضبط
    $INSUNITS = 5 وهو الكود المعياري للسنتيمتر، حتى تفهمه برامج CAD
    المختلفة بشكل صحيح عند الاستيراد).
    """
    doc = ezdxf.new(dxfversion="R2010")
    doc.header["$INSUNITS"] = 5  # 5 = Centimeters في معيار DXF

    for layer_name, cfg in LAYER_CONFIG.items():
        doc.layers.add(name=layer_name, color=cfg["color"])

    msp = doc.modelspace()

    for piece in pieces:
        # سماح الخياطة كـ polyline مغلقة (هذا هو الخط الذي تتبعه ماكينة القطع بالفعل)
        if include_seam_allowance and piece.seam_allowance_path:
            sa_points = [
                (pt.x + piece.offset_x, pt.y) for pt in piece.seam_allowance_path
            ]
            msp.add_lwpolyline(sa_points, close=True, dxfattribs={"layer": "SEAM_ALLOWANCE"})

        for path in piece.paths:
            if not include_grainline and path.name == "grainline":
                continue

            points = [(pt.x + piece.offset_x, pt.y) for pt in path.points]
            if len(points) < 2:
                continue

            layer = "GRAINLINE" if path.name == "grainline" else (
                "DART" if path.name == "dart" else "PATTERN"
            )
            msp.add_lwpolyline(points, close=False, dxfattribs={"layer": layer})

        if include_labels and piece.paths:
            label_point = piece.paths[0].points[0]
            label_text = f"Piece {piece.piece_index + 1}" + (" (Flipped)" if piece.is_flipped else "")
            msp.add_text(
                label_text,
                dxfattribs={
                    "layer": "LABELS",
                    "height": 1.5,
                    "insert": (label_point.x + piece.offset_x, label_point.y + 2),
                },
            )

    # ezdxf يكتب مباشرة لملف أو stream نصي؛ نستخدم BytesIO عبر التحويل لنص ثم encode
    import io

    stream = io.StringIO()
    doc.write(stream)
    return stream.getvalue().encode("utf-8")
