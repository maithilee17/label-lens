import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { CameraCapture } from '../components/scanner/CameraCapture';
import { AddProductModal } from '../components/products/AddProductModal';
import { useToast } from '../context/ToastContext';
import {
  Camera,
  Upload,
  AlertCircle,
  FileImage,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Edit3,
  CheckCircle2
} from 'lucide-react';

export function ScanProduct() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);
  const toast = useToast();
  const navigate = useNavigate();

  const handleFileChange = (file) => {
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError('Please upload a supported image file (JPEG, PNG, or WebP).');
      return;
    }

    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image file size must be under 10MB.');
      return;
    }

    setError('');
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleCameraCapture = (file) => {
    setIsCameraOpen(false);
    handleFileChange(file);
  };

  const handleStartOCR = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError('');
    setProcessingStep('Validating format and analyzing image sharpness...');

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      setProcessingStep('Preprocessing image and running Tesseract OCR...');
      const res = await api.post('/scans', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        toast.success('Label scanned! Review detected values.');
        navigate(`/verify/${res.data.scanId}`, { state: { scanData: res.data } });
      }
    } catch (err) {
      console.error('[Scan] Error:', err);
      setError(err.response?.data?.message || 'Failed to process image scan. Please try a clearer photo or manual entry.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveManualProduct = async (productData) => {
    const res = await api.post('/products', productData);
    if (res.data.success) {
      toast.success('Product added manually!');
      navigate('/products');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Scan Product Label
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
          Capture or upload the portion of the package showing the manufacturing date (MFG), expiry date (EXP), best-before (BBE), or period-after-opening (PAO).
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Upload & Camera Box */}
      {!previewUrl ? (
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          className="bg-white rounded-3xl border-2 border-dashed border-slate-300 hover:border-emerald-500 p-8 sm:p-12 text-center transition-all shadow-sm space-y-6"
        >
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-100 shadow-sm">
            <Upload className="w-8 h-8 stroke-[1.8]" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-800">
              Drag & Drop your product label image
            </h3>
            <p className="text-xs text-slate-400">
              Supports JPEG, PNG, and WebP (up to 10MB)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm transition-all"
            >
              Browse Photo
            </button>

            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 transition-all"
            >
              <Camera className="w-4 h-4" />
              Use Camera
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])}
          />
        </div>
      ) : (
        /* Image Preview & Scan Action */
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="relative aspect-[4/3] sm:aspect-[16/9] w-full max-h-[420px] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-100">
            <img
              src={previewUrl}
              alt="Label Preview"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl('');
              }}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            >
              Choose Different Image
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleStartOCR}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{processingStep}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run OCR & Date Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Manual Entry Fallback Notice */}
      <div className="p-4 rounded-2xl bg-slate-100/80 border border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Edit3 className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-800">Label unreadable or missing?</span> You can always add items manually without scanning.
          </div>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline flex-shrink-0 ml-2"
        >
          Add Manually
        </button>
      </div>

      {/* Camera Capture Modal */}
      {isCameraOpen && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setIsCameraOpen(false)}
        />
      )}

      {/* Manual Entry Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveManualProduct}
      />
    </div>
  );
}
