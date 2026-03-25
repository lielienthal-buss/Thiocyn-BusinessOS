import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// ============================================================================
// Types
// ============================================================================

export interface Brand {
  id: string;
  slug: string;
  name: string;
  category: string;
  tagline: string;
  language: string[];
  status: 'active' | 'paused' | 'archived';
  color: string;
  emoji: string;
  instagram_handle: string | null;
}

interface BrandContextType {
  brands: Brand[];
  activeBrand: Brand | null;
  setActiveBrand: (brand: Brand | null) => void;
  loading: boolean;
}

// ============================================================================
// Context
// ============================================================================

const BrandContext = createContext<BrandContextType>({
  brands: [],
  activeBrand: null,
  setActiveBrand: () => {},
  loading: true,
});

// ============================================================================
// Provider
// ============================================================================

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeBrand, setActiveBrandState] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('brands')
      .select('*')
      .order('name')
      .then(({ data }) => {
        if (data) {
          setBrands(data as Brand[]);
          // Restore last selection from localStorage
          const savedSlug = localStorage.getItem('activeBrandSlug');
          if (savedSlug) {
            const restored = (data as Brand[]).find(b => b.slug === savedSlug) ?? null;
            setActiveBrandState(restored);
          }
        }
        setLoading(false);
      });
  }, []);

  const setActiveBrand = (brand: Brand | null) => {
    setActiveBrandState(brand);
    if (brand) {
      localStorage.setItem('activeBrandSlug', brand.slug);
    } else {
      localStorage.removeItem('activeBrandSlug');
    }
  };

  return (
    <BrandContext.Provider value={{ brands, activeBrand, setActiveBrand, loading }}>
      {children}
    </BrandContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

export const useBrand = () => useContext(BrandContext);

// ============================================================================
// Utility — filter a list by active brand (pass null = show all)
// ============================================================================

export function filterByBrand<T extends { brand?: string | null; brand_slug?: string | null }>(
  items: T[],
  activeBrand: Brand | null
): T[] {
  if (!activeBrand) return items;
  return items.filter(
    item => item.brand === activeBrand.slug || item.brand_slug === activeBrand.slug
  );
}
