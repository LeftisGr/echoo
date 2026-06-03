import React, { useEffect, useState, type ReactNode } from "react";

class RoomErrorBoundaryInner extends React.Component<{
  onError: () => void;
  children: ReactNode;
}, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

function RoomErrorFallback({ language }: { language: "en" | "el" }) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center px-4 py-6">
      <div className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-center text-sm text-white/70 shadow-[0_18px_60px_rgba(7,10,20,0.24)] whitespace-pre-line">
        {language === "en" ? "We lost part of the room.\nTrying to reconnect…" : "Χάσαμε ένα μέρος του room.\nΠροσπαθούμε να επανασυνδεθούμε…"}
      </div>
    </div>
  );
}

export function RoomErrorBoundary({ children, language }: { children: ReactNode; language: "en" | "el" }) {
  const [retryToken, setRetryToken] = useState(0);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (!showFallback) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowFallback(false);
      setRetryToken((current) => current + 1);
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [showFallback]);

  return (
    <RoomErrorBoundaryInner
      key={retryToken}
      onError={() => {
        setShowFallback(true);
      }}
    >
      {showFallback ? <RoomErrorFallback language={language} /> : children}
    </RoomErrorBoundaryInner>
  );
}
