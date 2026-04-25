import { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import { QrCode, Camera, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useSocketStore } from '../store/socketStore';
import toast from 'react-hot-toast';

export default function QRScannerPage() {
  const [mode, setMode] = useState('scan'); // 'scan' | 'manual'
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [manualId, setManualId] = useState('');
  const { events: liveEvents } = useSocketStore();
  const scannerRef = useRef(null);
  const htmlScannerRef = useRef(null);

  const recentCheckins = liveEvents.filter(e => e.type === 'checkin:update').slice(0, 10);

  useEffect(() => {
    return () => {
      if (htmlScannerRef.current) {
        try { htmlScannerRef.current.stop(); } catch {}
      }
    };
  }, []);

  const startScanner = async () => {
    if (!scannerRef.current) return;
    setScanning(true);
    try {
      // Dynamic import of html5-qrcode
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      htmlScannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await scanner.stop();
          setScanning(false);
          await handleScan(decodedText);
        },
        () => {}
      );
    } catch (err) {
      setScanning(false);
      toast.error('Camera access denied or unavailable');
    }
  };

  const handleScan = async (payload) => {
    try {
      const { data } = await api.post('/registrations/scan', { payload });
      setResult({ success: true, registration: data.data.registration });
      toast.success(`✅ ${data.data.registration.name} checked in!`);
    } catch (err) {
      const reg = err.response?.data?.data?.registration;
      setResult({
        success: false,
        message: err.response?.data?.message || 'Invalid QR',
        alreadyIn: reg?.checkedIn,
        registration: reg,
      });
      toast.error(err.response?.data?.message || 'Check-in failed');
    }
  };

  const handleManualCheckin = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/registrations/${manualId}/checkin`);
      toast.success('Manual check-in successful');
      setManualId('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    }
  };

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">QR Scanner</h1>
          <p className="text-white/40 text-sm">Scan participant QR codes for entry validation</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMode('scan')} className={`btn-sm ${mode === 'scan' ? 'btn-primary' : 'btn-secondary'}`}>
            <Camera size={14} className="inline mr-1" /> Camera
          </button>
          <button onClick={() => setMode('manual')} className={`btn-sm ${mode === 'manual' ? 'btn-primary' : 'btn-secondary'}`}>
            Manual
          </button>
        </div>
      </div>

      {mode === 'scan' && (
        <div className="glass p-6 space-y-4">
          <div className="relative">
            <div id="qr-reader" ref={scannerRef} className="w-full rounded-xl overflow-hidden bg-black/50 min-h-[300px] flex items-center justify-center">
              {!scanning && (
                <div className="text-center text-white/40">
                  <QrCode size={48} className="mx-auto mb-3 opacity-30" />
                  <p>Camera not started</p>
                </div>
              )}
            </div>

            {/* Scan frame overlay */}
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-56 border-2 border-primary-400 rounded-2xl">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary-400 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary-400 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary-400 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary-400 rounded-br-xl" />
                  <div className="absolute inset-x-4 top-1/2 h-0.5 bg-primary-400/60 animate-pulse-slow" />
                </div>
              </div>
            )}
          </div>

          {!scanning && (
            <button onClick={startScanner} className="btn-primary w-full flex items-center justify-center gap-2">
              <Camera size={16} /> Start Camera Scanner
            </button>
          )}

          {scanning && (
            <button onClick={() => { htmlScannerRef.current?.stop(); setScanning(false); }}
              className="btn-secondary w-full">Stop Scanner</button>
          )}
        </div>
      )}

      {mode === 'manual' && (
        <form onSubmit={handleManualCheckin} className="glass p-6 space-y-4">
          <h3 className="font-semibold text-white">Manual Check-in by Registration ID</h3>
          <input className="input" placeholder="Registration ID (MongoDB ObjectId)" value={manualId}
            onChange={e => setManualId(e.target.value)} required />
          <button type="submit" className="btn-primary w-full">Check In</button>
        </form>
      )}

      {/* Result */}
      {result && (
        <div className={`glass p-5 border ${result.success ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <div className="flex items-center gap-3">
            {result.success
              ? <CheckCircle2 size={24} className="text-emerald-400" />
              : <AlertCircle size={24} className="text-red-400" />
            }
            <div>
              <div className={`font-semibold ${result.success ? 'text-emerald-300' : 'text-red-300'}`}>
                {result.success ? '✅ Check-in Successful' : `❌ ${result.message}`}
              </div>
              {result.registration && (
                <div className="text-sm text-white/60 mt-1">
                  {result.registration.name} · {result.registration.email}
                </div>
              )}
            </div>
          </div>
          <button onClick={() => setResult(null)} className="btn-secondary btn-sm mt-3 w-full">Scan Next</button>
        </div>
      )}

      {/* Live check-in feed */}
      <div className="glass p-5">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse-slow" />
          Live Check-ins
        </h3>
        {recentCheckins.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-4">Waiting for check-ins...</p>
        ) : (
          <div className="space-y-2">
            {recentCheckins.map((ev, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                <span className="text-sm text-white/80">{ev.data?.name || 'Participant'} checked in</span>
                <span className="text-xs text-white/30 ml-auto">{ev.data?.method === 'qr' ? '📱 QR' : '✋ Manual'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
