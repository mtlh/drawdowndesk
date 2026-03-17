import { useSyncExternalStore } from 'react';

function subscribe() {
  return () => {};
}

export function useIsElectron() {
  return useSyncExternalStore(
    subscribe,
    () => !!window.electron?.isElectron,
    () => false
  );
}
