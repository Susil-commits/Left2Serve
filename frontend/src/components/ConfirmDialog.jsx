import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      setDialog({
        title: opts.title || 'Are you sure?',
        message: opts.message || '',
        confirmLabel: opts.confirmLabel || 'Confirm',
        cancelLabel: opts.cancelLabel || 'Cancel',
        variant: opts.variant || 'danger',
        icon: opts.icon,
        resolve,
      });
    });
  }, []);

  const close = useCallback((result) => {
    setDialog((d) => {
      if (d) d.resolve(result);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [dialog, close]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => close(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-7 animate-scale-in">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${dialog.variant === 'danger' ? 'bg-red-50' : 'bg-accent/10'}`}>
                {dialog.icon || (dialog.variant === 'danger' ? (
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                ) : (
                  <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.228 9.75a4.5 4.5 0 018.544 0M9 13.5h6m-7 2.25h8M5.25 6.75h13.5a2.25 2.25 0 012.25 2.25v8.69c0 .597-.237 1.17-.659 1.591l-3.866 3.866A2.25 2.25 0 0114.69 23.25H5.25A2.25 2.25 0 013 21V9a2.25 2.25 0 012.25-2.25z" /></svg>
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <h3 id="confirm-title" className="text-lg font-bold text-text">{dialog.title}</h3>
                {dialog.message && <p className="text-subtle text-sm mt-1.5 leading-relaxed">{dialog.message}</p>}
              </div>
            </div>
            <div className="flex gap-3 mt-7">
              <button onClick={() => close(false)} autoFocus className="btn-outline flex-1 !py-2.5 !rounded-xl">{dialog.cancelLabel}</button>
              <button onClick={() => close(true)} className={`flex-1 !py-2.5 !rounded-xl font-semibold text-white transition-all ${dialog.variant === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red' : 'btn-primary'}`}>{dialog.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}
