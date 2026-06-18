/**
 * patternStore.js
 * ---------------
 * المخزن المركزي الوحيد لحالة التطبيق باستخدام Zustand. يحتوي على:
 *
 * 1) المقاسات الحالية وسماح الخياطة (تُحدَّث من Sidebar).
 * 2) إعدادات الـ Nesting (عدد القطع، المسافة، العكس التلقائي).
 * 3) بيانات الباترون المُستلَمة من الباك إند (القطع، الصندوق المحيط).
 * 4) حالة الكانفاس (مستوى الزووم، الإزاحة pan) — منفصلة عن بيانات
 *    الباترون لأنها لا تحتاج طلب API جديد عند تغيّرها.
 * 5) مواضع القطع بعد السحب اليدوي (manual drag offsets)، تُدمَج مع
 *    offset_x الأصلي من الباك إند عند التصدير لضمان التطابق الكامل
 *    بين ما يراه المستخدم على الشاشة وما يُصدَّر فعلياً.
 *
 * لماذا Zustand هنا تحديداً: أي slider في الـ Sidebar يغيّر state كثيراً
 * (أثناء السحب)، ولو استخدمنا Context API العادي كل التطبيق كان سيعيد
 * render حتى الكانفاس نفسه في كل حركة بكسل، وهذا كان سيسبب تهنيج واضح.
 * مع Zustand، فقط المكوّنات التي "تشترك فعلياً" في الجزء المتغيّر من
 * الحالة (عبر selector) تعيد render.
 */

import { create } from 'zustand'
import { DEFAULT_MEASUREMENTS, DEFAULT_SEAM_ALLOWANCE } from '../utils/constants'

export const usePatternStore = create((set, get) => ({
  // -----------------------------------------------------
  // 1) المقاسات وسماح الخياطة
  // -----------------------------------------------------
  measurements: { ...DEFAULT_MEASUREMENTS },
  seamAllowance: DEFAULT_SEAM_ALLOWANCE,

  updateMeasurement: (key, value) =>
    set((state) => ({
      measurements: { ...state.measurements, [key]: value },
    })),

  setSeamAllowance: (value) => set({ seamAllowance: value }),

  resetMeasurements: () =>
    set({ measurements: { ...DEFAULT_MEASUREMENTS }, seamAllowance: DEFAULT_SEAM_ALLOWANCE }),

  // -----------------------------------------------------
  // 2) إعدادات الـ Nesting
  // -----------------------------------------------------
  nestingOptions: {
    numPieces: 1,
    spacing: 0.0,
    autoFlip: false,
  },

  updateNestingOption: (key, value) =>
    set((state) => ({
      nestingOptions: { ...state.nestingOptions, [key]: value },
    })),

  // -----------------------------------------------------
  // 3) بيانات الباترون من الباك إند
  // -----------------------------------------------------
  pieces: [],
  boundingBox: null,
  measurementLines: [],
  isLoading: false,
  error: null,

  setPatternData: (data) =>
    set({
      pieces: data.pieces,
      boundingBox: data.bounding_box,
      measurementLines: data.measurement_lines,
      // عند استلام بيانات جديدة بالكامل (تغيير مقاس)، نصفّر أي إزاحات
      // يدوية سابقة لأن القطع نفسها تغيّر شكلها وحجمها
      manualOffsets: {},
    }),

  setLoading: (value) => set({ isLoading: value }),
  setError: (value) => set({ error: value }),

  // -----------------------------------------------------
  // 4) حالة الكانفاس (زووم وإزاحة الكاميرا)
  // -----------------------------------------------------
  zoom: 1,
  panX: 0,
  panY: 0,

  setZoom: (zoom) => set({ zoom }),
  setPan: (panX, panY) => set({ panX, panY }),

  // -----------------------------------------------------
  // 5) الإزاحات اليدوية لكل قطعة (Manual Drag) بالسنتيمتر
  //    مفتاح الـ object هو piece_id، والقيمة { dx, dy }
  // -----------------------------------------------------
  manualOffsets: {},

  updateManualOffset: (pieceId, dx, dy) =>
    set((state) => ({
      manualOffsets: {
        ...state.manualOffsets,
        [pieceId]: { dx, dy },
      },
    })),

  resetManualOffsets: () => set({ manualOffsets: {} }),

  /**
   * يرجع نسخة من القطع بعد دمج الإزاحات اليدوية مع offset_x الأصلي،
   * جاهزة للإرسال مباشرة لأي endpoint تصدير. هذا يضمن أن الملف
   * المُصدَّر يطابق بالضبط ما يراه المستخدم على الشاشة.
   */
  getPiecesForExport: () => {
    const { pieces, manualOffsets } = get()
    return pieces.map((piece) => {
      const manual = manualOffsets[piece.piece_id]
      if (!manual) return piece
      return {
        ...piece,
        offset_x: piece.offset_x + manual.dx,
        offset_y: (piece.offset_y ?? 0) + manual.dy,
      }
    })
  },
}))
