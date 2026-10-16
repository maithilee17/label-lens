import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, Sparkles } from 'lucide-react';

export function QualityMetrics({ quality, ocrConfidence }) {
  if (!quality) return null;

  const getRatingBadge = (rating) => {
    switch (rating) {
      case 'good':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> High Quality
          </span>
        );
      case 'acceptable':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" /> Acceptable Quality
          </span>
        );
      case 'poor':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Low Quality
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          Image Quality & OCR Metrics
        </h4>
        {getRatingBadge(quality.overallRating)}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Blur Score</div>
          <div className={`text-base font-bold ${quality.isBlurry ? 'text-rose-600' : 'text-emerald-600'}`}>
            {quality.blurScore || 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{quality.isBlurry ? 'Blurry' : 'Sharp'}</div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Brightness</div>
          <div className={`text-base font-bold ${quality.isDark || quality.isOverexposed ? 'text-amber-600' : 'text-emerald-600'}`}>
            {quality.brightness || 0}/255
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {quality.isDark ? 'Dark' : quality.isOverexposed ? 'Overexposed' : 'Balanced'}
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Resolution</div>
          <div className="text-base font-bold text-slate-800">
            {quality.width}x{quality.height}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{quality.isLowResolution ? 'Low Res' : 'Clear'}</div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">OCR Confidence</div>
          <div className={`text-base font-bold ${ocrConfidence >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {ocrConfidence || 0}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Character Match</div>
        </div>
      </div>

      {quality.warnings && quality.warnings.length > 0 && (
        <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/60 space-y-1.5 text-xs text-amber-900">
          <div className="font-bold flex items-center gap-1.5">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            Quality Warnings & Guidance:
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800 pl-1">
            {quality.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
