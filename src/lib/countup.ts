import ReactCountupImport from "react-countup";

// react-countup ships as a UMD/CJS bundle with its own Babel `__esModule` default export.
// Vite's dev-time esbuild pre-bundling wraps that in a second `default` layer, so the plain
// default import above resolves to the CJS exports object rather than the component itself.
// Unwrap defensively so this keeps working regardless of exactly how a given bundler's CJS
// interop happens to shape it.
const maybeDoubleWrapped = ReactCountupImport as unknown as { default?: typeof ReactCountupImport };

export const CountUp = maybeDoubleWrapped.default ?? ReactCountupImport;
