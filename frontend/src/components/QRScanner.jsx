import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../api';

export default function QRScanner({ onClose, onSuccess }) {
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(true);
  const scannerRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (decodedText) => {
        if (!scanning) return;
        setScanning(false);
        try {
          scanner.pause();
          await api.reservations.verifyQr({ token: decodedText });
          onSuccess();
        } catch (err) {
          setError(err.message);
          setTimeout(() => {
            setError('');
            setScanning(true);
            scanner.resume();
          }, 3000);
        }
      },
      () => {}
    ).catch(err => {
      setError('Camera access denied or unavailable.');
    });

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <div className="p-4 flex justify-between items-center bg-black/50 text-white absolute top-0 w-full z-10">
        <h3 className="font-bold">Scan to Verify Pickup</h3>
        <button onClick={onClose} className="font-medium hover:text-gray-300">Close</button>
      </div>
      
      {error && (
        <div className="absolute top-16 left-4 right-4 z-20 bg-red-500 text-white p-3 rounded-xl text-center text-sm font-semibold shadow-lg animate-fade-in">
          {error}
        </div>
      )}

      <div className="flex-1 flex items-center justify-center relative">
        <div id="qr-reader" className="w-full max-w-md"></div>
        {!scanning && !error && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-white text-xl font-bold flex items-center gap-2">
              <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Verifying...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
