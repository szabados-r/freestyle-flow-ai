import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { Mic, MicOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";

export interface MicResult {
  transcript: string;
  durationMs: number;
}

export function MicRecorder({
  active,
  onDone,
  accent,
}: {
  active: boolean;
  onDone: (r: MicResult) => void;
  accent: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const startTimeRef = useRef<number>(0);
  const finalRef = useRef<string>("");
  const partialRef = useRef<string>("");

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data: { text: string }) => {
      partialRef.current = data.text ?? "";
    },
    onCommittedTranscript: (data: { text: string }) => {
      finalRef.current = (finalRef.current + " " + data.text).trim();
      partialRef.current = "";
    },
  });

  const start = useCallback(async () => {
    setError(null);
    finalRef.current = "";
    partialRef.current = "";
    try {
      const res = await fetch("/api/scribe-token", { method: "POST" });
      if (!res.ok) throw new Error("token failed");
      const { token } = (await res.json()) as { token: string };
      await scribe.connect({
        token,
        microphone: { echoCancellation: true, noiseSuppression: true },
      });
      startTimeRef.current = performance.now();
      setRecording(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "mic failed");
    }
  }, [scribe]);

  const stop = useCallback(async () => {
    const dur = performance.now() - startTimeRef.current;
    setRecording(false);
    // Force-finalize any in-progress segment before tearing down.
    try {
      scribe.commit?.();
    } catch {
      // ignore
    }
    // Wait for the commit event to land, then disconnect.
    await new Promise((r) => setTimeout(r, 600));
    try {
      await scribe.disconnect();
    } catch {
      // ignore
    }
    // Fall back to the latest partial if nothing got committed.
    const text = (finalRef.current || partialRef.current).trim();
    onDone({ transcript: text, durationMs: dur });
  }, [scribe, onDone]);

  useEffect(() => {
    if (active && !recording) void start();
    if (!active && recording) void stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <motion.div
          animate={recording ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="grid h-12 w-12 place-items-center rounded-full"
          style={{ background: recording ? accent : "var(--color-muted)" }}
        >
          {recording ? (
            <Mic className="h-5 w-5 text-black" />
          ) : (
            <MicOff className="h-5 w-5 text-muted-foreground" />
          )}
        </motion.div>
        <div className="flex-1">
          <div className="display text-xs uppercase tracking-widest text-muted-foreground">
            {recording ? "Listening…" : "Mic idle"}
          </div>
          <div className="mt-1 min-h-[1.5rem] text-sm">
            {finalRef.current || scribe.partialTranscript || (
              <span className="text-muted-foreground">Drop your bar…</span>
            )}
          </div>
        </div>
        {recording && (
          <Button variant="secondary" onClick={() => void stop()} size="sm">
            Done
          </Button>
        )}
      </div>
      {error && <div className="mt-2 text-xs text-destructive">{error}</div>}
    </div>
  );
}