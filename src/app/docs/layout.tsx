// Layout dla /docs — zupełnie odrębny od AppShell aplikacji. Strona w pełni
// publiczna (middleware musi przepuszczać /docs/* bez sesji).

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dziennik API · Dokumentacja",
  description:
    "REST API do dziennika — wpisy, tagi, nastrój, rozmowy z asystentem. Dla agentów i deweloperów.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
