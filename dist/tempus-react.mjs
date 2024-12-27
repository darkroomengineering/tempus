"use client";

// packages/react/src/use-tempus.ts
import { useEffect } from "react";
import Tempus from "tempus";
function useTempus(callback, options) {
  useEffect(() => {
    return Tempus.add(callback, options);
  }, []);
}
export {
  useTempus
};
//# sourceMappingURL=tempus-react.mjs.map