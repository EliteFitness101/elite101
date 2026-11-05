import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

type Props = { src: string; title: string; className?: string };

export default function EliteMediaShowcaseVideo({ src, title, className = "" }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.25);
      if (visible) {
        void video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      } else {
        video.pause();
        setPlaying(false);
      }
    }, { threshold: [0, 0.25, 0.5] });
    observer.observe(video);
    return () => { observer.disconnect(); video.pause(); };
  }, [src]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    else { video.pause(); setPlaying(false); }
  };

  const toggleSound = () => {
    const video = videoRef.current;
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (video) {
      video.muted = nextMuted;
      if (!nextMuted && video.paused) void video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  return (
    <div className={`relative isolate overflow-hidden bg-black ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        muted={muted}
        loop
        playsInline
        preload="metadata"
        aria-label={title}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src={src} type="video/mp4" />
      </video>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/15" />
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between gap-2">
        <span className="max-w-[65%] truncate rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[10px] font-medium tracking-wide text-white/85 backdrop-blur">{title}</span>
        <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/60 p-1 text-white backdrop-blur">
          <button type="button" onClick={togglePlayback} aria-label={playing ? `Pause ${title}` : `Play ${title}`} className="rounded-full p-2 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button type="button" onClick={toggleSound} aria-label={muted ? `Unmute ${title}` : `Mute ${title}`} className="rounded-full p-2 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <span className="sr-only" aria-live="polite">{muted ? "Video is muted. Tap the speaker button to hear audio." : "Video audio enabled."}</span>
    </div>
  );
}
