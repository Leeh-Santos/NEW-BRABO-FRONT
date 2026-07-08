declare module "vanta/dist/vanta.net.min" {
  interface VantaNetOptions {
    el: HTMLElement | string;
    THREE?: unknown;
    mouseControls?: boolean;
    touchControls?: boolean;
    gyroControls?: boolean;
    minHeight?: number;
    minWidth?: number;
    scale?: number;
    scaleMobile?: number;
    color?: number;
    backgroundColor?: number;
    points?: number;
    maxDistance?: number;
    spacing?: number;
  }

  interface VantaEffect {
    destroy: () => void;
  }

  type VantaNetFactory = (options: VantaNetOptions) => VantaEffect;

  const NET: VantaNetFactory;
  export default NET;
}
