declare module 'dmn-js/lib/Viewer' {
  export default class DmnViewer {
    constructor(options?: any);
    importXML(xml: string): Promise<void>;
    getActiveViewer(): any;
    getViews(): Array<{ type: string; element?: any }>;
    open(view: any): void;
    destroy(): void;
  }
}
