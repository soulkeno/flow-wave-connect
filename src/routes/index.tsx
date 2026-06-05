import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import bgVideo from "@/assets/background.mp4.asset.json";
import musicFile from "@/assets/music.mp3.asset.json";

const DISCORD_ID = "1432773324143988747";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "collapse" },
      { name: "description", content: "claude.ai" },
      { property: "og:title", content: "collapse" },
      { property: "og:description", content: "claude.ai" },
    ],
  }),
  component: Bio,
});

type Lanyard = {
  discord_user: {
    id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
  };
  discord_status: "online" | "idle" | "dnd" | "offline";
  activities: Array<{
    id: string;
    name: string;
    type: number;
    state?: string;
    details?: string;
  }>;
};

const statusColor: Record<string, string> = {
  online: "bg-emerald-400",
  idle: "bg-amber-400",
  dnd: "bg-rose-500",
  offline: "bg-zinc-500",
};

function Bio() {
  const [entered, setEntered] = useState(false);
  const [lanyard, setLanyard] = useState<Lanyard | null>(null);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = new WebSocket("wss://api.lanyard.rest/socket");
    let heartbeat: ReturnType<typeof setInterval>;
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.op === 1) {
        ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } }));
        heartbeat = setInterval(() => ws.send(JSON.stringify({ op: 3 })), msg.d.heartbeat_interval);
      } else if (msg.t === "INIT_STATE" || msg.t === "PRESENCE_UPDATE") {
        setLanyard(msg.t === "INIT_STATE" ? msg.d : msg.d);
      }
    };
    return () => {
      clearInterval(heartbeat);
      ws.close();
    };
  }, []);

  useEffect(() => {
    if (!entered) return;
    const a = audioRef.current;
    if (!a) return;
    a.volume = 0.5;
    a.play().catch(() => setPlaying(false));
  }, [entered]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const onTime = () => {
    const a = audioRef.current;
    if (!a) return;
    setCurrent(a.currentTime);
    setDuration(a.duration || 0);
    setProgress((a.currentTime / (a.duration || 1)) * 100);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    const bar = barRef.current;
    if (!a || !bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    a.currentTime = pct * a.duration;
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const user = lanyard?.discord_user;
  const avatar = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith("a_") ? "gif" : "png"}?size=128`
    : null;
  const customStatus = lanyard?.activities.find((a) => a.id === "custom")?.state ?? "claude.ai";

  return (
    <div className="relative min-h-screen overflow-hidden text-white font-sans">
      <video
        className="fixed inset-0 h-full w-full object-cover -z-10"
        autoPlay
        muted
        loop
        playsInline
        src={bgVideo.url}
      />
      <div className="fixed inset-0 bg-black/50 -z-10" />

      <audio
        ref={audioRef}
        src={musicFile.url}
        loop
        onTimeUpdate={onTime}
        onLoadedMetadata={onTime}
      />

      {/* enter screen */}
      <div
        onClick={() => setEntered(true)}
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black cursor-pointer transition-opacity duration-700 ${
          entered ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="text-sm tracking-[0.4em] text-white/40 animate-pulse">click to enter</div>
      </div>

      {/* card */}
      <main
        className={`min-h-screen flex items-center justify-center p-4 transition-all duration-1000 ${
          entered ? "opacity-100 blur-0" : "opacity-0 blur-md"
        }`}
      >
        <div className="w-full max-w-md space-y-3">
          {/* profile box */}
          <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="relative">
                {avatar ? (
                  <img src={avatar} alt="avatar" className="h-16 w-16 rounded-full border border-white/20" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-white/10" />
                )}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-black ${
                    statusColor[lanyard?.discord_status ?? "offline"]
                  }`}
                />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-semibold leading-tight">
                  {user?.global_name ?? user?.username ?? "collapse"}
                </div>
                <div className="text-xs text-white/50">@{user?.username ?? "loading"}</div>
                <div className="mt-1 text-sm text-white/70 truncate">{customStatus}</div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <a
                href={`https://discord.com/users/${DISCORD_ID}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-center rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition"
              >
                discord
              </a>
            </div>
          </section>

          {/* work box */}
          <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-2xl">
            <div className="text-xs uppercase tracking-widest text-white/40 mb-3">my work</div>
            <div className="grid grid-cols-2 gap-2">
              <ProjectCard icon="⚔️" name="FlowClient" desc="Injectable Minecraft Combat Cheat" />
              <ProjectCard
                icon="🌊"
                name="WaveMacros"
                desc="Third-Party Macro Software for 5 gamemodes"
              />
            </div>
          </section>

          {/* music box */}
          <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-2xl">
            <div className="text-xs uppercase tracking-widest text-white/40 mb-3">music</div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 rounded-md bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-xl">
                  ♪
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">original sound</div>
                  <div className="text-xs text-white/50 truncate">tr1x.fx</div>
                </div>
              </div>
              <button
                onClick={togglePlay}
                className="h-9 w-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition"
                aria-label={playing ? "pause" : "play"}
              >
                {playing ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>
                )}
              </button>
            </div>
            <div
              ref={barRef}
              onClick={seek}
              className="mt-4 h-1 rounded-full bg-white/10 cursor-pointer overflow-hidden"
            >
              <div
                className="h-full bg-white/80 transition-[width] duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-white/40 font-mono">
              <span>{fmt(current)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function ProjectCard({ icon, name, desc }: { icon: string; name: string; desc: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition">
      <div className="text-xl">{icon}</div>
      <div className="mt-1.5 text-sm font-medium">{name}</div>
      <div className="text-[11px] text-white/50 leading-snug mt-0.5">{desc}</div>
    </div>
  );
}
