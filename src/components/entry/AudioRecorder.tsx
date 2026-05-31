"use client";

import { useRef, useState } from "react";
import { Mic, Square, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { UploadedMedia } from "./ImageUploader";

interface Props {
  value: UploadedMedia[];
  onChange: (media: UploadedMedia[]) => void;
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function AudioRecorder({ value, onChange }: Props) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 32 kbps Opus = ~240 KB / min — mieści się w limicie request body Vercela
      // (4.5 MB) nawet dla długich notatek.
      const mr = new MediaRecorder(stream, { audioBitsPerSecond: 32000 });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        await upload(blob);
      };
      mr.start();
      startedAtRef.current = Date.now();
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        setElapsed((Date.now() - startedAtRef.current) / 1000);
      }, 250);
      setRecording(true);
    } catch (e) {
      toast.error("Nie udało się włączyć mikrofonu.");
      console.error(e);
    }
  }

  function stop() {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
  }

  async function upload(blob: Blob) {
    setUploading(true);
    const ext = blob.type.includes("ogg") ? "ogg" : "webm";
    const fd = new FormData();
    fd.append("file", new File([blob], `nagranie.${ext}`, { type: blob.type }));
    fd.append("kind", "audio");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Nie udało się zapisać nagrania.");
      setUploading(false);
      return;
    }
    const data = await res.json();
    onChange([...value, data]);
    setUploading(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 && (
        <div className="flex flex-col gap-2">
          {value.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2 border border-border rounded-md p-2"
            >
              <audio src={m.path} controls className="flex-1 h-9" />
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x.id !== m.id))}
                className="p-2 rounded-md hover:bg-foreground/5"
                aria-label="Usuń nagranie"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      {!recording ? (
        <button
          type="button"
          onClick={start}
          disabled={uploading}
          className="inline-flex items-center gap-2 px-3 h-11 rounded-md border border-border hover:bg-foreground/5 text-sm w-fit"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          {uploading ? "Zapisuję…" : "Nagraj notatkę"}
        </button>
      ) : (
        <button
          type="button"
          onClick={stop}
          className="inline-flex items-center gap-2 px-3 h-11 rounded-md bg-red-600 text-white hover:bg-red-700 text-sm w-fit"
        >
          <Square className="h-4 w-4 fill-current" />
          Zatrzymaj ({formatSeconds(elapsed)})
        </button>
      )}
    </div>
  );
}
