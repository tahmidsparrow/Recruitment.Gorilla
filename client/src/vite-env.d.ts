/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IAM_AUTHORITY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
