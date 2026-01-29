import { useState, useEffect } from 'react';

/**
 * Hook to manage user favorites (asset IDs)
 * Persisted in localStorage for now.
 */
export const useFavorites = () => {
    const [favorites, setFavorites] = useState<string[]>(() => {
        const stored = localStorage.getItem('sm_favorites');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return [];
            }
        }
        return [];
    });

    const toggleFavorite = (id: string) => {
        const stored = localStorage.getItem('sm_favorites');
        let current: string[] = [];
        if (stored) {
            try {
                current = JSON.parse(stored);
            } catch (e) {
                current = [];
            }
        }

        const next = current.includes(id)
            ? current.filter(item => item !== id)
            : [...current, id];

        localStorage.setItem('sm_favorites', JSON.stringify(next));
        setFavorites(next);
        window.dispatchEvent(new CustomEvent('favorites-updated', { detail: next }));
    };

    const isFavorite = (assetId: string) => favorites.includes(assetId);

    // Sync across components in the same tab
    useEffect(() => {
        const handleSync = (e: any) => {
            if (e instanceof CustomEvent && e.detail) {
                setFavorites(e.detail);
            } else {
                const stored = localStorage.getItem('sm_favorites');
                setFavorites(stored ? JSON.parse(stored) : []);
            }
        };

        window.addEventListener('favorites-updated', handleSync as any);
        window.addEventListener('storage', handleSync); // For cross-tab sync
        return () => {
            window.removeEventListener('favorites-updated', handleSync as any);
            window.removeEventListener('storage', handleSync);
        };
    }, []);

    return { favorites, toggleFavorite, isFavorite };
};
