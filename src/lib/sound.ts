import type { RewardEvent } from "./gamification";

export type UiSound =
  | "start"
  | "select"
  | "choice"
  | "nav"
  | "flag"
  | "skip"
  | "back"
  | "question"
  | "hover"
  | "capture"
  | "delete"
  | "submit"
  | "toggle-on"
  | "toggle-off";

let audioContext: AudioContext | undefined;

export interface SoundEffectsState {
  enabled: boolean;
}

type SoundEffectsListener = (state: SoundEffectsState) => void;

type DesignedCue = UiSound | "reward-success" | "reward-burst" | "reward-miss";

type CueOscillator = {
  type: OscillatorType;
  frequency: number;
  endFrequency?: number;
  start: number;
  duration: number;
  gain: number;
  attack?: number;
  decay?: number;
  destination?: AudioNode;
};

type CueNoise = {
  start: number;
  duration: number;
  gain: number;
  attack?: number;
  decay?: number;
  filterFrequency?: number;
  filterType?: BiquadFilterType;
  destination?: AudioNode;
};

const SOUND_EFFECTS_KEY = "phsc-11000:sound-effects";
const soundEffectsListeners = new Set<SoundEffectsListener>();
let soundEffectsEnabled = readSoundEffectsPreference();

interface StudyMusicLoop {
  playing: boolean;
  trackIndex: number;
  master?: GainNode;
  pad?: OscillatorNode[];
  padFilter?: BiquadFilterNode;
  noise?: AudioBufferSourceNode;
  timer?: number;
  nextStepAt: number;
  step: number;
}

interface StudyMusicChord {
  pad: number[];
  bass: number;
}

interface StudyMusicTrack {
  id: string;
  title: string;
  mood: string;
  bpm: number;
  masterVolume: number;
  padFilter: number;
  noiseGain: number;
  chords: StudyMusicChord[];
}

export interface StudyMusicState {
  playing: boolean;
  trackIndex: number;
  trackCount: number;
  title: string;
  mood: string;
}

const studyMusic: StudyMusicLoop = {
  playing: false,
  trackIndex: 0,
  nextStepAt: 0,
  step: 0
};

function readSoundEffectsPreference() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(SOUND_EFFECTS_KEY) !== "off";
  } catch {
    return true;
  }
}

function soundEffectsState(): SoundEffectsState {
  return { enabled: soundEffectsEnabled };
}

function emitSoundEffectsState() {
  const state = soundEffectsState();
  soundEffectsListeners.forEach((listener) => listener(state));
}

export function getSoundEffectsState(): SoundEffectsState {
  return soundEffectsState();
}

export function subscribeSoundEffects(listener: SoundEffectsListener) {
  soundEffectsListeners.add(listener);
  listener(soundEffectsState());
  return () => {
    soundEffectsListeners.delete(listener);
  };
}

export function setSoundEffectsEnabled(enabled: boolean) {
  soundEffectsEnabled = enabled;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(SOUND_EFFECTS_KEY, enabled ? "on" : "off");
    } catch {
      // Private browsing modes can reject localStorage; the in-memory state still applies.
    }
  }
  emitSoundEffectsState();
  return soundEffectsState();
}

export function toggleSoundEffects() {
  return setSoundEffectsEnabled(!soundEffectsEnabled);
}

const lofiTracks: StudyMusicTrack[] = [
  {
    id: "deep-core",
    title: "Deep Core",
    mood: "warm mineral pad",
    bpm: 72,
    masterVolume: 0.09,
    padFilter: 760,
    noiseGain: 0.045,
    chords: [
      { pad: [220, 261.63, 329.63, 392], bass: 110 },
      { pad: [174.61, 220, 261.63, 329.63], bass: 87.31 },
      { pad: [196, 246.94, 293.66, 392], bass: 98 },
      { pad: [207.65, 246.94, 311.13, 369.99], bass: 103.83 }
    ]
  },
  {
    id: "library-rain",
    title: "Library Rain",
    mood: "soft window beat",
    bpm: 68,
    masterVolume: 0.082,
    padFilter: 680,
    noiseGain: 0.055,
    chords: [
      { pad: [196, 246.94, 293.66, 349.23], bass: 98 },
      { pad: [164.81, 196, 246.94, 329.63], bass: 82.41 },
      { pad: [174.61, 220, 261.63, 329.63], bass: 87.31 },
      { pad: [146.83, 196, 220, 293.66], bass: 73.42 }
    ]
  },
  {
    id: "night-lab",
    title: "Night Lab",
    mood: "quiet synth pulse",
    bpm: 78,
    masterVolume: 0.086,
    padFilter: 840,
    noiseGain: 0.035,
    chords: [
      { pad: [207.65, 246.94, 311.13, 415.3], bass: 103.83 },
      { pad: [185, 233.08, 277.18, 369.99], bass: 92.5 },
      { pad: [220, 261.63, 329.63, 440], bass: 110 },
      { pad: [196, 246.94, 293.66, 392], bass: 98 }
    ]
  }
];

