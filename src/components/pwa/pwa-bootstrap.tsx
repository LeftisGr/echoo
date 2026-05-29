import { useEffect } from "react";

export function PwaBootstrap() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (error) {
        console.error("[pwa] service worker registration failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    if (document.readyState === "complete") {
      void register();
      return;
    }

    const handleLoad = () => {
      void register();
    };

    window.addEventListener("load", handleLoad);
    return () => window.removeEventListener("load", handleLoad);
  }, []);

  return null;
}
