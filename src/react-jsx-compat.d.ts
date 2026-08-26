import type React from "react";

declare global {
  namespace JSX {
    interface IntrinsicAttributes {
      key?: React.Key | null | undefined;
    }
  }
}

export {};