function currentMusicTrack() {
  return lofiTracks[studyMusic.trackIndex] ?? lofiTracks[0];
}

export function getStudyMusicState(): StudyMusicState {
  const track = currentMusicTrack();
  return {
    playing: studyMusic.playing,
    trackIndex: studyMusic.trackIndex,
    trackCount: lofiTracks.length,
    title: track.title,
    mood: track.mood
  };
}

function getAudioContext() {
  if (typeof window === "undefined") return undefined;
  const AudioContextConstructor =
    window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return undefined;
  audioContext ??= new AudioContextConstructor();
  return audioContext;
}

function wakeAudio(ctx: AudioContext) {
  if (ctx.state !== "running") {
    void ctx.resume().catch(() => {
      // Browsers can reject resume when a sound is not user-initiated.
      // The next button click will try again.
    });
  }
}

function masterGain(ctx: AudioContext, startsAt: number, volume = 0.1, duration = 0.5) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(volume, startsAt + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
  gain.connect(ctx.destination);
  return gain;
}

function warmFilter(ctx: AudioContext, frequency = 1800) {
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = frequency;
  filter.Q.value = 0.65;
  return filter;
}

function tone(
  ctx: AudioContext,
  frequency: number,
  startsAt: number,
  duration: number,
  output: AudioNode,
  type: OscillatorType = "sine",
  endFrequency?: number,
  volume = 0.5
) {
  const oscillator = ctx.createOscillator();
  const toneGain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startsAt);
  if (endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, startsAt + duration);
  }
  toneGain.gain.setValueAtTime(0.0001, startsAt);
  toneGain.gain.exponentialRampToValueAtTime(volume, startsAt + 0.005);
  toneGain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
  oscillator.connect(toneGain);
  toneGain.connect(output);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + duration + 0.02);
}

function playSequence(
  notes: number[],
  options?: {
    duration?: number;
    gap?: number;
    volume?: number;
    type?: OscillatorType;
    filter?: number;
    harmony?: boolean;
  }
) {
  const ctx = getAudioContext();
  if (!ctx) return;
  wakeAudio(ctx);

  const startsAt = ctx.currentTime + 0.004;
  const duration = options?.duration ?? 0.16;
  const gap = options?.gap ?? 0.07;
  const gain = masterGain(ctx, startsAt, options?.volume ?? 0.16, notes.length * gap + duration + 0.18);
  const filter = warmFilter(ctx, options?.filter ?? 1800);
  filter.connect(gain);

  notes.forEach((note, index) => {
    const noteStartsAt = startsAt + index * gap;
    tone(ctx, note, noteStartsAt, duration, filter, options?.type ?? "sine");
    if (options?.harmony) {
      tone(ctx, note * 1.5, noteStartsAt + 0.006, duration * 0.78, filter, "sine", undefined, 0.15);
    }
  });
}

function playNoise(ctx: AudioContext, startsAt: number, duration: number, output: AudioNode, volume = 0.08) {
  const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < sampleCount; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / sampleCount);
  }

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filter = warmFilter(ctx, 1400);
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(volume, startsAt + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  source.start(startsAt);
  source.stop(startsAt + duration);
}

