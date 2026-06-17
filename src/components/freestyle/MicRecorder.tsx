import { Mic, MicOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";

export interface MicResult {
  /** Resolves to the transcribed text once the server returns. */
  transcriptPromise: Promise<string>;
  durationMs: number;
}

export function MicRecorder({
  active,
  onDone,
  accent,
  language,
}: {
  active: boolean;
  onDone: (r: MicResult) => void;
  accent: string;
  language?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const startTimeRef = useRef<number>(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const start = useCallback(async () => {
    setError(null);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const rec = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorderRef.current = rec;
      rec.start(250);
      startTimeRef.current = performance.now();
      setRecording(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "mic failed");
    }
  }, []);

  const stop = useCallback(() => {
    const dur = performance.now() - startTimeRef.current;
    const rec = recorderRef.current;
    if (!rec) return;
    setRecording(false);
    const transcriptPromise = new Promise<string>((resolve) => {
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || "audio/webm",
        });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
        if (blob.size === 0) return resolve("");
        try {
          const form = new FormData();
          const ext = (rec.mimeType || "").includes("mp4") ? "mp4" : "webm";
          form.append("file", blob, `bar.${ext}`);
          if (language) form.append("language", language);
          const r = await fetch("/api/transcribe", {
            method: "POST",
            body: form,
          });
          if (!r.ok) return resolve("");
          const data = (await r.json()) as { text: string };
          resolve((data.text ?? "").trim());
        } catch {
          resolve("");
        }
      };
      try {
        rec.stop();
      } catch {
        resolve("");
      }
    });
    onDone({ transcriptPromise, durationMs: dur });
  }, [onDone, language]);

  useEffect(() => {
    if (active && !recording) void start();
    if (!active && recording) stop();
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
            <span className="text-muted-foreground">
              {recording ? "Recording — we'll transcribe in the background." : "Drop your bar…"}
            </span>
          </div>
        </div>
        {recording && (
          <Button variant="secondary" onClick={stop} size="sm">
            Done
          </Button>
        )}
      </div>
      {error && <div className="mt-2 text-xs text-destructive">{error}</div>}
    </div>
  );
}