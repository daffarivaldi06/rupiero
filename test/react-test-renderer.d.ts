// react-test-renderer comes with jest-expo and has no bundled types. Only what the tests use.
declare module 'react-test-renderer' {
  import type { ReactElement } from 'react';

  export interface ReactTestRendererJSON {
    type: string;
    props: Record<string, unknown>;
    children: (ReactTestRendererJSON | string)[] | null;
  }

  export interface ReactTestRenderer {
    toJSON(): ReactTestRendererJSON | ReactTestRendererJSON[] | null;
    update(element: ReactElement): void;
    unmount(): void;
  }

  export function create(element: ReactElement): ReactTestRenderer;
  export function act(callback: () => void): void;

  const TestRenderer: { create: typeof create; act: typeof act };
  export default TestRenderer;
}
