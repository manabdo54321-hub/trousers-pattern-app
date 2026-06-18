"""
schemas.py
----------
كل الـ Pydantic Models المستخدمة في طلبات (Requests) واستجابات (Responses) الـ API.
الفصل بين الـ Schemas ومنطق الحساب (services) يسهّل التعديل والتوسع لاحقاً
(مثلاً إضافة موديل قميص جديد لا يؤثر على هذا الملف إلا بإضافة كلاس جديد).
"""

from pydantic import BaseModel, Field
from typing import List, Optional


# =========================================================
# 1) مدخلات المستخدم (المقاسات الجسدية + إعدادات الباترون)
# =========================================================

class TrousersMeasurements(BaseModel):
    """
    كل المقاسات الجسدية اللازمة لرسم باترون البنطلون.
    القيم الافتراضية (default) مأخوذة من الكود الأصلي بالسنتيمتر.
    """
    total_length: float = Field(92.0, gt=0, description="الطول الكامل للبنطلون من الخصر للكعب")
    waist_width: float = Field(24.5, gt=0, description="نصف عرض الخصر")
    hip_drop: float = Field(18.0, gt=0, description="المسافة من الخصر لخط الأرداف")
    hip_width: float = Field(25.5, gt=0, description="نصف عرض الأرداف")
    crotch_drop: float = Field(27.0, gt=0, description="المسافة من الخصر لخط فتحة الحوض (القُب)")
    thigh_width: float = Field(35.0, gt=0, description="نصف عرض الفخذ")
    knee_drop: float = Field(55.0, gt=0, description="المسافة من الخصر لخط الركبة")
    knee_width: float = Field(21.0, gt=0, description="نصف عرض الركبة")
    hem_width: float = Field(15.0, gt=0, description="نصف عرض نهاية الرجل (الكفة)")
    dart_length: float = Field(10.0, ge=0, description="طول البنس (الكسرة) الخلفي")
    dart_width: float = Field(2.5, ge=0, description="عرض البنس")


class PatternGenerationRequest(BaseModel):
    """
    الطلب الكامل المُرسَل من الفرونت إند عند تغيير أي مقاس أو إعداد.
    """
    measurements: TrousersMeasurements
    seam_allowance: float = Field(1.5, ge=0, le=5, description="سماح الخياطة بالسنتيمتر")

    # إعدادات الـ Nesting (اختيارية، تستخدم فقط لو طلب المستخدم تكرار القطع)
    num_pieces: int = Field(1, ge=1, le=50, description="عدد القطع المكررة (للتصنيع بالجملة)")
    spacing: float = Field(0.0, ge=0, le=50, description="مسافة إضافية بين القطع بالسنتيمتر")
    auto_flip: bool = Field(False, description="عكس القطع الزوجية 180 درجة لتوفير القماش")


# =========================================================
# 2) مخرجات الباك إند (نقاط الباترون الجاهزة للرسم)
# =========================================================

class Point(BaseModel):
    """نقطة ثنائية الأبعاد بالسنتيمتر (وحدة العالم الحقيقي، التحويل لبكسل يتم في الفرونت إند)."""
    x: float
    y: float


class PatternPath(BaseModel):
    """
    مسار واحد (خط الخصر، الجانب، الداخلية، إلخ) كمصفوفة نقاط متصلة.
    """
    name: str = Field(..., description="مفتاح المسار: waist, outseam, hem, inseam, crotch, grainline, dart")
    name_ar: str = Field(..., description="الاسم المعروض بالعربي في الواجهة")
    points: List[Point]
    is_closed: bool = Field(False, description="هل المسار مغلق (مثل سماح الخياطة) أم مفتوح")
    style: str = Field("solid", description="نوع الخط: solid, dashed, dashdot")
    color: str = Field("#1e3799", description="لون الخط الافتراضي (Hex)")


class PatternPiece(BaseModel):
    """
    قطعة باترون كاملة (مثلاً 'بنطلون - الأمام') تحتوي على كل مساراتها،
    بالإضافة إلى موقعها (offset) ومعلومات العكس (flip) لو كانت جزء من Nesting.
    """
    piece_id: str
    piece_index: int = Field(..., description="رقم القطعة في تسلسل التكرار (0, 1, 2...)")
    is_flipped: bool = False
    offset_x: float = 0.0
    offset_y: float = 0.0
    paths: List[PatternPath]
    seam_allowance_path: List[Point]


class PatternGenerationResponse(BaseModel):
    """
    الاستجابة الكاملة المرسلة للفرونت إند، تحتوي على كل القطع المطلوبة
    (قطعة واحدة أو أكثر حسب num_pieces) جاهزة للرسم مباشرة على الكانفاس.
    """
    pieces: List[PatternPiece]

    # أبعاد مرجعية تساعد الفرونت إند على ضبط الكاميرا (pan/zoom) تلقائياً عند أول تحميل
    bounding_box: "BoundingBox"

    # خطوط القياس الأفقية (الخصر، الأرداف، القُب، الركبة، الكفة) لعرضها كمرجع بصري
    measurement_lines: List[float]


class BoundingBox(BaseModel):
    """الصندوق المحيط بكل القطع مجتمعة، لضبط حدود الكانفاس."""
    min_x: float
    max_x: float
    min_y: float
    max_y: float


PatternGenerationResponse.model_rebuild()


# =========================================================
# 3) طلبات التصدير (Export)
# =========================================================

class ExportFormat(BaseModel):
    """
    الطلب المُرسَل لأي endpoint تصدير (SVG / PDF / DXF).
    يحتوي على نفس بيانات القطع الحالية على الكانفاس (بعد أي سحب يدوي من المستخدم)
    حتى يكون الملف المُصدَّر مطابقاً تماماً لما يراه المستخدم.
    """
    pieces: List[PatternPiece]
    page_size: Optional[str] = Field("A4", description="مقاس الصفحة للـ PDF: A4 أو WIDE_PLOTTER")
    include_seam_allowance: bool = True
    include_grainline: bool = True
    include_labels: bool = True
