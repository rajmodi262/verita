import { useCallback, useEffect } from 'react';

export function useMouseNDC(onMove: (x: number, y: number) => void): void {
  const handler = useCallback(
    (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      onMove(x, y);
    },
    [onMove]
  );

  useEffect(() => {
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, [handler]);
}