function musicHit(ctx: AudioContext, startsAt: number, output: AudioNode, kind: "kick" | "hat" | "brush") {
  if (kind === "kick") {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startsAt);
    gain.gain.exponentialRampToValueAtTime(0.75, startsAt + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + 0.18);
    gain.connect(output);
    tone(ctx, 92, startsAt, 0.18, gain, "sine", 46, 0.65);
    return;
  }

  const duration = kind === "hat" ? 0.035 : 0.09;
  const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < sampleCount; index += 1) {
    data[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / sampleCount, kind === "hat" ? 2.4 : 1.2);
  }

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = kind === "hat" ? "highpass" : "bandpass";
  filter.frequency.value = kind === "hat" ? 5200 : 1200;
  filter.Q.value = kind === "hat" ? 0.5 : 0.8;
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(kind === "hat" ? 0.16 : 0.23, startsAt + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  source.start(startsAt);
  source.stop(startsAt + duration);
}

function musicBass(ctx: AudioContext, startsAt: number, frequency: number, output: AudioNode) {
  const gain = ctx.createGain();
  const filter = warmFilter(ctx, 520);
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(0.34, startsAt + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + 0.44);
  filter.connect(gain);
  gain.connect(output);
  tone(ctx, frequency, startsAt, 0.44, filter, "sine", undefined, 0.42);
}

function musicPluck(ctx: AudioContext, startsAt: number, frequency: number, output: AudioNode) {
  const gain = ctx.createGain();
  const filter = warmFilter(ctx, 1450);
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(0.14, startsAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + 0.16);
  filter.connect(gain);
  gain.connect(output);
  tone(ctx, frequency, startsAt, 0.16, filter, "triangle", undefined, 0.32);
}

function buildLoopingVinylNoise(ctx: AudioContext, output: AudioNode, track: StudyMusicTrack) {
  const duration = 1.8;
  const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < sampleCount; index += 1) {
    const softCrackle = Math.random() > 0.997 ? Math.random() * 0.8 : 0;
    data[index] = (Math.random() * 2 - 1) * 0.08 + softCrackle;
  }

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filter = warmFilter(ctx, 900);
  source.buffer = buffer;
  source.loop = true;
  gain.gain.value = track.noiseGain;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  source.start();
  return source;
}

function buildMusicPad(ctx: AudioContext, output: AudioNode, track: StudyMusicTrack) {
  const filter = warmFilter(ctx, track.padFilter);
  const padGain = ctx.createGain();
  const oscillators = track.chords[0].pad.map((frequency, index) => {
    const oscillator = ctx.createOscillator();
    const voiceGain = ctx.createGain();
    oscillator.type = index % 2 === 0 ? "sine" : "triangle";
    oscillator.frequency.value = frequency;
    oscillator.detune.value = index % 2 === 0 ? -4 : 5;
    voiceGain.gain.value = 0.06;
    oscillator.connect(voiceGain);
    voiceGain.connect(filter);
    oscillator.start();
    return oscillator;
  });
  filter.connect(padGain);
  padGain.gain.value = 0.2;
  padGain.connect(output);
  studyMusic.padFilter = filter;
  return oscillators;
}

function scheduleStudyMusic() {
  const ctx = getAudioContext();
  if (!ctx || !studyMusic.playing || !studyMusic.master) return;

  const track = currentMusicTrack();
  const beatLength = 60 / track.bpm;
  const stepLength = beatLength / 2;
  const lookahead = 0.8;

  while (studyMusic.nextStepAt < ctx.currentTime + lookahead) {
    const step = studyMusic.step % 16;
    const chordIndex = Math.floor((studyMusic.step / 16) % track.chords.length);
    const chord = track.chords[chordIndex];

    if (step === 0 && studyMusic.pad) {
      studyMusic.pad.forEach((oscillator, index) => {
        oscillator.frequency.setTargetAtTime(chord.pad[index], studyMusic.nextStepAt, 0.08);
      });
    }
    if (step === 0 || step === 8) musicHit(ctx, studyMusic.nextStepAt, studyMusic.master, "kick");
    if (step === 4 || step === 12) musicHit(ctx, studyMusic.nextStepAt, studyMusic.master, "brush");
    if (step % 2 === 1) musicHit(ctx, studyMusic.nextStepAt + 0.012, studyMusic.master, "hat");
    if (step === 0 || step === 6 || step === 10) musicBass(ctx, studyMusic.nextStepAt, chord.bass, studyMusic.master);
    if (step === 3 || step === 7 || step === 11 || step === 15) {
      const note = chord.pad[(step + chordIndex) % chord.pad.length] * 2;
      musicPluck(ctx, studyMusic.nextStepAt + 0.015, note, studyMusic.master);
    }

    studyMusic.nextStepAt += stepLength;
    studyMusic.step += 1;
  }

  studyMusic.timer = window.setTimeout(scheduleStudyMusic, 90);
}

