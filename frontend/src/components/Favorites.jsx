import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const FavoritesContext = createContext(null);
const STORAGE_KEY = 'left2serve_favorites';

export function FavoritesProvider({ children }) {
  const [ids, setIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch { /* storage unavailable */ }
  }, [ids]);

  const isFavorite = useCallback((id) => ids.includes(id), [ids]);
  const toggle = useCallback((id) => {
    setIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);
  const count = ids.length;

  return (
    <FavoritesContext.Provider value={{ ids, isFavorite, toggle, count }}>
      {children}
    </FavoritesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
