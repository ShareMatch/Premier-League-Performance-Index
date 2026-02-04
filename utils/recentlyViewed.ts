import { Team } from "../types";

const RECENTLY_VIEWED_KEY = "recently_viewed_assets";
const MAX_ITEMS = 3;

export const saveRecentlyViewed = (asset: Team) => {
  try {
    const existing = getRecentlyViewed();
    // Remove if already exists (to move it to top)
    const filtered = existing.filter((item) => item.id !== asset.id);
    // Add to front
    const updated = [asset, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
  } catch (error) {
    // console.error("Failed to save recently viewed:", error);
  }
};

export const getRecentlyViewed = (): Team[] => {
  try {
    const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    // console.error("Failed to get recently viewed:", error);
    return [];
  }
};