function cueDuration(cue: DesignedCue) {
  if (cue === "start") return 1.05;
  if (cue === "reward-burst") return 1.05;
  if (cue === "reward-miss") return 0.92;
  if (cue === "reward-success") return 0.58;
  if (cue === "submit") return 0.72;
  if (cue === "delete") return 0.54;
  if (cue === "capture") return 0.46;
  if (cue === "question") return 0.34;
  if (cue === "choice") return 0.18;
  if (cue === "toggle-on" || cue === "toggle-off") return 0.32;
  return 0.28;
}

function cueVolume(cue: DesignedCue) {
  if (cue === "start") return 0.48;
  if (cue === "reward-burst") return 0.42;
  if (cue === "reward-miss") return 0.38;
  if (cue === "reward-success") return 0.34;
  if (cue === "submit") return 0.34;
  if (cue === "delete") return 0.3;
  if (cue === "capture") return 0.3;
  if (cue === "hover") return 0.055;
  if (cue === "question") return 0.24;
  if (cue === "choice") return 0.24;
  return 0.22;
}

function playDesignedCue(cue: DesignedCue) {
  const ctx = getAudioContext();
  if (!ctx) return;
  wakeAudio(ctx);

  const startsAt = ctx.currentTime + 0.004;
  const master = ctx.createGain();
  master.gain.setValueAtTime(cueVolume(cue), startsAt);
  master.connect(ctx.destination);
  scheduleDesignedCue(ctx, master, cue, startsAt);

  window.setTimeout(() => {
    master.disconnect();
  }, Math.ceil((cueDuration(cue) + 0.12) * 1000));
}

function scheduleDesignedCue(ctx: AudioContext, destination: AudioNode, cue: DesignedCue, startsAt: number) {
  switch (cue) {
    case "start":
      scheduleStartCue(ctx, destination, startsAt);
      break;
    case "select":
      scheduleSelectCue(ctx, destination, startsAt);
      break;
    case "choice":
      scheduleChoiceCue(ctx, destination, startsAt);
      break;
    case "nav":
      scheduleNavCue(ctx, destination, startsAt);
      break;
    case "flag":
      scheduleFlagCue(ctx, destination, startsAt);
      break;
    case "skip":
      scheduleSkipCue(ctx, destination, startsAt);
      break;
    case "back":
      scheduleBackCue(ctx, destination, startsAt);
      break;
    case "question":
      scheduleQuestionCue(ctx, destination, startsAt);
      break;
    case "hover":
      scheduleHoverCue(ctx, destination, startsAt);
      break;
    case "capture":
      scheduleCaptureCue(ctx, destination, startsAt);
      break;
    case "delete":
      scheduleDeleteCue(ctx, destination, startsAt);
      break;
    case "submit":
      scheduleSubmitCue(ctx, destination, startsAt);
      break;
    case "toggle-on":
      scheduleToggleCue(ctx, destination, startsAt, true);
      break;
    case "toggle-off":
      scheduleToggleCue(ctx, destination, startsAt, false);
      break;
    case "reward-success":
      scheduleRewardSuccessCue(ctx, destination, startsAt);
      break;
    case "reward-burst":
      scheduleRewardBurstCue(ctx, destination, startsAt);
      break;
    case "reward-miss":
      scheduleRewardMissCue(ctx, destination, startsAt);
      break;
  }
}

