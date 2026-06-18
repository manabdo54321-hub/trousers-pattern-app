"""
export.py
---------
نقاط النهاية (Endpoints) الخاصة بتصدير الباترون النهائي (بعد أي تعديل
يدوي بالسحب على الكانفاس) إلى صيغ صناعية: SVG, PDF (A4 أو Plotter), DXF.

كل endpoint يستقبل نفس بيانات القطع الحالية (ExportFormat schema)
ويرجع ملفاً (Response) مباشراً بالـ Content-Type المناسب، حتى يبدأ
المتصفح تنزيله فوراً دون أي معالجة إضافية في الفرونت إند.
"""

from fastapi import APIRouter, Query
from fastapi.responses import Response

from app.models.schemas import ExportFormat
from app.exporters.svg_exporter import export_pattern_to_svg
from app.exporters.pdf_exporter import export_pattern_to_pdf_a4_tiled, export_pattern_to_pdf_plotter
from app.exporters.dxf_exporter import export_pattern_to_dxf

router = APIRouter(prefix="/api/export", tags=["Export"])


@router.post("/svg")
def export_svg(request: ExportFormat):
    """يصدّر الباترون كملف SVG قابل للتعديل في برامج التصميم المتجهي."""
    svg_content = export_pattern_to_svg(
        pieces=request.pieces,
        include_seam_allowance=request.include_seam_allowance,
        include_grainline=request.include_grainline,
        include_labels=request.include_labels,
    )
    return Response(
        content=svg_content,
        media_type="image/svg+xml",
        headers={"Content-Disposition": "attachment; filename=trousers_pattern.svg"},
    )


@router.post("/pdf")
def export_pdf(
    request: ExportFormat,
    page_size: str = Query("A4", description="A4 للتقطيع المنزلي، WIDE_PLOTTER لطابعة الرول الصناعية"),
):
    """
    يصدّر الباترون كملف PDF بطريقتين:
    - A4: صفحات متعددة قابلة للطباعة المنزلية والتقطيع واللصق.
    - WIDE_PLOTTER: صفحة واحدة بعرض كامل، لطابعات الرول الصناعية.
    """
    if page_size.upper() == "WIDE_PLOTTER":
        pdf_bytes = export_pattern_to_pdf_plotter(request.pieces)
        filename = "trousers_pattern_plotter.pdf"
    else:
        pdf_bytes = export_pattern_to_pdf_a4_tiled(request.pieces)
        filename = "trousers_pattern_a4_tiled.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/dxf")
def export_dxf(request: ExportFormat):
    """يصدّر الباترون كملف DXF لاستخدامه مباشرة في ماكينات القطع بالليزر/CNC."""
    dxf_bytes = export_pattern_to_dxf(
        pieces=request.pieces,
        include_seam_allowance=request.include_seam_allowance,
        include_grainline=request.include_grainline,
        include_labels=request.include_labels,
    )
    return Response(
        content=dxf_bytes,
        media_type="application/dxf",
        headers={"Content-Disposition": "attachment; filename=trousers_pattern.dxf"},
    )
