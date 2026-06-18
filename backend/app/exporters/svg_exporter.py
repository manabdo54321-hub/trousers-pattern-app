"""
svg_exporter.py
---------------
تصدير قطع الباترون كملف SVG (Scalable Vector Graphics) قابل للفتح
والتعديل في برامج مثل Illustrator أو Inkscape، مع الحفاظ على المقاس
الحقيقي بالسنتيمتر (1 سم = 1 وحدة SVG عبر إعداد viewBox، والتحويل
الفعلي لوحدات الطباعة يتم عبر خاصية width/height بوحدة "cm").

نستخدم svgwrite لأنها بسيطة ومباشرة في التعامل مع المسارات والنصوص.
"""

import svgwrite
from typing import List

from app.models.schemas import PatternPiece


# نفس ألوان وأنماط الخطوط المستخدمة في الفرونت إند، للحفاظ على التطابق البصري
STYLE_DASH = {
    "solid": None,
    "dashed": "6,3",
    "dashdot": "6,2,2,2",
}


def _points_to_svg_path(points, offset_x: float = 0.0) -> str:
    """يحوّل قائمة Point models إلى سلسلة SVG path (M x,y L x,y L x,y ...)."""
    if not points:
        return ""
    cmds = [f"M {points[0].x + offset_x:.3f},{-points[0].y:.3f}"]
    for pt in points[1:]:
        cmds.append(f"L {pt.x + offset_x:.3f},{-pt.y:.3f}")
    return " ".join(cmds)


def export_pattern_to_svg(
    pieces: List[PatternPiece],
    include_seam_allowance: bool = True,
    include_grainline: bool = True,
    include_labels: bool = True,
) -> str:
    """
    يبني مستند SVG كامل من قطع الباترون ويرجعه كنص (string) جاهز للحفظ
    في ملف أو إرساله مباشرة كاستجابة HTTP.

    ملاحظة هامة عن نظام المحاور:
    نظام الباترون الرياضي يعتبر "الأعلى" قيمة y أكبر (مثل الديكارتي العادي)،
    بينما SVG يعتبر "الأعلى" قيمة y أصغر (مثل شاشة الكمبيوتر).
    لذلك نعكس y (نضرب في -1) عند الرسم فقط، دون التأثير على البيانات الأصلية.
    """
    # حساب الأبعاد الكلية لضبط viewBox تلقائياً
    all_x, all_y = [], []
    for piece in pieces:
        for path in piece.paths:
            for pt in path.points:
                all_x.append(pt.x + piece.offset_x)
                all_y.append(-pt.y)  # معكوسة لأن SVG y تتجه للأسفل
        for pt in piece.seam_allowance_path:
            all_x.append(pt.x + piece.offset_x)
            all_y.append(-pt.y)

    margin = 5.0  # سم هامش حول الرسم
    min_x, max_x = min(all_x) - margin, max(all_x) + margin
    min_y, max_y = min(all_y) - margin, max(all_y) + margin
    width_cm = max_x - min_x
    height_cm = max_y - min_y

    dwg = svgwrite.Drawing(
        size=(f"{width_cm}cm", f"{height_cm}cm"),
        viewBox=f"{min_x} {min_y} {width_cm} {height_cm}",
    )

    # طبقة منفصلة لكل نوع خط، تسهّل التعديل في برامج التصميم لاحقاً
    layer_seam = dwg.g(id="seam_allowance", stroke="#eb2f06", fill="none", stroke_width=0.05)
    layer_pattern = dwg.g(id="pattern_lines", fill="none")
    layer_labels = dwg.g(id="labels", font_family="Arial", font_size="0.8")

    for piece in pieces:
        if include_seam_allowance and piece.seam_allowance_path:
            sa_path_str = _points_to_svg_path(piece.seam_allowance_path, piece.offset_x)
            sa_path_str += " Z"  # إغلاق المسار لأنه محيط كامل
            layer_seam.add(
                dwg.path(d=sa_path_str, stroke_dasharray="0.3,0.2")
            )

        for path in piece.paths:
            if not include_grainline and path.name == "grainline":
                continue

            path_str = _points_to_svg_path(path.points, piece.offset_x)
            dash = STYLE_DASH.get(path.style)
            stroke_width = 0.05 if path.name not in ("grainline", "dart") else 0.04

            kwargs = {
                "d": path_str,
                "stroke": path.color,
                "stroke_width": stroke_width,
            }
            if dash:
                kwargs["stroke_dasharray"] = dash

            layer_pattern.add(dwg.path(**kwargs))

        if include_labels:
            label_x = piece.offset_x + 2
            label_y = -(piece.paths[0].points[0].y if piece.paths else 0) + 3
            label_text = f"قطعة {piece.piece_index + 1}" + (" (معكوسة)" if piece.is_flipped else "")
            layer_labels.add(dwg.text(label_text, insert=(label_x, label_y), fill="#2f3542"))

    dwg.add(layer_seam)
    dwg.add(layer_pattern)
    dwg.add(layer_labels)

    return dwg.tostring()