function scheduleStartCue(ctx: AudioContext, destination: AudioNode, startsAt: number) {
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(980, startsAt);
  filter.frequency.exponentialRampToValueAtTime(1680, startsAt + 0.7);
  filter.Q.setValueAtTime(0.7, startsAt);
  filter.connect(destination);

  [130.81, 196, 261.63, 392].forEach((frequency, index) => {
    scheduleCueOscillator(ctx, {
      type: index === 0 ? "triangle" : "sine",
      frequency,
      endFrequency: index === 0 ? 98 : frequency * 1.003,
      start: startsAt + index * 0.055,
      duration: 0.88,
      gain: index === 0 ? 0.46 : 0.24,
      attack: 0.028,
      decay: 0.82,
      destination: filter
    });
  });
  scheduleCueNoise(ctx, {
    start: startsAt + 0.025,
    duration: 0.16,
    gain: 0.18,
    attack: 0.006,
    decay: 0.14,
    filterFrequency: 2200,
    filterType: "bandpass",
    destination
  });
}

function scheduleSelectCue(ctx: AudioContext, destination: AudioNode, startsAt: number) {
  scheduleCueOscillator(ctx, {
    type: "triangle",
    frequency: 660,
    endFrequency: 784,
    start: startsAt,
    duration: 0.09,
    gain: 0.36,
    attack: 0.006,
    decay: 0.08,
    destination
  });
  scheduleCueNoise(ctx, {
    start: startsAt,
    duration: 0.045,
    gain: 0.08,
    attack: 0.004,
    decay: 0.04,
    filterFrequency: 3400,
    filterType: "highpass",
    destination
  });
}

function scheduleChoiceCue(ctx: AudioContext, destination: AudioNode, startsAt: number) {
  scheduleCueOscillator(ctx, {
    type: "triangle",
    frequency: 392,
    endFrequency: 587.33,
    start: startsAt,
    duration: 0.13,
    gain: 0.32,
    attack: 0.005,
    decay: 0.12,
    destination
  });
  scheduleCueNoise(ctx, {
    start: startsAt + 0.012,
    duration: 0.055,
    gain: 0.1,
    attack: 0.004,
    decay: 0.05,
    filterFrequency: 2200,
    filterType: "bandpass",
    destination
  });
}

function scheduleNavCue(ctx: AudioContext, destination: AudioNode, startsAt: number) {
  [329.63, 440].forEach((frequency, index) => {
    scheduleCueOscillator(ctx, {
      type: "sine",
      frequency,
      endFrequency: frequency * 1.08,
      start: startsAt + index * 0.065,
      duration: 0.12,
      gain: 0.22,
      attack: 0.008,
      decay: 0.11,
      destination
    });
  });
}

function scheduleFlagCue(ctx: AudioContext, destination: AudioNode, startsAt: number) {
  scheduleCueOscillator(ctx, {
    type: "triangle",
    frequency: 587.33,
    endFrequency: 493.88,
    start: startsAt,
    duration: 0.16,
    gain: 0.3,
    attack: 0.008,
    decay: 0.15,
    destination
  });
  scheduleCueNoise(ctx, {
    start: startsAt + 0.018,
    duration: 0.11,
    gain: 0.12,
    attack: 0.005,
    decay: 0.1,
    filterFrequency: 1600,
    filterType: "bandpass",
    destination
  });
}

function scheduleSkipCue(ctx: AudioContext, destination: AudioNode, startsAt: number) {
  [293.66, 369.99, 440].forEach((frequency, index) => {
    scheduleCueOscillator(ctx, {
      type: index === 2 ? "triangle" : "sine",
      frequency,
      start: startsAt + index * 0.045,
      duration: 0.11,
      gain: index === 2 ? 0.24 : 0.18,
      attack: 0.006,
      decay: 0.1,
      destination
    });
  });
}

function scheduleBackCue(ctx: AudioContext, destination: AudioNode, startsAt: number) {
  [392, 293.66].forEach((frequency, index) => {
    scheduleCueOscillator(ctx, {
      type: "sine",
      frequency,
      endFrequency: frequency * 0.94,
      start: startsAt + index * 0.055,
      duration: 0.13,
      gain: 0.2,
      attack: 0.007,
      decay: 0.12,
      destination
    });
  });
}

