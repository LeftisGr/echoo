export function PwaSplashScreen({ message }: { message: string }) {
  return (
    <div className="flex h-[var(--app-height,100vh)] items-center justify-center bg-[#08101b] px-4 text-center text-white">
      <div className="max-w-sm space-y-5">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/10 bg-[#11182b] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/20 ring-1 ring-violet-300/20">
            <div className="h-4 w-4 rounded-full bg-violet-200" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-white/35">Echoo</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">{message}</h1>
          <p className="text-sm leading-6 text-white/55">
            Your moment is being restored quietly in the background.
          </p>
        </div>
      </div>
    </div>
  );
}
