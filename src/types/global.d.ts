export {};

declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      showNotification: (title: string, body: string) => void;
      getVersion: () => Promise<string>;
      openExternal: (url: string) => Promise<void>;
    };
    electron?: {
      isElectron: boolean;
      platform: string;
    };
  }
}
