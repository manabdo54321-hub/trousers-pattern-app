"""
nesting.py
----------
منطق "التعشيش الآلي" (Auto-Nesting): تكرار قطعة الباترون عدة مرات بجانب
بعضها بأقل مسافة ممكنة (بدون تداخل)، مع خيار عكس القطع الزوجية 180 درجة
لتوفير القماش (تقنية شائعة في صناعة الملابس تسمى "nesting/mirroring").

هذا الملف منقول من منطق InteractivePatternRenderer الأصلي (دوال
draw_canvas الخاصة بحساب step_x والعكس)، لكنه الآن "خالص حسابات" بدون
أي رسم، لأن الرسم انتقل بالكامل لمسؤولية الفرونت إند (Fabric.js).
"""

import numpy as np
from typing import Dict, List


def calculate_piece_width(paths: Dict[str, np.ndarray], seam_allowance: float) -> Dict[str, float]:
    """
    يحسب الصندوق المحيط (bounding box) بقطعة واحدة، والعرض الفعلي
    شاملاً سماح الخياطة على الجانبين، تماماً كما كان يحدث في
    __init__ الخاص بـ InteractivePatternRenderer الأصلي.
    """
    all_x = np.concatenate([p[:, 0] for p in paths.values()])
    all_y = np.concatenate([p[:, 1] for p in paths.values()])

    min_x = float(np.min(all_x))
    max_x = float(np.max(all_x))
    min_y = float(np.min(all_y))
    max_y = float(np.max(all_y))
    center_y = (max_y + min_y) / 2.0

    actual_piece_width = (max_x - min_x) + (seam_allowance * 2)

    return {
        "min_x": min_x,
        "max_x": max_x,
        "min_y": min_y,
        "max_y": max_y,
        "center_y": center_y,
        "actual_piece_width": actual_piece_width,
    }


def flip_path(path: np.ndarray, center_y: float) -> np.ndarray:
    """
    يعكس مسار 180 درجة حول مركز القطعة، بنفس منطق toggle_flip الأصلي:
    عكس المحور x (مرآة) ثم عكس y حول center_y (دوران نصف لفة فعليًا).
    """
    flipped = path.copy()
    flipped[:, 0] = -flipped[:, 0]
    flipped[:, 1] = 2 * center_y - flipped[:, 1]
    return flipped


def generate_nested_layout(
    base_paths: Dict[str, np.ndarray],
    base_sa_path: np.ndarray,
    seam_allowance: float,
    num_pieces: int,
    spacing: float,
    auto_flip: bool,
) -> List[Dict]:
    """
    يولّد قائمة من القطع المُرحَّلة أفقياً (offset_x) جاهزة للتصدير والعرض،
    بنفس معادلة step_x الأصلية: عرض القطعة + 0.1 سم أمان + المسافة الإضافية.

    يرجع قائمة dicts، كل عنصر يحتوي على:
        - index: رقم القطعة
        - offset_x: الإزاحة الأفقية بالسنتيمتر
        - is_flipped: هل هذه القطعة معكوسة
        - paths: نسخة من المسارات بعد العكس (بدون الإزاحة، تُطبَّق في الفرونت إند أو التصدير)
        - sa_path: نسخة من مسار سماح الخياطة بعد العكس
    """
    dims = calculate_piece_width(base_paths, seam_allowance)
    step_x = dims["actual_piece_width"] + 0.1 + spacing
    center_y = dims["center_y"]

    pieces = []
    for i in range(num_pieces):
        is_flipped = auto_flip and (i % 2 != 0)
        offset_x = i * step_x

        piece_paths = {}
        for key, path in base_paths.items():
            piece_paths[key] = flip_path(path, center_y) if is_flipped else path.copy()

        piece_sa = flip_path(base_sa_path, center_y) if is_flipped else base_sa_path.copy()

        pieces.append(
            {
                "index": i,
                "offset_x": offset_x,
                "is_flipped": is_flipped,
                "paths": piece_paths,
                "sa_path": piece_sa,
            }
        )

    return pieces
