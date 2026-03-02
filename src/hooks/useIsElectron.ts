import { useState, useEffect } from 'react';

export function useIsElectron() {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setIsElectron(!!window.electron?.isElectron);
  }, []);

  return isElectron;
}