function scheduleQuestionCue(ctx: AudioContext, destination: AudioNode, startsAt: number) {
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1280, startsAt);
  filter.frequency.exponentialRampToValueAtTime(1960, startsAt + 0.24);
  filter.Q.setValueAtTime(1.4, startsAt);
  filter.connect(destination);

  [440, 554.37, 659.25].forEach((frequency, index) => {
    scheduleCueOscillator(ctx, {
      type: "triangle",
      frequency,
      start: startsAt + index * 0.05,
      duration: 0.18,
      gain: 0.2,
      attack: 0.008,
      decay: 0.16,
      destination: filter
    });
  });
  scheduleCueNoise(ctx, {
    start: startsAt + 0.04,
    duration: 0.18,
    gain: 0.11,
    attack: 0.012,
    decay: 0.16,
    filterFrequency: 900,
    filterType: "bandpass",
    destination
  });
}

function scheduleHoverCue(ctx: AudioContext, destination: AudioNode, startsAt: number) {
  scheduleCueOscillator(ctx, {
    type: "sine",
    frequency: 720,
    endFrequency: 780,
    start: startsAt,
    duration: 0.055,
    gain: 0.16,
    attack: 0.004,
    decay: 0.048,
    destination
  });
}

function scheduleCaptureCue(ctx: AudioContext, destination: AudioNode, startsAt: number) {
  [659.25, 783.99, 987.77].forEach((frequency, index) => {
    scheduleCueOscillator(ctx, {
      type: index === 0 ? "triangle" : "sine",
      frequency,
      start: startsAt + index * 0.055,
      duration: 0.2,
      gain: index === 2 ? 0.22 : 0.2,
      attack: 0.008,
      decay: 0.18,
      destination
    });
  });
  scheduleCueNoise(ctx, {
    start: startsAt + 0.08,
    duration: 0.18,
    gain: 0.08,
    attack: 0.008,
    decay: 0.16,
    filterFrequency: 5200,
    filterType: "highpass",
    destination
  });
}

function scheduleDeleteCue(ctx: AudioContext, destination: AudioNode, startsAt: number) {
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(780, startsAt);
  filter.frequency.exponentialRampToValueAtTime(260, startsAt + 0.34);
  filter.Q.setValueAtTime(1.2, startsAt);
  filter.connect(destination);

  scheduleCueOscillator(ctx, {
    type: "triangle",
    frequency: 392,
    endFrequency: 185,
    start: startsAt,
    duration: 0.28,
    gain: 0.34,
    attack: 0.008,
    decay: 0.26,
    destination: filter
  });
  scheduleCueNoise(ctx, {
    start: startsAt + 0.025,
    duration: 0.16,
    gain: 0.15,
    attack: 0.004,
    decay: 0.14,
    filterFrequency: 780,
    filterType: "bandpass",
    destination
  });
}

function scheduleSubmitCue(ctx: AudioContext, destination: AudioNode, startsAt: number) {
  scheduleCueOscillator(ctx, {
    type: "triangle",
    frequency: 146.83,
    endFrequency: 92.5,
    start: startsAt,
    duration: 0.18,
    gain: 0.42,
    attack: 0.006,
    decay: 0.16,
    destination
  });
  scheduleCueNoise(ctx, {
    start: startsAt,
    duration: 0.08,
    gain: 0.16,
    attack: 0.004,
    decay: 0.07,
    filterFrequency: 900,
    filterType: "bandpass",
    destination
  });
  [440, 659.25, 880].forEach((frequency, index) => {
    scheduleCueOscillator(ctx, {
      type: "sine",
      frequency,
      start: startsAt + 0.14 + index * 0.06,
      duration: 0.24,
      gain: 0.18,
      attack: 0.01,
      decay: 0.21,
      destination
    });
  });
}

function scheduleToggleCue(ctx: AudioContext, destination: AudioNode, startsAt: number, enabled: boolean) {
  const notes = enabled ? [523.25, 659.25] : [523.25, 349.23];
  notes.forEach((frequency, index) => {
    scheduleCueOscillator(ctx, {
      type: "sine",
      frequency,
      start: startsAt + index * 0.07,
      duration: 0.14,
      gain: enabled ? 0.2 : 0.18,
      attack: 0.008,
      decay: 0.12,
      destination
    });
  });
}

