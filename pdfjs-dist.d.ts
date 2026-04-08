declare module "pdfjs-dist/build/pdf.mjs" {
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(src: string | { url: string }): {
    promise: Promise<{
      numPages: number;
      destroy(): Promise<void>;
    }>;
    destroy(): Promise<void>;
  };
}

declare module "pdfjs-dist/build/pdf.worker.min.mjs" {
  const content: unknown;
  export default content;
}
