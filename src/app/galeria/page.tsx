"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { GalleryView } from "@/components/media/GalleryView";

export default function GaleriaPage() {
  const router = useRouter();
  return (
    <AppShell>
      <GalleryView onBack={() => router.back()} />
    </AppShell>
  );
}
