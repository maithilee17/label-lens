import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, AlertCircle } from 'lucide-react';

export function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [permissionError, setPermissionError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // Back camera default
  const [isStarting, setIsStarting] = useState(true);

  const startCamera = async (mode) => {
    setIsStarting(true);
    setPermissionError(null);

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('[Camera] Access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('Camera permission was denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError('No camera found on this device. Please upload an image file instead.');
      } else {
        setPermissionError(`Unable to start camera: ${err.message}`);
      }
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleCapture = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `camera-scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
      }
    }, 'image/jpeg', 0.95);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-black rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center gap-2 text-white text-sm font-semibold">
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>Align Expiry Label in Frame</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFacingMode}
              className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-sm transition-all"
              title="Flip Camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-sm transition-all"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Canvas Container */}
        <div className="relative aspect-[4/3] sm:aspect-[16/9] w-full bg-slate-950 flex items-center justify-center overflow-hidden">
          {permissionError ? (
            <div className="p-8 text-center text-white space-y-3 max-w-md">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold">Camera Access Required</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{permissionError}</p>
              <button
                onClick={() => startCamera(facingMode)}
                className="px-4 py-2 text-xs font-bold bg-white text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Retry Camera
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Overlay */}
              <div className="absolute inset-8 sm:inset-16 border-2 border-emerald-400/70 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-emerald-400 -mt-3.5 -ml-3.5"></div>
                  <div className="w-4 h-4 border-t-2 border-r-2 border-emerald-400 -mt-3.5 -mr-3.5"></div>
                </div>
                <div className="text-center">
                  <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[11px] font-medium text-emerald-300">
                    Position MFG / EXP date inside box
                  </span>
                </div>
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-emerald-400 -mb-3.5 -ml-3.5"></div>
                  <div className="w-4 h-4 border-b-2 border-r-2 border-emerald-400 -mb-3.5 -mr-3.5"></div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Capture Controls */}
        <div className="p-6 bg-slate-950 flex items-center justify-center">
          <button
            onClick={handleCapture}
            disabled={!!permissionError || isStarting}
            className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-12 h-12 rounded-full bg-white"></div>
          </button>
        </div>
      </div>
    </div>
  );
}
