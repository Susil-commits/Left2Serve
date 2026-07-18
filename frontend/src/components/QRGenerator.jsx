import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api';

export default function QRGenerator({ reservationId, onClose }) {
  const [token, setToken] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.reservations.getQrToken(reservationId)
      .then(res => setToken(res.token))
      .catch(err => setError(err.message));
  }, [reservationId]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative animate-scale-in">
        <button onClick={onClose} className="absolute top-4 right-4 text-subtle hover:text-text">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h3 className="text-xl font-bold mb-2 text-text">Pickup QR Code</h3>
        <p className="text-subtle text-sm mb-6">Show this code to the donor to collect your reservation.</p>
        
        {error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium">{error}</div>
        ) : !token ? (
          <div className="animate-pulse bg-gray-100 w-48 h-48 mx-auto rounded-xl"></div>
        ) : (
          <div className="bg-white p-4 inline-block rounded-xl shadow-sm border border-border">
            <QRCodeSVG value={token} size={200} level="H" />
          </div>
        )}
      </div>
    </div>
  );
}
