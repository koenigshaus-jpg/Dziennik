// Next App Router konwencja — serwowane na /robots.txt. Pozwala botom
// (GPTBot, ChatGPT-User, Googlebot, …) crawlować /docs, zakazuje resztę.
//
// Bez tego pliku ChatGPT pyta o /robots.txt → middleware redirectuje na
// /login → ChatGPT uznaje że dokumentacja jest za auth-wallem.

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/docs", "/docs/"],
        disallow: ["/", "/api/", "/ustawienia/", "/historia", "/wpis/", "/login"],
      },
    ],
  };
}
