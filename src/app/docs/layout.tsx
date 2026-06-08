// Layout dla /docs — zupełnie odrębny od AppShell aplikacji. Strona w pełni
// publiczna (middleware musi przepuszczać /docs/* bez sesji).

import type { Metadata } from "next";

const TITLE = "Dziennik API · Dokumentacja";
const DESCRIPTION =
  "REST API do dziennika — wpisy, tagi, nastrój, rozmowy z asystentem. Dla agentów i deweloperów.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Dziennik API",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
