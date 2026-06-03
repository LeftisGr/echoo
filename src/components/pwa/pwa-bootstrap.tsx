let registrationStarted = false;

function startServiceWorkerRegistration() {
  if (registrationStarted || typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  registrationStarted = true;

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

  window.addEventListener(
    "load",
    () => {
      void register();
    },
    { once: true },
  );
}

startServiceWorkerRegistration();

export function PwaBootstrap() {
  return null;
}