function scheduleRewardSuccessCue(ctx: AudioContext, destination: AudioNode, startsAt: number) {
  [392, 523.25, 659.25, 783.99].forEach((frequency, index) => {
    scheduleCueOscillator(ctx, {
      type: index === 0 ? "triangle" : "sine",
      frequency,
      endFrequency: index === 0 ? 440 : undefined,
      start: startsAt + index * 0.06,
      duration: 0.24,
      gain: index >= 2 ? 0.24 : 0.2,
      attack: 0.01,
      decay: 0.22,
      destination
    });
  });
  scheduleCueNoise(ctx, {
    start: startsAt + 0.1,
    duration: 0.14,
    gain: 0.07,
    attack: 0.006,
    decay: 0.12,
    filterFrequency: 4800,
    filterType: "highpass",
    destination
  });
}

function scheduleRewardBurstCue(ctx: AudioContext, destination: AudioNode, startsAt: number) {
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1600, startsAt);
  filter.frequency.exponentialRampToValueAtTime(3600, startsAt + 0.74);
  filter.Q.setValueAtTime(0.72, startsAt);
  filter.connect(destination);

  [261.63, 392, 523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
    scheduleCueOscillator(ctx, {
      type: index % 2 === 0 ? "triangle" : "sine",
      frequency,
      start: startsAt + index * 0.058,
      duration: 0.34,
      gain: index >= 4 ? 0.18 : 0.24,
      attack: 0.01,
      decay: 0.3,
      destination: filter
    });
  });
  scheduleCueNoise(ctx, {
    start: startsAt + 0.1,
    duration: 0.28,
    gain: 0.12,
    attack: 0.008,
    decay: 0.24,
    filterFrequency: 4200,
    filterType: "highpass",
    destination
  });
}

function scheduleRewardMissCue(ctx: AudioContext, destination: AudioNode, startsAt: number) {
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(940, startsAt);
  filter.frequency.exponentialRampToValueAtTime(360, startsAt + 0.5);
  filter.Q.setValueAtTime(5.5, startsAt);
  filter.connect(destination);

  scheduleCueOscillator(ctx, {
    type: "sawtooth",
    frequency: 233.08,
    endFrequency: 87.31,
    start: startsAt,
    duration: 0.46,
    gain: 0.34,
    attack: 0.018,
    decay: 0.44,
    destination: filter
  });
  [311.13, 277.18, 246.94].forEach((frequency, index) => {
    scheduleCueOscillator(ctx, {
      type: "triangle",
      frequency,
      endFrequency: frequency * 0.74,
      start: startsAt + 0.11 + index * 0.07,
      duration: 0.16,
      gain: 0.16,
      attack: 0.006,
      decay: 0.14,
      destination: filter
    });
  });
  scheduleCueNoise(ctx, {
    start: startsAt + 0.025,
    duration: 0.24,
    gain: 0.2,
    attack: 0.008,
    decay: 0.22,
    filterFrequency: 520,
    filterType: "bandpass",
    destination
  });
  scheduleCueNoise(ctx, {
    start: startsAt + 0.39,
    duration: 0.09,
    gain: 0.16,
    attack: 0.004,
    decay: 0.08,
    filterFrequency: 1600,
    filterType: "bandpass",
    destination
  });
}

function scheduleCueOscillator(ctx: AudioContext, cue: CueOscillator) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const start = cue.start;
  const stop = start + cue.duration;
  const attack = cue.attack ?? 0.01;
  const decay = cue.decay ?? cue.duration;

  oscillator.type = cue.type;
  oscillator.frequency.setValueAtTime(cue.frequency, start);
  if (cue.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, cue.endFrequency), stop);
  }

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, cue.gain), start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + decay);

  oscillator.connect(gain);
  gain.connect(cue.destination ?? ctx.destination);
  oscillator.start(start);
  oscillator.stop(stop + 0.025);
}

function scheduleCueNoise(ctx: AudioContext, cue: CueNoise) {
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const start = cue.start;
  const stop = start + cue.duration;
  const attack = cue.attack ?? 0.01;
  const decay = cue.decay ?? cue.duration;

  source.buffer = makeCueNoiseBuffer(ctx, cue.duration);
  filter.type = cue.filterType ?? "bandpass";
  filter.frequency.setValueAtTime(cue.filterFrequency ?? 1200, start);
  filter.Q.setValueAtTime(2.2, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, cue.gain), start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + decay);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(cue.destination ?? ctx.destination);
  source.start(start);
  source.stop(stop + 0.025);
}

