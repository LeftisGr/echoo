import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("[not-found] route not found", { path: location.pathname });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#08101b] px-4 text-center text-white">
      <div className="max-w-sm space-y-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_20px_60px_rgba(5,8,18,0.28)]">
        <p className="text-xs uppercase tracking-[0.35em] text-white/35">Echoo</p>
        <h1 className="text-4xl font-semibold tracking-tight text-white">404</h1>
        <p className="text-sm leading-6 text-white/65">
          {location.pathname.startsWith("/session")
            ? "That room no longer exists."
            : "This page doesn’t exist anymore."}
        </p>
        <Button asChild className="h-11 rounded-full bg-violet-500 px-5 text-white hover:bg-violet-400">
          <Link to="/">Return home</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
