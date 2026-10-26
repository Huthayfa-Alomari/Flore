import * as React from 'react'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string | null;
        poster?: string | null;
        alt?: string;
        'camera-controls'?: boolean;
        'auto-rotate'?: boolean;
        ar?: boolean;
        'ar-modes'?: string;
        'touch-action'?: string;
        'shadow-intensity'?: string;
        exposure?: string;
        onload?: () => void;
        onLoad?: () => void;
      }, HTMLElement>;
    }
  }
}
