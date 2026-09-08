/** Set by main.tsx once the React entry has executed. The inline boot handler in
 * index.html reads it to tell "the bundle never loaded" apart from "the app
 * started and then threw". */
declare global {
  interface Window {
    __braboBooted?: boolean;
  }
}

export {};
