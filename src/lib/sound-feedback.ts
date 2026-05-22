type SoundKind = "match" | "ptt-press" | "ptt-release" | "content-reveal" | "unlock";

type TonePlan = {
  frequencies: number[];
  duration: number;
  volume: number;
};

const tonePlans: Record<SoundKind, TonePlan> = {
  match: {
    frequencies: [523.25, 659.25],
    duration: 0.16,
    volume: 0.028,
  },
  "ptt-press": {
    frequencies: [246.94],
    duration: 0.07,
    volume: 0.018,
  },
  "ptt-release": {
    frequencies: [196.0],
    duration: 0.08,
    volume: 0.016,
  },
  "content-reveal": {
    frequencies: [329.63, 392.0],
    duration: 0.14,
    volume: 0.022,
  },
  unlock: {
    frequencies: [392.0, 493.88, 587.33],
    duration: 0.18,
    volume: 0.024,
  },
};

export function playSoundFeedback(kind: SoundKind, enabled: boolean) {
  if (!enabled || typeof window === "undefined") {
    return;
  }

  const AudioContextClass = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  const plan = tonePlans[kind];
  const context = new AudioContextClass();
  void context.resume().catch(() => undefined);

  const now = context.currentTime;
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = kind === "match" ? 1800 : 1300;
  filter.Q.value = 0.7;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(plan.volume, now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + plan.duration);

  filter.connect(gain);
  gain.connect(context.destination);

  plan.frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = kind === "match" || kind === "unlock" ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.012);
    oscillator.connect(filter);
    oscillator.start(now + index * 0.012);
    oscillator.stop(now + plan.duration + 0.04);
  });

  window.setTimeout(() => {
    void context.close().catch(() => undefined);
  }, Math.ceil((plan.duration + 0.25) * 1000));
}
