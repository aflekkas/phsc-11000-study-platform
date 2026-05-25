import tracks from "../data/studyMusicTracks.json";

export interface StudyTrack {
  id: string;
  title: string;
  artist: string;
  mood: string;
  src: string;
  sourceUrl: string;
  license: string;
}

export interface StudyMusicState {
  playing: boolean;
  loading: boolean;
  trackIndex: number;
  trackCount: number;
  title: string;
  artist: string;
  mood: string;
  sourceUrl: string;
  license: string;
  currentTime: number;
  duration: number;
  error?: string;
}

type Listener = (state: StudyMusicState) => void;

export const studyTracks = tracks satisfies StudyTrack[];

const listeners = new Set<Listener>();
const recentWindow = Math.min(9, Math.max(1, studyTracks.length - 1));

let audioElement: HTMLAudioElement | undefined;
let trackIndex = randomTrackIndex();
let playing = false;
let loading = false;
let currentTime = 0;
let duration = 0;
let error: string | undefined;
let recentTrackIndexes = [trackIndex];
let previousTrackIndexes: number[] = [];
const failedTrackIndexes = new Set<number>();

function resolveAssetPath(src: string) {
  if (/^https?:\/\//i.test(src)) return src;
  if (typeof window === "undefined") return src;

  const base = import.meta.env.BASE_URL || "/";
  const baseUrl = new URL(base, window.location.origin);
  return new URL(src.replace(/^\//, ""), baseUrl).href;
}

function randomTrackIndex() {
  if (studyTracks.length <= 1) return 0;
  return Math.floor(Math.random() * studyTracks.length);
}

function activeTrack() {
  return studyTracks[trackIndex] ?? studyTracks[0];
}

export function getStudyMusicState(): StudyMusicState {
  const track = activeTrack();
  return {
    playing,
    loading,
    trackIndex,
    trackCount: studyTracks.length,
    title: track.title,
    artist: track.artist,
    mood: track.mood,
    sourceUrl: track.sourceUrl,
    license: track.license,
    currentTime,
    duration,
    error
  };
}

function emit() {
  const state = getStudyMusicState();
  listeners.forEach((listener) => listener(state));
}

function rememberTrack(index: number) {
  recentTrackIndexes = [...recentTrackIndexes, index].slice(-recentWindow);
}

function nextSmartTrackIndex() {
  if (studyTracks.length <= 1) return trackIndex;

  const recent = new Set(recentTrackIndexes.slice(-recentWindow));
  const availableIndexes = studyTracks
    .map((_, index) => index)
    .filter((index) => index !== trackIndex && !failedTrackIndexes.has(index));
  const freshIndexes = availableIndexes.filter((index) => !recent.has(index));
  const fallbackIndexes = availableIndexes.length > 0
    ? availableIndexes
    : studyTracks.map((_, index) => index).filter((index) => index !== trackIndex);
  const pool = freshIndexes.length > 0 ? freshIndexes : fallbackIndexes;
  return pool[Math.floor(Math.random() * pool.length)] ?? trackIndex;
}

function getAudioElement() {
  if (typeof window === "undefined") return undefined;
  if (audioElement) return audioElement;

  const audio = new Audio();
  audio.preload = "auto";
  audio.volume = 0.58;

  audio.addEventListener("play", () => {
    playing = true;
    error = undefined;
    emit();
  });
  audio.addEventListener("pause", () => {
    if (!audio.ended) playing = false;
    emit();
  });
  audio.addEventListener("waiting", () => {
    loading = true;
    emit();
  });
  audio.addEventListener("canplay", () => {
    failedTrackIndexes.delete(trackIndex);
    loading = false;
    emit();
  });
  audio.addEventListener("loadedmetadata", () => {
    failedTrackIndexes.delete(trackIndex);
    duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    loading = false;
    emit();
  });
  audio.addEventListener("timeupdate", () => {
    currentTime = audio.currentTime;
    duration = Number.isFinite(audio.duration) ? audio.duration : duration;
    emit();
  });
  audio.addEventListener("ended", () => {
    selectTrack(nextSmartTrackIndex(), true);
  });
  audio.addEventListener("error", () => {
    failedTrackIndexes.add(trackIndex);
    error = "Skipped a track";
    loading = false;
    playing = false;
    emit();
    if (failedTrackIndexes.size >= studyTracks.length) {
      error = "No tracks available";
      emit();
      return;
    }
    window.setTimeout(() => selectTrack(nextSmartTrackIndex(), true), 250);
  });

  audioElement = audio;
  loadCurrentTrack(false);
  return audio;
}

function loadCurrentTrack(autoplay: boolean) {
  const audio = getAudioElement();
  if (!audio) return;
  const track = activeTrack();
  const nextSrc = resolveAssetPath(track.src);
  if (audio.src !== nextSrc) {
    audio.src = nextSrc;
    audio.load();
  }
  currentTime = 0;
  duration = 0;
  loading = true;
  error = undefined;
  emit();
  if (autoplay) void playStudyMusic();
}

async function playStudyMusic() {
  const audio = getAudioElement();
  if (!audio) return getStudyMusicState();

  playing = true;
  loading = audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA;
  error = undefined;
  emit();

  try {
    await audio.play();
  } catch {
    playing = false;
    loading = false;
    error = "Tap play to start";
    emit();
  }
  return getStudyMusicState();
}

function selectTrack(nextIndex: number, autoplay: boolean, options: { fromHistory?: boolean } = {}) {
  const normalizedIndex = (nextIndex + studyTracks.length) % studyTracks.length;
  if (!options.fromHistory && normalizedIndex !== trackIndex) {
    previousTrackIndexes = [...previousTrackIndexes, trackIndex].slice(-20);
  }
  trackIndex = normalizedIndex;
  rememberTrack(trackIndex);
  loadCurrentTrack(autoplay);
  return getStudyMusicState();
}

export function subscribeStudyMusic(listener: Listener) {
  listeners.add(listener);
  listener(getStudyMusicState());
  return () => {
    listeners.delete(listener);
  };
}

export function toggleStudyMusic() {
  const audio = getAudioElement();
  if (!audio) return getStudyMusicState();
  if (playing && !audio.paused) {
    audio.pause();
    return getStudyMusicState();
  }
  void playStudyMusic();
  return getStudyMusicState();
}

export function skipStudyTrack(direction: 1 | -1) {
  const audio = getAudioElement();
  const shouldAutoplay = playing || Boolean(audio && !audio.paused);

  if (direction === -1) {
    const previousIndex = previousTrackIndexes.pop();
    if (previousIndex !== undefined) {
      return selectTrack(previousIndex, shouldAutoplay, { fromHistory: true });
    }
  }

  return selectTrack(nextSmartTrackIndex(), shouldAutoplay);
}

export function seekStudyMusic(ratio: number) {
  const audio = getAudioElement();
  if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return getStudyMusicState();
  const nextTime = Math.max(0, Math.min(1, ratio)) * audio.duration;
  audio.currentTime = nextTime;
  currentTime = nextTime;
  emit();
  return getStudyMusicState();
}
