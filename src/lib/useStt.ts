"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface UseSttOptions {
  onTranscript: (text: string) => void;
  maxSeconds?: number;
}

interface UseSttReturn {
  recording: boolean;
  processing: boolean;
  elapsed: number;
  start: () => Promise<void>;
  stop: () => void;
}

export function useStt({
  onTranscript,
  maxSeconds = 60,
}: UseSttOptions): UseSttReturn {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const autoStopRef = useRef<number | null>(null);

  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopRef.current) {
      window.clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    setRecording(false);
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { audioBitsPerSecond: 32000 });
      recorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const mime = mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        setProcessing(true);
        try {
          const ext = mime.includes("ogg")
            ? "ogg"
            : mime.includes("mp4")
            ? "mp4"
            : "webm";
          const file = new File([blob], `voice.${ext}`, { type: blob.type });
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: fd,
          });
          if (!res.ok) {
            const err = (await res.json().catch(() => null)) as {
              error?: string;
            } | null;
            throw new Error(err?.error || "Transkrypcja nie powiodła się.");
          }
          const data = (await res.json()) as { text?: string };
          const text = (data.text || "").trim();
          if (!text) {
            toast.message("Nie wykryto mowy.");
          } else {
            onTranscriptRef.current(text);
          }
        } catch (e) {
          console.error(e);
          toast.error(
            e instanceof Error ? e.message : "Transkrypcja nie powiodła się."
          );
        } finally {
          setProcessing(false);
        }
      };
      mr.start();
      startedAtRef.current = Date.now();
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        setElapsed((Date.now() - startedAtRef.current) / 1000);
      }, 250);
      autoStopRef.current = window.setTimeout(() => {
        toast.message(`Osiągnięto limit ${maxSeconds}s.`);
        stop();
      }, maxSeconds * 1000);
      setRecording(true);
    } catch (e) {
      toast.error("Nie udało się włączyć mikrofonu.");
      console.error(e);
    }
  }, [maxSeconds, stop]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (autoStopRef.current) window.clearTimeout(autoStopRef.current);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          recorderRef.current.stop();
        } catch {}
      }
    };
  }, []);

  return { recording, processing, elapsed, start, stop };
}
