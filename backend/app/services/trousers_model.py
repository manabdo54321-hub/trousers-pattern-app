"""
trousers_model.py
------------------
المنطق الرياضي الكامل لحساب نقاط باترون البنطلون (الخصر، الأرداف، فتحة الحوض،
الفخذ، الركبة، الكفة) بالإضافة إلى حساب سماح الخياطة (Seam Allowance).

هذا الملف هو "العقل" الهندسي للتطبيق، منقول من الكود الأصلي بنفس المعادلات
بالضبط، مع تعديل واحد فقط: المقاسات (self.p) أصبحت تُمرَّر من الخارج
(من Pydantic schema) بدل القيم الثابتة hardcoded، حتى تستجيب لتغييرات
المستخدم في الـ Sidebar.
"""

import numpy as np
from typing import Dict

from app.services.bezier import BezierCurve


class TrousersParametricModel:
    def __init__(self, measurements: Dict[str, float], seam_allowance: float = 1.5):
        """
        measurements: dict يحتوي على كل المقاسات (نفس مفاتيح TrousersMeasurements)
        seam_allowance: سماح الخياطة بالسنتيمتر
        """
        self.p = dict(measurements)
        self.p["seam_allowance"] = seam_allowance
        self.calculate_key_points()

    # ---------------------------------------------------
    # حساب النقاط المرجعية الأساسية (خطوط القياس + حدود العرض)
    # ---------------------------------------------------
    def calculate_key_points(self):
        self.y_hem = 0.0
        self.y_knee = self.p["total_length"] - self.p["knee_drop"]
        self.y_crotch = self.p["total_length"] - self.p["crotch_drop"]
        self.y_hip = self.p["total_length"] - self.p["hip_drop"]
        self.y_waist = self.p["total_length"]

        self.hem_in = -self.p["hem_width"] / 2.0
        self.hem_out = self.p["hem_width"] / 2.0
        self.knee_in = -self.p["knee_width"] / 2.0
        self.knee_out = self.p["knee_width"] / 2.0

        self.thigh_out = self.knee_out + 2.0
        self.thigh_in = self.thigh_out - self.p["thigh_width"]
        self.hip_out = self.knee_out + 2.5
        self.hip_in = self.hip_out - self.p["hip_width"]

        self.waist_out = self.knee_out + 1.0
        self.waist_in = self.waist_out - self.p["waist_width"]
        self.y_waist_in = self.y_waist + 1.5
        self.y_waist_out = self.y_waist - 0.5

    # ---------------------------------------------------
    # توليد كل مسارات الباترون (الخصر، الجانب، الكفة، الداخلية، القُب، خط القماش، البنس)
    # ---------------------------------------------------
    def generate_pattern_paths(self) -> Dict[str, np.ndarray]:
        paths = {}
        paths["waist"] = np.array(
            [[self.waist_in, self.y_waist_in], [self.waist_out, self.y_waist_out]]
        )

        p_waist_out = [self.waist_out, self.y_waist_out]
        p_hip_out = [self.hip_out, self.y_hip]
        p_thigh_out = [self.thigh_out, self.y_crotch]
        p_knee_out = [self.knee_out, self.y_knee]
        p_hem_out = [self.hem_out, self.y_hem]

        upper_outseam = BezierCurve.compute_cubic_bezier(
            p_waist_out,
            [p_waist_out[0] + 0.8, p_waist_out[1] - 5],
            [p_hip_out[0] + 0.5, p_hip_out[1] + 3],
            p_hip_out,
        )
        lower_outseam = np.array([p_hip_out, p_thigh_out, p_knee_out, p_hem_out])
        paths["outseam"] = np.vstack((upper_outseam, lower_outseam[1:]))

        paths["hem"] = np.array([[self.hem_out, self.y_hem], [self.hem_in, self.y_hem]])

        p_hem_in = [self.hem_in, self.y_hem]
        p_knee_in = [self.knee_in, self.y_knee]
        p_thigh_in = [self.thigh_in, self.y_crotch]

        inseam_curve = BezierCurve.compute_cubic_bezier(
            p_knee_in,
            [p_knee_in[0] - 0.5, p_knee_in[1] + 10],
            [p_thigh_in[0] + 2.0, p_thigh_in[1] - 4],
            p_thigh_in,
        )
        paths["inseam"] = np.vstack((np.array([p_hem_in, p_knee_in]), inseam_curve[1:]))

        p_waist_in = [self.waist_in, self.y_waist_in]
        p_hip_in = [self.hip_in, self.y_hip]

        crotch_curve = BezierCurve.compute_cubic_bezier(
            p_hip_in,
            [p_hip_in[0] - 0.5, self.y_crotch + 2.0],
            [p_hip_in[0] - 2.0, self.y_crotch],
            p_thigh_in,
        )
        paths["crotch"] = np.vstack((np.array([p_waist_in, p_hip_in]), crotch_curve[1:]))
        paths["grainline"] = np.array([[0.0, self.y_hem + 2.0], [0.0, self.y_waist - 2.0]])

        # البنس (الكسرة) الخلفي عند الخصر
        dart_center_x = (self.waist_in + self.waist_out) / 2.0
        dart_center_y = (self.y_waist_in + self.y_waist_out) / 2.0
        dx = self.waist_out - self.waist_in
        dy = self.y_waist_out - self.y_waist_in
        length = np.hypot(dx, dy)
        nx, ny = -dy / length, dx / length

        p_dart_tip = [
            dart_center_x - nx * self.p["dart_length"],
            dart_center_y - ny * self.p["dart_length"],
        ]
        p_dart_l = [
            dart_center_x - (dx / length) * (self.p["dart_width"] / 2),
            dart_center_y - (dy / length) * (self.p["dart_width"] / 2),
        ]
        p_dart_r = [
            dart_center_x + (dx / length) * (self.p["dart_width"] / 2),
            dart_center_y + (dy / length) * (self.p["dart_width"] / 2),
        ]
        paths["dart"] = np.array([p_dart_l, p_dart_tip, p_dart_r])

        return paths

    # ---------------------------------------------------
    # حساب مسار سماح الخياطة (Offset Path) حول محيط القطعة بالكامل
    # ---------------------------------------------------
    def generate_seam_allowance(self, paths: Dict[str, np.ndarray]) -> np.ndarray:
        raw_perimeter = np.vstack(
            (
                paths["waist"],
                paths["outseam"][1:],
                paths["hem"][1:],
                paths["inseam"][1:],
                paths["crotch"][:, :][::-1][1:],
            )
        )

        # إزالة النقاط المكررة المتتالية (تحدث عند نقاط التقاء المسارات)
        perimeter_list = [raw_perimeter[0]]
        for pt in raw_perimeter[1:]:
            if not np.allclose(pt, perimeter_list[-1], atol=1e-5):
                perimeter_list.append(pt)
        if np.allclose(perimeter_list[-1], perimeter_list[0], atol=1e-5):
            perimeter_list.pop()
        perimeter = np.array(perimeter_list)

        sa = self.p["seam_allowance"]
        sa_points = []
        n = len(perimeter)

        for i in range(n):
            p_curr = perimeter[i]
            p_prev = perimeter[i - 1]
            p_next = perimeter[(i + 1) % n]

            v1 = p_curr - p_prev
            v1 /= np.linalg.norm(v1) + 1e-8
            n1 = np.array([-v1[1], v1[0]])

            v2 = p_next - p_curr
            v2 /= np.linalg.norm(v2) + 1e-8
            n2 = np.array([-v2[1], v2[0]])

            n_avg = n1 + n2
            n_avg_norm = np.linalg.norm(n_avg)
            if n_avg_norm > 0:
                n_avg /= n_avg_norm
            else:
                n_avg = n1

            cos_theta = np.dot(n1, n_avg)
            factor = 1.0 / max(cos_theta, 0.6)
            sa_points.append(p_curr + n_avg * sa * factor)

        return np.array(sa_points)
