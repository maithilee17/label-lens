import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../services/api';
import { QualityMetrics } from '../components/scanner/QualityMetrics';
import { StatusBadge } from '../components/common/StatusBadge';
import { useToast } from '../context/ToastContext';
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  Sparkles,
  ArrowLeft,
  Save,
  HelpCircle,
  Eye,
  RefreshCw
} from 'lucide-react';

export function VerifyDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const [scan, setScan] = useState(location.state?.scanData || null);
  const [loading, setLoading] = useState(!location.state?.scanData);
  const [saving, setSaving] = useState(false);
  const [showRawOcr, setShowRawOcr] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'food_beverage',
    brand: '',
    manufacturingDate: '',
    manufacturingDatePrecision: 'unknown',
    printedExpiryDate: '',
    printedExpiryDatePrecision: 'unknown',
    shelfLifeMonths: '',
    shelfLifeDuration: '',
    openedAt: '',
    afterOpeningDurationMonths: '',
    notes: ''
  });

  useEffect(() => {
    async function loadScan() {
      if (!scan && id) {
        try {
          const res = await api.get(`/scans/${id}`);
          if (res.data.success) {
            setScan(res.data.scan);
            populateFields(res.data.scan.originalCandidateValues, res.data.scan);
          }
        } catch (err) {
          toast.error('Could not load scan record.');
          navigate('/scan');
        } finally {
          setLoading(false);
        }
      } else if (scan) {
        populateFields(scan.candidateValues || scan.originalCandidateValues, scan);
        setLoading(false);
      }
    }

    loadScan();
  }, [id, scan]);

  const populateFields = (candidateValues = {}, fullScan = {}) => {
    setFormData({
      name: candidateValues.name || '',
      category: candidateValues.category || 'food_beverage',
      brand: candidateValues.brand || '',
      manufacturingDate: candidateValues.manufacturingDate
        ? new Date(candidateValues.manufacturingDate).toISOString().substring(0, 10)
        : '',
      manufacturingDatePrecision: candidateValues.manufacturingDatePrecision || 'unknown',
      printedExpiryDate: candidateValues.printedExpiryDate
        ? new Date(candidateValues.printedExpiryDate).toISOString().substring(0, 10)
        : '',
      printedExpiryDatePrecision: candidateValues.printedExpiryDatePrecision || 'unknown',
      shelfLifeMonths: candidateValues.shelfLifeMonths || (fullScan.shelfLife ? fullScan.shelfLife.months : '') || '',
      shelfLifeDuration: candidateValues.shelfLifeDuration || (fullScan.shelfLife ? fullScan.shelfLife.raw : '') || '',
      openedAt: '',
      afterOpeningDurationMonths: candidateValues.afterOpeningDurationMonths || (fullScan.pao ? fullScan.pao.months : '') || '',
      notes: ''
    });
  };

  const handleSelectCandidate = (candidate, targetField) => {
    const dateStr = new Date(candidate.parsedDate).toISOString().substring(0, 10);
    if (targetField === 'exp') {
      setFormData(prev => ({
        ...prev,
        printedExpiryDate: dateStr,
        printedExpiryDatePrecision: candidate.precision
      }));
      toast.info(`Assigned "${candidate.rawText}" to Expiry Date.`);
    } else if (targetField === 'mfg') {
      setFormData(prev => ({
        ...prev,
        manufacturingDate: dateStr,
        manufacturingDatePrecision: candidate.precision
      }));
      toast.info(`Assigned "${candidate.rawText}" to Manufacturing Date.`);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please enter a product name.');
      return;
    }

    setSaving(true);
    try {
      const scanId = id || scan.scanId || scan._id;
      const res = await api.patch(`/scans/${scanId}/confirm`, formData);

      if (res.data.success) {
        toast.success('Product verified and confirmed in your inventory!');
        navigate('/products');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm product.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
          Loading scan verification details...
        </div>
      </div>
    );
  }

  const imageQuality = scan?.imageQuality || {};
  const candidates = scan?.candidates || scan?.extractedDateCandidates || [];
  const verification = scan?.verification || {};

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/scan')}
            className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Verify Product Details
            </h1>
            <p className="text-xs text-slate-500">
              Review OCR extracted dates and confirm values before adding to your inventory.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge type="verification" value={verification.status || scan?.verificationStatus} />
        </div>
      </div>

      {/* Main Grid: Side-by-side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Image & OCR Quality (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="relative aspect-[4/3] bg-slate-950 flex items-center justify-center">
              <img
                src={scan?.imagePath || scan?.originalImagePath}
                alt="Product Label"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-4 flex items-center justify-between border-t border-slate-100 bg-slate-50">
              <span className="text-xs font-bold text-slate-700">Original Scanned Label</span>
              <button
                type="button"
                onClick={() => setShowRawOcr(prev => !prev)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" />
                {showRawOcr ? 'Hide Raw OCR' : 'View Raw OCR Text'}
              </button>
            </div>
            {showRawOcr && (
              <div className="p-4 bg-slate-900 text-slate-200 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border-t border-slate-800">
                {scan?.ocrText || scan?.originalOcrText || 'No text extracted.'}
              </div>
            )}
          </div>

          {/* Quality Assessment Metrics */}
          <QualityMetrics
            quality={imageQuality}
            ocrConfidence={scan?.ocrConfidence}
          />

          {/* Detected Candidate Selector Chips */}
          {candidates.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Detected Date Candidates
              </h4>
              <p className="text-[11px] text-slate-500">
                Click a candidate below to assign it directly to Expiry Date or Mfg Date:
              </p>
              <div className="space-y-2">
                {candidates.map((c, i) => (
                  <div
                    key={i}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs gap-2"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{c.text || c.rawText}</span>
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 capitalize">
                        {c.type || 'unknown'}
                      </span>
                      {c.isAmbiguous && (
                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                          Ambiguous
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleSelectCandidate(c, 'exp')}
                        className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-lg text-[10px] transition-colors"
                      >
                        Set as EXP
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectCandidate(c, 'mfg')}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-[10px] transition-colors"
                      >
                        Set as MFG
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Pane: Editable Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Confirm & Save Product</h2>
            <p className="text-xs text-slate-500">
              Check all fields carefully. The system will use these values for your reminder schedule.
            </p>
          </div>

          {/* Warnings Banner */}
          {verification?.warnings && verification.warnings.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                Attention Required:
              </div>
              <ul className="list-disc list-inside space-y-0.5 pl-1">
                {verification.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleConfirm} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Greek Yogurt 500g"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="food_beverage">Food & Beverage</option>
                  <option value="skincare">Skincare</option>
                  <option value="makeup_cosmetics">Makeup & Cosmetics</option>
                  <option value="medicine">Medicine</option>
                  <option value="household">Household</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Brand
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={e => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="e.g. Nestlé, CeraVe"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Printed Expiry Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Printed Expiry Date (EXP)
                </label>
                <input
                  type="date"
                  value={formData.printedExpiryDate}
                  onChange={e => setFormData({ ...formData, printedExpiryDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Expiry Date Precision
                </label>
                <select
                  value={formData.printedExpiryDatePrecision}
                  onChange={e => setFormData({ ...formData, printedExpiryDatePrecision: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="day">Day Precision (DD/MM/YYYY)</option>
                  <option value="month">Month Precision (MM/YYYY)</option>
                  <option value="year">Year Precision (YYYY)</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              {/* Manufacturing Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Manufacturing Date (MFG)
                </label>
                <input
                  type="date"
                  value={formData.manufacturingDate}
                  onChange={e => setFormData({ ...formData, manufacturingDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Shelf Life (Months from MFG)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={formData.shelfLifeMonths}
                  onChange={e => setFormData({ ...formData, shelfLifeMonths: e.target.value })}
                  placeholder="e.g. 12, 24"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Period After Opening (PAO) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Period After Opening (PAO Months)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={formData.afterOpeningDurationMonths}
                  onChange={e => setFormData({ ...formData, afterOpeningDurationMonths: e.target.value })}
                  placeholder="e.g. 6 (6M), 12 (12M)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Already Opened? (Optional)
                </label>
                <input
                  type="date"
                  value={formData.openedAt}
                  onChange={e => setFormData({ ...formData, openedAt: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Storage Notes & Instructions
                </label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Keep refrigerated below 4°C after opening."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                ></textarea>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <Link
                to="/scan"
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors text-center border border-slate-200"
              >
                Upload Clearer Image
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Confirming & Saving...' : 'Confirm & Save to Inventory'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
