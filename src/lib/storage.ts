export interface SavedDesign {
  id: string;
  text: string;
  author: string;
  fontFamily: string;
  textColor: string;
  bgColor: string;
  bgImage?: string; // Data URL or external URL
  overlayOpacity?: number; // 0 to 1
  createdAt: number;
}

const STORAGE_KEY = 'wetalkto_designs';

export const saveDesign = (design: Omit<SavedDesign, 'id' | 'createdAt'>, existingId?: string): SavedDesign => {
  const designs = getDesigns();

  const newDesign: SavedDesign = {
    ...design,
    id: existingId || crypto.randomUUID(),
    createdAt: Date.now(),
  };

  if (existingId) {
    const index = designs.findIndex(d => d.id === existingId);
    if (index !== -1) {
      designs[index] = newDesign;
    } else {
      designs.unshift(newDesign);
    }
  } else {
    designs.unshift(newDesign);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
  return newDesign;
};

export const getDesigns = (): SavedDesign[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load designs", e);
    return [];
  }
};

export const getDesignById = (id: string): SavedDesign | undefined => {
  const designs = getDesigns();
  return designs.find(d => d.id === id);
};

export const deleteDesign = (id: string): void => {
  const designs = getDesigns().filter(d => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
};
