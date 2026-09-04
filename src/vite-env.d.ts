/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MIRECIBO_ACCESS_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css';
