/**
 * Seed przykładowych wpisów dla nowego konta gościa.
 * Wpisy są datowane na ostatnie 7 dni (today − 6 … today), po 2–3 na dzień.
 * Wywoływane raz, zaraz po pierwszym anonimowym logowaniu — jeśli konto
 * ma już jakiekolwiek wpisy, seed jest pomijany.
 */

import { createEntry, listEntries } from "./db-supabase";

interface SeedEntry {
  /** Offset od dziś w dniach (0 = dziś, -1 = wczoraj, ...) */
  dayOffset: number;
  hour: number;
  minute: number;
  text: string;
  mood: string | null;
  tags: string[];
}

const SEED: SeedEntry[] = [
  // -6 (poniedziałek)
  {
    dayOffset: -6,
    hour: 7,
    minute: 30,
    text: "Poranna kawa zanim świat się obudził. Cisza pachnąca paloną fasolą i wczorajszą lekturą. Lubię ten moment.",
    mood: "spokoj",
    tags: ["poranek", "rytuały"],
  },
  {
    dayOffset: -6,
    hour: 13,
    minute: 15,
    text: "Spotkanie z klientem poszło lepiej niż się spodziewałem. Powiedział „dobra robota” — krótkie, ale zostało we mnie na cały dzień.",
    mood: "radosc,energia",
    tags: ["praca"],
  },
  {
    dayOffset: -6,
    hour: 22,
    minute: 40,
    text: "Przed snem zerknąłem na zdjęcia z weekendu. Nie ma czego analizować — po prostu było dobrze.",
    mood: "refleksja",
    tags: ["rodzina"],
  },

  // -5 (wtorek)
  {
    dayOffset: -5,
    hour: 6,
    minute: 50,
    text: "Bieg 6 km wzdłuż rzeki. Nogi ciężkie, ale głowa wreszcie pusta.",
    mood: "energia",
    tags: ["sport", "bieganie"],
  },
  {
    dayOffset: -5,
    hour: 14,
    minute: 20,
    text: "Wpadłem w focus na trzy godziny i nawet nie spostrzegłem, kiedy minęły. Tak powinno wyglądać dobre popołudnie.",
    mood: "energia",
    tags: ["praca", "flow"],
  },
  {
    dayOffset: -5,
    hour: 21,
    minute: 10,
    text: "10 minut medytacji. Dzisiaj weszło łatwo, trochę przypadkiem.",
    mood: "spokoj",
    tags: ["medytacja"],
  },

  // -4 (środa)
  {
    dayOffset: -4,
    hour: 9,
    minute: 0,
    text: "Pada od rana. Zostaję w piżamie do południa i to jest cały plan.",
    mood: "spokoj",
    tags: ["leniwy dzień"],
  },
  {
    dayOffset: -4,
    hour: 16,
    minute: 30,
    text: "Telefon do mamy — czterdzieści minut o niczym i o wszystkim. Powinienem dzwonić częściej.",
    mood: "refleksja",
    tags: ["rodzina"],
  },
  {
    dayOffset: -4,
    hour: 23,
    minute: 0,
    text: "„Stoner” Johna Williamsa. Już rozumiem, czemu wszyscy o tej książce tak mówią.",
    mood: "refleksja",
    tags: ["książki"],
  },

  // -3 (czwartek)
  {
    dayOffset: -3,
    hour: 8,
    minute: 15,
    text: "Standup zespołu. Próbujemy nowego formatu — krócej, konkretniej. Wygląda, że działa.",
    mood: "energia",
    tags: ["praca", "zespół"],
  },
  {
    dayOffset: -3,
    hour: 13,
    minute: 45,
    text: "Lunch sam w nowej knajpie. Sajgonki tak dobre, że zapomniałem o telefonie.",
    mood: "radosc",
    tags: ["jedzenie"],
  },
  {
    dayOffset: -3,
    hour: 19,
    minute: 0,
    text: "Spacer ze znajomym. Gadaliśmy o planach na lato — może w końcu pojedziemy w Bieszczady.",
    mood: "spokoj,radosc",
    tags: ["przyjaciele", "plany"],
  },

  // -2 (piątek)
  {
    dayOffset: -2,
    hour: 11,
    minute: 0,
    text: "Zamknęliśmy duży etap projektu! Cały zespół zasłużył na ten weekend.",
    mood: "radosc,energia",
    tags: ["praca", "sukces"],
  },
  {
    dayOffset: -2,
    hour: 20,
    minute: 30,
    text: "Pizza i film z M. Banalny wieczór, ale dokładnie tego potrzebowałem po tym tygodniu.",
    mood: "spokoj",
    tags: ["wieczór"],
  },

  // -1 (sobota)
  {
    dayOffset: -1,
    hour: 9,
    minute: 30,
    text: "Rower wzdłuż Wisły, 38 km. Słońce, wiatr w plecy, nic do roboty. Najlepszy rodzaj soboty.",
    mood: "radosc,energia",
    tags: ["rower", "sport"],
  },
  {
    dayOffset: -1,
    hour: 14,
    minute: 0,
    text: "Obiad u rodziców. Mama zrobiła pierogi — schowałem dwie porcje do zamrażarki na potem.",
    mood: "radosc",
    tags: ["rodzina", "jedzenie"],
  },
  {
    dayOffset: -1,
    hour: 23,
    minute: 30,
    text: "Czuję lekkie zmęczenie, ale takie dobre — kiedy ciało wie, że dzień był wart spędzenia.",
    mood: "zmeczenie,spokoj",
    tags: ["refleksje"],
  },

  // 0 (dziś)
  {
    dayOffset: 0,
    hour: 10,
    minute: 0,
    text: "Powolne niedzielne śniadanie, jajka w koszulkach (znowu się rozpadły, ale były dobre).",
    mood: "spokoj",
    tags: ["poranek"],
  },
  {
    dayOffset: 0,
    hour: 17,
    minute: 0,
    text: "Planowanie tygodnia. Mam nadzieję, że uda się zachować tę sobotnią energię.",
    mood: "refleksja,energia",
    tags: ["planowanie"],
  },
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function dateFor(offset: number, hour: number, minute: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/**
 * Tworzy seed-wpisy dla aktualnie zalogowanego użytkownika.
 * No-op jeśli użytkownik ma już choć jeden wpis.
 */
export async function seedGuestEntries(): Promise<{ created: number }> {
  // Idempotentność: jeśli są już wpisy, nic nie robimy.
  const existing = await listEntries();
  if (existing.length > 0) return { created: 0 };

  let created = 0;
  for (const e of SEED) {
    try {
      await createEntry({
        contentHtml: `<p>${escapeHtml(e.text)}</p>`,
        mood: e.mood,
        createdAt: dateFor(e.dayOffset, e.hour, e.minute),
        tags: e.tags,
        media: [],
      });
      created++;
    } catch (err) {
      // Nie blokujemy logowania — w najgorszym razie kilka wpisów się nie założy.
      console.error("seedGuestEntries: failed to create entry", err);
    }
  }
  return { created };
}
