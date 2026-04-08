import 'react';

import type { AriaLabel, DataTestId } from './types';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLAttributes<T> {
    'data-testid'?: DataTestId;
    'aria-label'?: AriaLabel;
  }
}

export {};
