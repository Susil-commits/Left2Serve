import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useFavoritesStore = create(
  persist(
    (set, get) => ({
      ids: [],
      isFavorite: (id) => get().ids.includes(id),
      toggle: (id) =>
        set((state) => ({
          ids: state.ids.includes(id)
            ? state.ids.filter((x) => x !== id)
            : [...state.ids, id],
        })),
    }),
    {
      name: 'left2serve_favorites',
    }
  )
);

export function useFavorites() {
  const store = useFavoritesStore();
  return {
    ids: store.ids,
    isFavorite: store.isFavorite,
    toggle: store.toggle,
    count: store.ids.length,
  };
}

// Dummy provider to keep App.jsx happy before we clean it up
export function FavoritesProvider({ children }) {
  return children;
}
