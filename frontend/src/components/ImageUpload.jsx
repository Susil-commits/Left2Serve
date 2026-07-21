import { useState, useRef } from 'react';
import { api } from '../api';
import { useToast } from './Toast';

const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export default function ImageUpload({ onUpload, images = [], onRemove }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState([]);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();

  const uploadFiles = async (files) => {
    if (!files.length) return;
    if (images.length + files.length > MAX_FILES) {
      addToast(`You can upload up to ${MAX_FILES} photos`, 'error');
      return;
    }
    const valid = files.filter(f => ALLOWED.includes(f.type));
    if (valid.length !== files.length) addToast('Only JPG, PNG, and WEBP images are allowed', 'error');
    const sized = valid.filter(f => f.size <= MAX_SIZE);
    if (sized.length !== valid.length) addToast('Some images exceed 10MB and were skipped', 'error');
    if (!sized.length) return;
    setUploading(true);
    
    // Generate local previews
    const localPreviews = sized.map(f => URL.createObjectURL(f));
    setPreviews(localPreviews);

    try {
      const formData = new FormData();
      sized.forEach(f => formData.append('images', f));
      const data = await api.listings.upload(formData);
      onUpload([...images, ...data.urls].slice(0, MAX_FILES));
      addToast('Photo uploaded', 'success');
    } catch (err) {
      addToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      // Revoke blob URLs to avoid memory leaks
      localPreviews.forEach(p => URL.revokeObjectURL(p));
      setPreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-3">
        {images.map((url, i) => (
          <div key={`img-${i}`} className="relative group animate-scale-in">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border border-border shadow-sm hover-glow"><img src={url} alt={`Photo ${i + 1}`} loading="lazy" className="w-full h-full object-cover" /></div>
            <button onClick={() => onRemove(i)} aria-label={`Remove photo ${i + 1}`} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-all shadow-lg hover:scale-110">×</button>
          </div>
        ))}
        {previews.map((url, i) => (
          <div key={`preview-${i}`} className="relative group animate-scale-in">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border border-accent/50 shadow-sm opacity-70"><img src={url} alt="Uploading..." loading="lazy" className="w-full h-full object-cover grayscale" /></div>
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin shadow-md" />
            </div>
          </div>
        ))}
        {(images.length + previews.length) < MAX_FILES && (
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} aria-label="Upload photos"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')); if (files.length) uploadFiles(files); }}
            className={`w-24 h-24 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${dragOver ? 'border-accent bg-accent/5 scale-105' : 'border-border hover:border-accent/40 hover:bg-accent/2 hover:scale-105'}`}>
            <svg className="w-6 h-6 text-muted group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
            <span className="text-[10px] text-muted group-hover:text-accent mt-1.5 font-medium transition-colors">Upload</span>
          </button>
        )}
      </div>
      <p className="text-xs text-muted">Up to {MAX_FILES} photos · JPG, PNG, WEBP · max 10MB each</p>
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={async (e) => { const files = Array.from(e.target.files); if (files.length) await uploadFiles(files); }} className="hidden" />
    </div>
  );
}
