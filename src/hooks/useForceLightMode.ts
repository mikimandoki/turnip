import { useLayoutEffect } from 'react';

export function useForceLightMode() {
  useLayoutEffect(() => {
    const html = document.documentElement;
    const prev = html.getAttribute('data-theme');
    html.removeAttribute('data-theme');
    return () => {
      if (prev) html.setAttribute('data-theme', prev);
    };
  }, []);
}