function makeCueNoiseBuffer(ctx: AudioContext, duration: number) {
  const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < sampleCount; index += 1) {
    const fade = Math.pow(1 - index / sampleCount, 1.4);
    data[index] = (Math.random() * 2 - 1) * fade;
  }
  return buffer;
}

function playDrop() {
  const ctx = getAudioContext();
  if (!ctx) return;
  wakeAudio(ctx);

  const startsAt = ctx.currentTime + 0.004;
  const gain = masterGain(ctx, startsAt, 0.2, 0.42);
  const filter = warmFilter(ctx, 1200);
  filter.connect(gain);
  tone(ctx, 246, startsAt, 0.2, filter, "triangle", 174, 0.46);
  tone(ctx, 164, startsAt + 0.06, 0.22, filter, "sine", 130, 0.34);
  playNoise(ctx, startsAt + 0.03, 0.09, gain, 0.06);
}

export function playUiSound(sound: UiSound) {
  if (!soundEffectsEnabled) return;
  playDesignedCue(sound);
}

export function playRewardSound(event: RewardEvent) {
  if (!soundEffectsEnabled) return;

  if (event.tone === "red") {
    playDesignedCue("reward-miss");
    return;
  }

  if (event.confetti === "burst" || event.tone === "amber") {
    playDesignedCue("reward-burst");
    return;
  }

  playDesignedCue("reward-success");
}

export function isStudyMusicPlaying() {
  return studyMusic.playing;
}

function releaseStudyMusic(fadeMs = 320) {
  const ctx = getAudioContext();
  if (!ctx || !studyMusic.playing) return;

  if (studyMusic.timer) window.clearTimeout(studyMusic.timer);
  const stopsAt = ctx.currentTime;
  const master = studyMusic.master;
  const pad = studyMusic.pad;
  const padFilter = studyMusic.padFilter;
  const noise = studyMusic.noise;
  master?.gain.cancelScheduledValues(stopsAt);
  master?.gain.setTargetAtTime(0.0001, stopsAt, 0.08);

  window.setTimeout(() => {
    pad?.forEach((oscillator) => oscillator.stop());
    noise?.stop();
    master?.disconnect();
    padFilter?.disconnect();
  }, fadeMs);

  studyMusic.playing = false;
  studyMusic.master = undefined;
  studyMusic.pad = undefined;
  studyMusic.padFilter = undefined;
  studyMusic.noise = undefined;
  studyMusic.timer = undefined;
}

export function startStudyMusic() {
  const ctx = getAudioContext();
  if (!ctx) return getStudyMusicState();
  wakeAudio(ctx);
  if (studyMusic.playing) return getStudyMusicState();

  const startsAt = ctx.currentTime + 0.004;
  const track = currentMusicTrack();
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, startsAt);
  master.gain.exponentialRampToValueAtTime(track.masterVolume, startsAt + 0.45);
  master.connect(ctx.destination);

  studyMusic.master = master;
  studyMusic.pad = buildMusicPad(ctx, master, track);
  studyMusic.noise = buildLoopingVinylNoise(ctx, master, track);
  studyMusic.playing = true;
  studyMusic.step = 0;
  studyMusic.nextStepAt = startsAt;
  scheduleStudyMusic();
  return getStudyMusicState();
}

export function stopStudyMusic() {
  releaseStudyMusic();
  return getStudyMusicState();
}

export function toggleStudyMusic() {
  return studyMusic.playing ? stopStudyMusic() : startStudyMusic();
}

export function skipStudyTrack(direction: 1 | -1) {
  const wasPlaying = studyMusic.playing;
  if (wasPlaying) releaseStudyMusic(180);
  studyMusic.trackIndex = (studyMusic.trackIndex + direction + lofiTracks.length) % lofiTracks.length;
  studyMusic.step = 0;
  if (wasPlaying) return startStudyMusic();
  return getStudyMusicState();
}
