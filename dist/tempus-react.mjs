"use client";

// packages/react/src/use-tempus.ts
import { useEffect, useRef } from "react";
import Tempus from "tempus";
function useTempus(callback, options) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  useEffect(() => {
    return Tempus.add((...args) => {
      callbackRef.current(...args);
    }, options);
  }, [JSON.stringify(options)]);
}

// packages/react/src/components.ts
import Tempus2 from "tempus";
import { useLayoutEffect } from "react";
function ReactTempus({ patch = true }) {
  useLayoutEffect(() => {
    if (!Tempus2 || !patch) return;
    Tempus2.patch();
    return () => Tempus2.unpatch();
  }, [patch]);
}
export {
  ReactTempus,
  useTempus
};
//# sourceMappingURL=tempus-react.mjs.map