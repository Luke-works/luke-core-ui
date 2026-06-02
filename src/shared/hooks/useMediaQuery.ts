import { useEffect, useState } from 'react';

/**
 * useMediaQuery — subscribe to a CSS media query and re-render on change.
 * SSR-safe: returns `false` until mounted on the client.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/**
 * useIsMobile — true below the `lg` (1024px) breakpoint, where the layout
 * switches the sidebar from a pinned column to an off-canvas drawer.
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 1023px)');
}
