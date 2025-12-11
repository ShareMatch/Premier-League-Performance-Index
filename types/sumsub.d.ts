// Type declarations for @sumsub/websdk-react
declare module '@sumsub/websdk-react' {
  import { ComponentType } from 'react';

  interface SumsubConfig {
    lang?: string;
    theme?: 'light' | 'dark';
    email?: string;
    phone?: string;
  }

  interface SumsubOptions {
    addViewportTag?: boolean;
    adaptIframeHeight?: boolean;
    enableScrollIntoView?: boolean;
  }

  interface SumsubWebSdkProps {
    accessToken: string;
    expirationHandler?: () => Promise<string>;
    config?: SumsubConfig;
    options?: SumsubOptions;
    onMessage?: (type: string, payload: any) => void;
    onError?: (error: any) => void;
  }

  const SumsubWebSdk: ComponentType<SumsubWebSdkProps>;
  export default SumsubWebSdk;
}

