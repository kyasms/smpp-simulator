import { useState, useEffect } from 'react';

export default function useSparkline(messages) {
  const [points, setPoints] = useState(() => Array(40).fill(0));

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const c = messages.filter(m => now - m.t < 1000).length;
      setPoints(p => {
        const n = p.slice(1);
        n.push(c);
        return n;
      });
    }, 800);
    return () => clearInterval(id);
  }, [messages]);

  return points;
}
