"""
pdf_exporter.py
---------------
تصدير قطع الباترون كملف PDF بطريقتين شائعتين في صناعة الملابس:

1) A4 Tiled (التقطيع على ورق A4 عادي):
   الباترون الحقيقي أكبر من ورقة A4، فنقسمه إلى "بلاطات" (tiles) بحجم A4،
   كل بلاطة تحمل علامات تطابق (registration marks) في الزوايا، والمستخدم
   يطبعها ويلصقها ببعض بعد قص الحواف، تماماً كأنماط الخياطة التجارية.

2) Wide Plotter (طباعة على رول كبير):
   صفحة واحدة بعرض يكفي كل القطع، تُستخدم مع طابعات الـ plotter الصناعية
   (Rolls) التي تطبع على عرض ثابت (مثلاً 90 أو 150 سم) وطول غير محدود.

نستخدم reportlab لإنشاء PDF مباشرة بالـ vector paths.
"""

from io import BytesIO
from typing import List

from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from reportlab.lib.pagesizes import A4

from app.models.schemas import PatternPiece


CM_TO_PT = cm  # reportlab يتعامل بالـ points، و cm هو معامل التحويل الجاهز منها


def _draw_piece_on_canvas(c: canvas.Canvas, piece: PatternPiece, origin_x_cm: float, origin_y_cm: float):
    """
    يرسم قطعة باترون واحدة على كانفاس reportlab، مع تحويل نظام المحاور
    (y للأعلى في الباترون، لكن reportlab أيضاً y للأعلى من نفس نقطة الأصل،
    لذلك التحويل هنا أبسط من SVG: فقط إزاحة origin).
    """
    c.setLineWidth(0.5)

    # سماح الخياطة (خط متقطع أحمر)
    if piece.seam_allowance_path:
        c.setStrokeColorRGB(0.92, 0.18, 0.02)
        c.setDash(3, 2)
        path = c.beginPath()
        first = piece.seam_allowance_path[0]
        path.moveTo((first.x + piece.offset_x + origin_x_cm) * CM_TO_PT, (first.y + origin_y_cm) * CM_TO_PT)
        for pt in piece.seam_allowance_path[1:]:
            path.lineTo((pt.x + piece.offset_x + origin_x_cm) * CM_TO_PT, (pt.y + origin_y_cm) * CM_TO_PT)
        path.close()
        c.drawPath(path, stroke=1, fill=0)
        c.setDash()  # إعادة تعيين الخط لصلب

    # كل المسارات الأساسية (خط الخصر، الجانب، إلخ)
    for p in piece.paths:
        if p.name == "grainline":
            c.setStrokeColorRGB(0.18, 0.84, 0.45)
            c.setDash(6, 2, 2, 2)
        elif p.name == "dart":
            c.setStrokeColorRGB(0.12, 0.22, 0.6)
            c.setDash()
        else:
            c.setStrokeColorRGB(0.12, 0.22, 0.6)
            c.setDash()

        if len(p.points) < 2:
            continue

        path_obj = c.beginPath()
        first = p.points[0]
        path_obj.moveTo(
            (first.x + piece.offset_x + origin_x_cm) * CM_TO_PT,
            (first.y + origin_y_cm) * CM_TO_PT,
        )
        for pt in p.points[1:]:
            path_obj.lineTo(
                (pt.x + piece.offset_x + origin_x_cm) * CM_TO_PT,
                (pt.y + origin_y_cm) * CM_TO_PT,
            )
        c.drawPath(path_obj, stroke=1, fill=0)

    c.setDash()
    c.setStrokeColorRGB(0, 0, 0)


def export_pattern_to_pdf_plotter(pieces: List[PatternPiece]) -> bytes:
    """
    يصدّر كل القطع على صفحة واحدة بعرض كافٍ (Wide Plotter)، مناسب
    لطابعات الرول الصناعية. الصفحة بحجم مخصص يحتوي بالضبط محيط كل القطع.
    """
    all_x, all_y = [], []
    for piece in pieces:
        for p in piece.paths:
            for pt in p.points:
                all_x.append(pt.x + piece.offset_x)
                all_y.append(pt.y)

    margin = 5.0
    min_x, max_x = min(all_x) - margin, max(all_x) + margin
    min_y, max_y = min(all_y) - margin, max(all_y) + margin
    width_cm = max_x - min_x
    height_cm = max_y - min_y

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(width_cm * CM_TO_PT, height_cm * CM_TO_PT))

    origin_x_cm = -min_x
    origin_y_cm = -min_y

    for piece in pieces:
        _draw_piece_on_canvas(c, piece, origin_x_cm, origin_y_cm)

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.read()


def export_pattern_to_pdf_a4_tiled(pieces: List[PatternPiece]) -> bytes:
    """
    يصدّر الباترون مقسّماً على عدة صفحات A4، كل صفحة تمثل "بلاطة" من
    الرسمة الكلية، مع علامات تطابق (+) في كل زاوية لمساعدة المستخدم
    على لصق البلاطات بدقة بعد الطباعة والقص.
    """
    all_x, all_y = [], []
    for piece in pieces:
        for p in piece.paths:
            for pt in p.points:
                all_x.append(pt.x + piece.offset_x)
                all_y.append(pt.y)

    margin = 2.0
    min_x, max_x = min(all_x) - margin, max(all_x) + margin
    min_y, max_y = min(all_y) - margin, max(all_y) + margin

    page_w_cm, page_h_cm = 21.0, 29.7  # A4
    overlap_cm = 1.5  # تداخل بين البلاطات لتسهيل اللصق ومنع فقدان الحواف
    usable_w = page_w_cm - overlap_cm
    usable_h = page_h_cm - overlap_cm

    total_w = max_x - min_x
    total_h = max_y - min_y
    n_cols = max(1, int(total_w // usable_w) + 1)
    n_rows = max(1, int(total_h // usable_h) + 1)

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)

    for row in range(n_rows):
        for col in range(n_cols):
            tile_origin_x = min_x + col * usable_w
            tile_origin_y = min_y + row * usable_h

            # نزيح كل النقاط بحيث تظهر البلاطة الصحيحة داخل حدود الصفحة فقط
            origin_x_cm = -tile_origin_x
            origin_y_cm = -tile_origin_y

            for piece in pieces:
                _draw_piece_on_canvas(c, piece, origin_x_cm, origin_y_cm)

            # علامات التطابق (registration marks) في زوايا كل بلاطة
            c.setStrokeColorRGB(0.4, 0.4, 0.4)
            c.setLineWidth(0.7)
            mark_size = 0.5 * CM_TO_PT
            for mx, my in [(0, 0), (page_w_cm * CM_TO_PT, 0), (0, page_h_cm * CM_TO_PT), (page_w_cm * CM_TO_PT, page_h_cm * CM_TO_PT)]:
                c.line(mx - mark_size / 2, my, mx + mark_size / 2, my)
                c.line(mx, my - mark_size / 2, mx, my + mark_size / 2)

            # تسمية البلاطة (صف-عمود) لمساعدة الترتيب عند اللصق
            c.setFont("Helvetica", 9)
            c.setFillColorRGB(0.3, 0.3, 0.3)
            c.drawString(0.3 * CM_TO_PT, page_h_cm * CM_TO_PT - 0.5 * CM_TO_PT, f"Tile R{row + 1}-C{col + 1}")

            c.showPage()

    c.save()
    buffer.seek(0)
    return buffer.read()
