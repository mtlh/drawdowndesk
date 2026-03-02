export {};

declare global {
  interface Window {
    electron?: {
      isElectron: boolean;
      platform: string;
      getVersion: () => Promise<string>;
      showNotification: (title: string, body: string) => void;
      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}
