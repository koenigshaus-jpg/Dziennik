// Seed 300 wpisów dla konta gościa (Aleksander Wroński, projektant, Kraków)
// Uruchom: SUPABASE_SECRET_KEY=... GUEST_USER_ID=... node scripts/seed-300.mjs

import { readFileSync } from "node:fs";

const SUPABASE_URL = "https://jtbfsqpwbtljuifbcdpl.supabase.co";

// Klucze z .env.local (nie hardkodujemy sekretów w repo).
function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
  } catch {
    /* ignore */
  }
  return env;
}
const ENV = loadEnv();
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || ENV.SUPABASE_SECRET_KEY;
const USER_ID = process.env.GUEST_USER_ID || ENV.GUEST_USER_ID;

if (!SERVICE_KEY || !USER_ID) {
  console.error("Brak SUPABASE_SECRET_KEY lub GUEST_USER_ID (.env.local).");
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

// ─── Dane ───────────────────────────────────────────────────────────────────

// Wszystkie tagi których użyjemy (name → id, uzupełnimy po upsert)
const TAG_NAMES = [
  "studio", "klienci", "finanse", "projekt", "umowa", "branding",
  "grzyby", "zielnik", "las", "mycologia",
  "szermierka", "sabel", "trening", "zawody",
  "maszyna do pisania", "restauracja", "allegro",
  "praca", "refleksja", "poranek", "wieczór",
  "kryzys", "przełom", "motywacja", "wątpliwości",
  "networking", "oferta", "faktura", "pitch",
  "kraków", "spacer", "zdrowie", "zmęczenie",
  "radość", "frustracja", "flow", "prokrastynacja",
  "rodzina", "przyjaciele", "samotność", "kawa",
];

// Wpisy: [dayOffset od 2026-06-22, hour, minute, html, mood, tags[]]
// dayOffset ujemny = przeszłość. Ostatnie 3 mies. = -92..0 (22 marca – 22 czerwca)
const ENTRIES = [
  // ═══════ MARZEC ═══════

  // 22 marca – pierwszy dzień nowego rozdziału
  [-92, 7, 15, `<p>Dzisiaj oficjalnie. Wysłałem wypowiedzenie tydzień temu, dziś ostatni dzień w Pixelator Studio. Wziąłem swoje rzeczy w torbie — sketchbooki, dwa markery Pantone, kubek z sową. Tyle po czterech latach.</p><p>Wychodzę założyć własne. Firma nazywa się <strong>Wroński Studio</strong>. Brzmi poważnie. Mam nadzieję, że będę w stanie to udźwignąć.</p>`, "energia,lęk", ["studio", "refleksja", "przełom"]],
  [-92, 12, 30, `<p>Obiad z Ewą — ona się cieszy, ja jestem trochę zielony na twarzy. „Masz talenty i kontakty, dasz radę" — mówi. Wie, że potrzebuję to usłyszeć.</p><p>Kawa po obiedzie i zacząłem liczyć: ile mam na koncie, ile kosztuje ZUS, ile lat doświadczenia. Liczby wyglądają… okej. Niekiedy wyglądają okej.</p>`, "refleksja,lęk", ["finanse", "refleksja"]],
  [-92, 21, 0, `<p>Wieczorem wyjąłem starą Underwood nr 5, tę z pchlich targów z Podgórza. Oczyściłem mechanizm, naoliwiłem dźwignię. Klika pięknie. Napisałem na niej: <em>„22 marca 2026. Zaczynam."</em></p><p>Schowam tę karteczkę.</p>`, "spokoj,refleksja", ["maszyna do pisania", "restauracja", "refleksja"]],

  // 23 marca
  [-91, 8, 0, `<p>Pierwsze prawdziwe wolne rano. Nie musiałem nigdzie jechać. Siedziałem z kawą i gapiłem się przez okno na Planty przez godzinę. To było dziwne i dobre.</p>`, "spokoj", ["poranek", "kawa", "kraków"]],
  [-91, 14, 30, `<p>Napisałem do trzech potencjalnych klientów z którymi gadałem jeszcze będąc w Pixelatorze. Oficjalne info że zaczynam solo. Jedna odpowiedź od razu — Bartek z Kafeterki pyta o rebranding. To coś!</p>`, "energia,radość", ["klienci", "studio", "networking"]],
  [-91, 20, 45, `<p>Trening szabli. Maestro Kowalczyk powiedział że mam za luźny nadgarstek przy ataku. Ćwiczyłem to przez całą drugą połowę sparingu. Wróciłem zmęczony, ale głowa pusta. Dobrze.</p>`, "zmęczenie,energia", ["szermierka", "sabel", "trening"]],

  // 24 marca
  [-90, 9, 15, `<p>Rejestracja działalności online. Formularz CEIDG zabrał mi pół dnia. Część kodów PKD musiałem szukać, bo nigdy nie wiedziałem że „usługi projektowe" to cztery osobne kody. Polska administracja.</p>`, "frustracja", ["studio", "finanse"]],
  [-90, 17, 0, `<p>Poszedłem po południu do Lasku Wolskiego. Jeszcze bez grzybów, ale zobaczyłem pierwsze wiosenne mycelium przy starym buku. Zdjęcia zrobiłem, wrzucę do zielnika. Zawsze uspokajam się w lesie.</p>`, "spokoj", ["grzyby", "las", "zielnik", "kraków"]],

  // 25 marca
  [-89, 8, 30, `<p>Kawa i plan. Przez rano robiłem arkusz kalkulacyjny: stawki, koszty, break-even. Jeśli dostanę 3 klientów na miesiąc z budżetem 5k+, wyrobię się. To brzmi realnie. Albo mi się tak wydaje.</p>`, "refleksja,lęk", ["finanse", "studio", "praca"]],
  [-89, 13, 0, `<p>Lunch z Bartem z Kafeterki. Chcą nowy logotyp + system identyfikacji. Budżet: 8k zł. To mój pierwszy własny kontrakt. Ręce mi się trochę trzęsły kiedy podawałem mu brief.</p>`, "energia,radość", ["klienci", "umowa", "branding", "projekt"]],
  [-89, 22, 30, `<p>Nie mogłem zasnąć. Zacząłem czyścić drugą maszynę — Olivetti Lettera 32, błękit jak włoskie niebo. Jakiś poprzedni właściciel zalał ją kawą, klawisz „o" klei się do połowy. Skrobałem i czyściłem do północy. Zasnąłem spokojnie.</p>`, "spokoj", ["maszyna do pisania", "restauracja"]],

  // 26 marca
  [-88, 7, 45, `<p>Rano pobiegałem Bulwarami. Wiosna faktycznie przyszła — kasztany pączkują, pierwsi wędkarze przy rzece. Biegłem z muzyką i nie myślałem o niczym przez 40 minut. Luksus.</p>`, "energia,spokoj", ["poranek", "kraków"]],
  [-88, 15, 0, `<p>Pierwsze szkice dla Kafeterki. Pięć kierunków. Jeden mi się podoba bardzo, dwa są okej, dwa są zapasowe. To właśnie lubię — ten moment kiedy logotyp zaczyna żyć na papierze.</p>`, "flow,energia", ["projekt", "branding", "flow"]],

  // 27 marca
  [-87, 9, 0, `<p>Przyszedł mail od znajomej — agencja szuka freelancerów. Stawki niskie (150/h netto), ale stały flow projektów. Zastanawiam się. To byłoby bezpieczeństwo, ale trochę jakbym wracał.</p>`, "wątpliwości,refleksja", ["klienci", "finanse", "wątpliwości"]],
  [-87, 18, 30, `<p>Trening. Dziś pracowaliśmy na dystansie — Kowalczyk mówi że mam dobry refleks, ale za mało cierpliwości przy rozbiegu. „Szabla nie lubi pośpiechu" — powiedział. Zanotowałem.</p>`, "energia", ["szermierka", "trening"]],
  [-87, 23, 0, `<p>Napisałem do agencji że dziękuję, ale nie. Chcę sprawdzić sam siebie. Jeśli po trzech miesiącach będę bez klientów, to wrócę do rozmów. Ale najpierw — sprawdzam.</p>`, "motywacja,lęk", ["studio", "wątpliwości", "motywacja"]],

  // 28 marca
  [-86, 10, 0, `<p>W końcu otworzyłem porzucone pudełko z Allegro — Remington Portable z 1934 roku. Stan: bardzo trudny. Brakuje trzech klawiszy, wózek chodzi z oporem. Ale chromowane elementy są piękne.</p><p>To będzie projekt na miesiąc.</p>`, "refleksja", ["maszyna do pisania", "restauracja", "allegro"]],
  [-86, 16, 30, `<p>Przegląd szkiców z Bartem. Spodobał mu się kierunek trzeci, nie ten który ja lubiłem. Ale widzę w tym logikę — dla kawiarni spójność z wnętrzem ważniejsza niż „innowacyjność". Okey, kierunek trzeci.</p>`, "praca,refleksja", ["projekt", "klienci", "branding"]],

  // 29-30 marca (weekend)
  [-85, 9, 30, `<p>Las Wolski z Ewą. Chciałem jej pokazać gdzie rosną smardze — za wcześnie jeszcze, ale znaleźliśmy stary bukowy pieniek ze sroczykiem (trametes versicolor). Zrobiłem opis do zielnika, ona zrobiła zdjęcia.</p><p>Powiedziała że mój zielnik wygląda jak grimoire czarodzieja. Nieźle.</p>`, "radość,spokoj", ["grzyby", "las", "zielnik", "przyjaciele"]],
  [-84, 11, 0, `<p>Niedziela planowania. Mam jeden kontrakt (Kafeterka), jeden lead (Bartek pytał o wizytówki dla kolegi), zero stałych przychodów. ZUS za kwiecień zapłacę z oszczędności. Kalkulacja mówi że mam spokojnie 5 miesięcy buforu.</p><p>Pięć miesięcy to dużo. Pięć miesięcy to mało.</p>`, "refleksja,lęk", ["finanse", "studio", "wątpliwości"]],

  // 31 marca
  [-83, 8, 15, `<p>Ostatni dzień marca. Podsumowanie: jeden podpisany kontrakt, dwa kontakty do follow-up, jedna maszyna w trakcie restauracji, dwa treningi, jeden wypad w las. Nie najgorszy start.</p>`, "refleksja", ["refleksja", "studio"]],
  [-83, 14, 0, `<p>Pracowałem nad logotypem Kafeterki — wersja finalna idzie do Barta jutro. Użyłem klasycznego kroju bazującego na baskerville, ale zmodyfikowanego. Daje to ciepło i solidność jednocześnie.</p>`, "flow", ["projekt", "branding", "flow"]],
  [-83, 21, 0, `<p>Godzina na Remington Portable. Naprawiłem mechanizm przesuwu. Klawisze klekoczą melodyjnie. Muszę tylko znaleźć taśmę do starych maszyn — zamówiłem trzy rolki z Niemiec.</p>`, "spokoj", ["maszyna do pisania", "restauracja"]],

  // ═══════ KWIECIEŃ ═══════

  // 1 kwietnia
  [-82, 9, 0, `<p>Prima aprilis. Żaden z klientów się nie odzywał, więc żartów brak. Za to przyszedł mail z US — muszę złożyć coś w sprawie VAT. Nie rozumiem tego formularza. Zadzwoniłem do Jurka, który jest księgowym od 15 lat, i on też powiedział że „to bez sensu ale tak trzeba".</p>`, "frustracja", ["finanse", "studio"]],
  [-82, 15, 30, `<p>Kafeterka — dostarczyłem finały. Bart był zachwycony. Napisał że „to jest DOKŁADNIE to". Dostałem przelew 40% zaliczki. Zobaczyłem te pieniądze na koncie i poczułem się nagle bardzo realnie.</p>`, "radość,energia", ["klienci", "projekt", "finanse"]],
  [-82, 22, 0, `<p>Kolega Barta — Michał — napisał. Chce branding dla małej restauracji na Kazimierzu. Kafeterka zadziałała jak polecenie. Mam jutro rozmowę.</p>`, "energia,radość", ["klienci", "networking"]],

  // 2 kwietnia
  [-81, 10, 30, `<p>Rozmowa z Michałem z restauracji. Klimatyczne miejsce, kuchnia azjatycka, właściciel bardzo wie czego chce. Budżet jest „elastyczny" — czyli nie wiem ile. Powiedziałem że wyślę wycenę.</p>`, "praca", ["klienci", "pitch", "oferta"]],
  [-81, 17, 0, `<p>Trening szabli — dziś doskonale. Mam serię pięciu trafień z rzędu na sparingu z Agatą. Kowalczyk pstrykał palcami: „To, to właśnie chcę widzieć!"</p><p>Dobry trening zawsze poprawia nastrój. Nawet jeśli wróciłem z bolącym ramieniem.</p>`, "energia,radość", ["szermierka", "trening"]],

  // 3 kwietnia
  [-80, 8, 45, `<p>Wysłałem wycenę do Michała: 12 000 zł za pełen branding (logo, paleta, typografia, zastosowania). Trochę się bałem tej kwoty. Ale to uczciwa stawka, tak mówi rynek.</p>`, "lęk,motywacja", ["oferta", "finanse", "klienci"]],
  [-80, 14, 0, `<p>Wycena przyjęta bez negocjacji. Michał napisał „Brzmi dobrze, kiedy możemy zacząć?" Ledwo nie upadłem z krzesła.</p>`, "radość,energia", ["klienci", "umowa", "przełom"]],
  [-80, 20, 0, `<p>Pojechałem wieczorem na Kazimierz zobaczyć restaurację osobiście. Miejsce ma potencjał — ceglane ściany, antyki japońskie, stary bar. Muszę wyczuć klimat zanim zacznę szkicować.</p>`, "energia,refleksja", ["projekt", "kraków"]],

  // 4-5 kwietnia (weekend)
  [-79, 10, 0, `<p>Las Wolski solo. Smardze! Pierwsze w tym roku — trzy sztuki przy korzeniu dębu. Małe jeszcze, ale są. Sfotografowałem, zmierzyłem, opisałem: <em>Morchella esculenta</em>, gatunek 1, stanowisko 7.</p><p>Zielnik rośnie.</p>`, "radość,spokoj", ["grzyby", "zielnik", "las", "mycologia"]],
  [-78, 16, 0, `<p>Niedziela — poprawiałem Remington Portable. Dotarły taśmy z Niemiec. Założyłem, przetestowałem. Maszyna pisze! Niewyraźnie, bo wałek jest trochę twardy, ale pisze. Zamówiłem nowy wałek od renowatora z Łodzi.</p>`, "radość", ["maszyna do pisania", "restauracja"]],

  // 6 kwietnia
  [-77, 9, 0, `<p>Poniedziałek, dwa aktywne projekty naraz. To jest coś nowego — wcześniej w agencji zawsze miałem art directora który pilnował kolejki. Teraz ja jestem art directorem i muszę sam decydować co najpierw.</p><p>Kafeterka czeka na materiały do roll-upów. Restauracja czeka na brief. Zaczynam od briefu.</p>`, "praca,refleksja", ["praca", "projekt", "studio"]],
  [-77, 15, 0, `<p>Brief Michała wypełniony. Restauracja: „Azja z krakowską duszą". Inspiracje: stapianie kultur, herbata, ceremoniał, rzemiosło. Mam coś w głowie już — pismo kaligrafia + geometria. Jutro siadam do szkiców.</p>`, "flow,energia", ["projekt", "branding"]],

  // 7 kwietnia
  [-76, 8, 0, `<p>Wstałem o 6:30. Cisza przed burzą — do 10 siedziałem sam w mieszkaniu i szkicowałem bez przerwy. Zeszyt zapełniony, ręka boli. Mam trzy silne kierunki.</p>`, "flow", ["projekt", "branding", "flow", "poranek"]],
  [-76, 14, 30, `<p>Przyszedł mail z firmy której nie kojarzę — pytają o „kompleksowy rebranding". Bez podawania budżetu. Odruchowo chciałem odpowiedzieć od razu, ale Ewa mówiła żebym zawsze najpierw sprawdzał kim są.</p><p>Sprawdzam.</p>`, "refleksja", ["klienci", "oferta"]],
  [-76, 21, 30, `<p>Trening. Pracowaliśmy dziś nad obroną — to moja słabsza strona. Przy szabli atak przychodzi mi naturalnie, ale kiedy cofam się i muszę reagować na atak, często gubię dystans.</p><p>Kowalczyk: „Wróński, obrona to też atak. Tylko szybszy."</p>`, "zmęczenie,refleksja", ["szermierka", "trening"]],

  // 8 kwietnia
  [-75, 10, 0, `<p>Sprawdziłem firmę z maila. Są realni, robią wyposażenie łazienek. Napisałem z pytaniami o zakres i budżet. Jeśli mają 20k+ to wezmę, jeśli mniej — nie mam teraz zasobów.</p>`, "praca", ["klienci", "oferta"]],
  [-75, 16, 0, `<p>Pierwsze szkice restauracji Michałowi. Były wideokonferencja i dobre pytania. Kierunek 2 ich przykuł. Poproszono o rozwinięcie. Czuję że to ten.</p>`, "energia,radość", ["projekt", "klienci", "branding"]],

  // 9 kwietnia
  [-74, 9, 30, `<p>ZUS. Pierwsza płatność własna. Przelałem 1364 zł. To tyle co jedna duża kawa dziennie... przez 100 dni. Tak sobie to staram się tłumaczyć.</p>`, "frustracja", ["finanse", "studio"]],
  [-74, 14, 0, `<p>Firma od łazienek odpowiedziała: budżet 6000 zł. Za dużo pracy, za mało kasy. Grzecznie odmówiłem. Pierwsze świadome odrzucenie projektu. Dziwne uczucie — trochę ulgi.</p>`, "refleksja", ["klienci", "finanse"]],

  // 10-11 kwień
  [-73, 11, 0, `<p>Czwartek: spotkanie brandingowe z Agnieszką — ona prowadzi butik z rękodziełem na Starówce. Poznaliśmy się przez Instagram. Chce „delikatny i lokalny" branding. Nie mamy jeszcze rozmowy o budżecie, ale klimat mi odpowiada.</p>`, "energia", ["klienci", "networking", "branding"]],
  [-72, 9, 0, `<p>Piątek rano: zobaczyłem że Kafeterka ma pierwsze zdjęcia z nowym logo na Instagramie. Komentarze pozytywne. Jeden ktoś napisał „świetna identyfikacja, kto robił?" i Bart odpowiedział „@wronski_studio". Moje konto urosło o 40 obserwujących do wieczora.</p>`, "radość,energia", ["klienci", "branding", "networking", "studio"]],

  // 12-13 kwień (weekend)
  [-71, 9, 30, `<p>Sobota — jazda rowerem na Kopiec Kościuszki i z powrotem przez lasy. 3 godziny, 34 km. W lesie deszcz złapał, wróciłem mokry i śmiejący się jak idiota. Ewa patrzyła na mnie i kręciła głową.</p>`, "radość,energia", ["kraków"]],
  [-70, 14, 0, `<p>Niedziela — prace przy Remington. Dotarł nowy wałek z Łodzi. Montaż zajął godzinę i kilka przekleństw, ale zamontowałem. Maszyna teraz pisze jak marzenie. Czcionka pełna, litery wyraźne, dźwięk jak jazz.</p><p>Ta maszyna wychodzi na sprzedaż. Wystawiłem na Allegro — stan: restaurowany. 650 zł.</p>`, "radość", ["maszyna do pisania", "restauracja", "allegro"]],

  // 14 kwień
  [-69, 8, 30, `<p>Poniedziałek. Przyszło zapytanie przez formularz na stronie — fotograf z Krakowa, chce logo i identyfikację. Staje się to powoli. Ludzie mnie znajdują.</p>`, "energia,radość", ["klienci", "studio"]],
  [-69, 15, 0, `<p>Sesja pracy nad restauracją Michała — rozwinąłem kierunek 2. Kaligrafia japońska przetworzona w logotyp. Ręczna robota zeskanowana i wektoryzowana. Trochę jak moje stare maszyny — technika spotyka rękę.</p>`, "flow", ["projekt", "branding", "flow"]],

  // 15 kwień
  [-68, 10, 0, `<p>Remington sprzedany. 24 godziny od wystawienia. Kupujący napisał że „jest idealny". Przelał 650 zł. To był mój pierwszy własny projekt poza grafiką.</p><p>Natychmiast wystawiłem kolejną maszynę na Allegro — Olympia SM3 w kolorze pistacjowym, kupiona za 90 zł, po restauracji warta co najmniej 400. To ma sens biznesowo.</p>`, "radość", ["maszyna do pisania", "restauracja", "allegro"]],
  [-68, 17, 0, `<p>Trening. Zawody regionalne za trzy tygodnie. Kowalczyk mówi że mam szansę na podium jeśli przepracuję wolty. Wolta to coś między krokiem a skokiem — ciągłe ćwiczenia.</p>`, "energia,lęk", ["szermierka", "zawody", "trening"]],

  // 16 kwień
  [-67, 9, 0, `<p>Nowy projekt: fotograf Konrad chce proste, ciemne logo — bardzo specyficzne widzenie. Budżet 4 000 zł. Nieduże, ale projekt krótki. Dobieramy termin briefu.</p>`, "praca", ["klienci", "projekt"]],
  [-67, 14, 30, `<p>Agnieszka z butiku napisała — ma budżet 6 000 zł. Za mało jak na pełen branding, za dużo żeby odmówić. Zaproponuję okrojony zakres: logo + paleta + typografia, bez aplikacji.</p>`, "refleksja,praca", ["klienci", "oferta", "finanse"]],
  [-67, 22, 0, `<p>Poszedłem wieczorem po Plantach. Kasztany zakwitają. Przy wyjściu przy ul. Łobzowskiej zobaczyłem na murze stare ogłoszenie o wymianie maszyny — ktoś oferuje Hermes 3000 za „butelkę dobrego wina". Wziąłem numer.</p>`, "spokoj,radość", ["kraków", "maszyna do pisania"]],

  // 17-18 kwień (czw-pt)
  [-66, 11, 0, `<p>Telefon do właściciela Hermes 3000. Pan Stanisław, 78 lat. Maszyna była jego żony. Powiedział że nie chce wina, chce żeby „poszła do kogoś kto ją doceni". Umówiliśmy się w sobotę.</p>`, "refleksja,spokoj", ["maszyna do pisania", "allegro"]],
  [-65, 9, 30, `<p>Wysłałem propozycję zakresu do Agnieszki. Wzięła. Dziś też się spotkałem z Konradem — Konrad jest ciekawy, lubi długie milczenia w rozmowie i mówi że „dobra fotografia jest jak haiku". Porozumiemy się.</p>`, "energia", ["klienci", "projekt"]],

  // 19-20 kwień (weekend)
  [-64, 10, 0, `<p>Pan Stanisław mieszka w kamienicy przy Dietla. Herbata po staremu, ciasteczka, zdjęcia żony na komodzie. Hermes 3000 — szwajcarski, 1965, perfekcyjny stan. Mechanizm jak nowy.</p><p>Nie wziąłem pieniędzy. Powiedziałem że zreguluję gdy wydam katalog moich maszyn. Pan Stanisław pokiwał głową. „Ona by chciała".</p><p>Wróciłem z maszyną i łzami w koczach.</p>`, "refleksja,spokoj", ["maszyna do pisania", "kraków"]],
  [-63, 15, 0, `<p>Las w niedzielę. Znalazłem pięć czernidłaków (Coprinellus micaceus) przy korzeniu wierzby przy potoku. Toksyczne, nie jadalne, ale piękne — czarne i połyskliwe. Stanowisko 8 w zielniku.</p>`, "spokoj", ["grzyby", "zielnik", "mycologia", "las"]],

  // 21-25 kwień
  [-62, 9, 0, `<p>Poniedziałek tygodnia z trzema równoległymi projektami. Zacząłem od Konrada (fotograf) — brief jasny, on wie co chce, szkice do środy. Kafeterka zleca roll-upy.</p>`, "praca,energia", ["praca", "projekt"]],
  [-61, 14, 0, `<p>Logo Konrada — w dwie godziny flow, wyszło pięć propozycji. Jedna jest taka dobra że aż się boję wysłać za szybko.</p>`, "flow,radość", ["projekt", "branding", "flow"]],
  [-60, 10, 30, `<p>Konrad powiedział że to „dokładnie to". Kolejne logo zatwierdzone przez klienta z pierwszego podejścia. Może naprawdę mi to idzie.</p>`, "radość,energia", ["klienci", "projekt"]],
  [-59, 17, 0, `<p>Trening przed zawodami. Kowalczyk zebrał nas czworo startujących w niedzielę. Symulacja walki. Przegrałem dwa, wygrałem dwa. Symetria mnie niepokoi.</p>`, "lęk,energia", ["szermierka", "zawody", "trening"]],
  [-58, 9, 0, `<p>Piątek przed zawodami. Pracowałem nad logo Agnieszki rano, a wieczorem — zero projektowania. Tylko maszyny. Doczyszczałem Olympię SM3. Cisza, klik-klak, spokój.</p>`, "spokoj", ["maszyna do pisania", "restauracja"]],

  // 26-27 kwień (zawody szabla!)
  [-57, 7, 30, `<p>Wyjazd na zawody — Wieliczka. W minibusie z klubem słucham muzyki, nie rozmawiam. Tak mi zawsze lepiej przed walką.</p>`, "lęk,energia", ["szermierka", "zawody"]],
  [-57, 19, 0, `<p>Zawody! Wygrałem dwie walki w grupie, w ćwierćfinale przegrałem z Kacprem z Tarnowa który jest młodszy ode mnie o 8 lat i atakuje jak maszyna. Skończyłem na 6. miejscu na 24 startujących.</p><p>Kowalczyk mówi że to dobry wynik jak na mój poziom. Ja myślę: następnym razem wyżej.</p>`, "zmęczenie,refleksja,radość", ["szermierka", "zawody"]],
  [-56, 12, 0, `<p>Niedziela po zawodach. Ramię trochę boli — stłuczenie przy bloku. Leżę, czytam, piję herbatę. Olympia SM3 sprzedana w nocy — kupujący z Gdańska napisał rano że właśnie ją dostał i jest „oniemiały".</p>`, "spokoj,radość", ["maszyna do pisania", "szermierka"]],

  // 28-30 kwień
  [-55, 9, 30, `<p>Ostatni tydzień kwietnia, finanse: przychody do teraz — 15 600 zł brutto. ZUS i koszty: ok. 4 000. Zostaje 11 600. To jest więcej niż etat. Ale to nie jest miesiąc z etatem — to były trzy miesiące w jeden.</p><p>W maju muszę utrzymać tempo.</p>`, "refleksja,lęk", ["finanse", "studio", "refleksja"]],
  [-54, 14, 0, `<p>Agnieszka z butiku — prezentacja logo. Płakała. Dobre płakanie — powiedziała że „to jest ja". Rzadko ktoś tak reaguje. Wyjść od klienta z takim uczuciem to jest coś czego agencja mi nie dawała.</p>`, "radość,refleksja", ["klienci", "branding", "przełom"]],
  [-53, 11, 0, `<p>Wtorek — napisała do mnie firma z Wieliczki. Gościniec, chcą rebranding. Duże zamówienie. Umówiłem rozmowę w piątek.</p>`, "energia", ["klienci", "oferta"]],

  // ═══════ MAJ ═══════

  // 1 maja
  [-52, 10, 0, `<p>1 Maja, święto pracy. Ja pracuję. Nie złośliwie — po prostu mam przyjemność z tego co robię, więc jest to inna kategoria. Siedzę z kawą i wymyślam koncepcje dla gościńca.</p>`, "spokoj,energia", ["praca", "poranek", "kawa"]],
  [-52, 15, 30, `<p>Wypad za miasto — grzybobranie w Puszczy Niepołomickiej. Pięć gatunków notowanych: maślak (Suillus luteus), pieczarka polna (Agaricus campestris), krowiak (Paxillus involutus) — UWAGA: trujący!, gąska (Tricholoma) — do identyfikacji, i jeden grzyb całkowicie nieznany mi — stanowisko sfotografowane, próbka w papierowej torebce.</p>`, "radość,energia", ["grzyby", "las", "zielnik", "mycologia"]],

  // 2-3 maja
  [-51, 9, 0, `<p>Nieznany grzyb z wczoraj przesłałem na forum mikologów. Polska Towarzystwo Mykologiczne ma grupę na FB. Jeden z ekspertów odpowiedział w ciągu godziny — Leucopaxillus gentianeus, gorzka mleczka biała. Niejadalna, rzadka. Stanowisko 11 w zielniku.</p>`, "radość", ["grzyby", "mycologia", "zielnik"]],
  [-50, 14, 0, `<p>Rozmowa z gościńcem w Wieliczce — Anna i Tomasz Kowalowie, trzecie pokolenie w tym samym miejscu. Mają 40 lat tradycji. Chcą odświeżenia bez zdrady korzeni. To jest piękne zadanie.</p><p>Budżet: 20 000 zł. Tak. Tak!</p>`, "energia,radość", ["klienci", "projekt", "branding", "umowa"]],

  // 4-6 maja
  [-49, 8, 30, `<p>Zacząłem research historyczny do projektu gościńca. Archiwum Miejskie w Wieliczce, stare fotografie, znaki z lat 30. i 50. To rodzaj archeologii wizualnej, którą uwielbiam.</p>`, "flow,energia", ["projekt", "branding"]],
  [-48, 17, 0, `<p>Trening. Kowalczyk wprowadził nowy element — wiązania klingi. Ćwiczyliśmy to przez całą godzinę. Ramię wróciło do normy po zawodach. Forma dobra.</p>`, "energia", ["szermierka", "trening"]],
  [-47, 22, 0, `<p>Późno. Zamiast spać — pracuję nad Hermes 3000. Pan Stanisław dał mi cudo. Czcionka pica, mechanizm po szwajcarskim zegarmistrzu, oryginalna taśma przetrwała 60 lat. Zostawiam ją. Ta maszyna nie jest na sprzedaż. To eksponat.</p>`, "spokoj", ["maszyna do pisania"]],

  // 7-8 maja (czw-pt)
  [-46, 10, 0, `<p>Czwartek. Dostałem fakturę za Konrada — podpisał, przelał w ciągu dnia. To jest coś: praca zrobiona, klient zadowolony, pieniądze na koncie, nic mi się nie należy nikomu. Ten cykl jest prosty i satysfakcjonujący.</p>`, "radość,refleksja", ["finanse", "klienci"]],
  [-45, 9, 0, `<p>Piątek — spotkałem się z Agą i Patrykiem na kawie. Agnieszka z butiku dała mnie polecenie do trzech znajomych. Trzy nowe leady. Tak właśnie ma to działać.</p>`, "radość,energia", ["networking", "klienci"]],

  // 9-10 maja (weekend)
  [-44, 11, 0, `<p>Sobota w lesie za Nową Hutą — rejon przemysłowy, ale grzyby rosną wszędzie. Znalazłem kurki (Cantharellus cibarius) — sezon zaczął się wcześnie. Zebrałem tyle że musiałem dźwigać koszyk dwoma rękami. Wieczorem risotto z kurkami.</p>`, "radość,energia", ["grzyby", "las", "zielnik"]],
  [-43, 14, 0, `<p>Niedziela — obudziłem się z pomysłem. Zadzwoniłem do gościńca Kowalów i spytałem czy mogę zobaczyć stare dokumenty — menu, zaproszenia, papierowe elementy z lat poprzednich. Anna powiedziała „oczywiście, kiedy?" Jadę w środę.</p>`, "energia,radość", ["projekt", "branding"]],

  // 11-14 maja
  [-42, 9, 0, `<p>Poniedziałek, nowy tydzień. Trzy aktywne projekty plus trzy nowe leady. Muszę zdecydować jak szybko rosnąć — czy biorę wszystko, czy selekcjonuję. Mój limit to chyba 4 projekty naraz w pełnej parze.</p>`, "refleksja,praca", ["studio", "praca", "wątpliwości"]],
  [-41, 10, 30, `<p>W Wieliczce — piwnice pełne starych szyldów, menu z 1982 roku, pieczątki, programy weselne. Anna Kowal wynosząc kolejne pudło powiedziała: „Nikt wcześniej nie pytał o to co przeszłe."</p><p>Zeskanowałem 200 dokumentów.</p>`, "radość,flow", ["projekt", "branding", "flow"]],
  [-40, 17, 0, `<p>Trening — nowe pary ćwiczebne. Sparowałem z Bartoszem, 19 lat, przyszłość tej szabli. Wygrałem 5:3. Tydzień temu bym się zawahał. Teraz nie.</p>`, "energia,radość", ["szermierka", "trening"]],
  [-39, 9, 30, `<p>Jeden z leadów od Agnieszki potwierdził — ślubne zaproszenia i identyfikacja wesela. Nieduże ale urokliwe. Powiedziałem tak.</p><p>Drugi lead — butik ogrodniczy — nie odpowiada. Trzeci — kancelaria prawna — chce „premium i poważnie". Umawiam rozmowę.</p>`, "praca,energia", ["klienci", "oferta"]],

  // 15-16 maja (czw-pt)
  [-38, 11, 0, `<p>Rozmowa z kancelarią — partnerzy, 40+, klasyczny styl, „prestiż bez przesady". Budżet 15k. Zakres: logo, papeteria, strona. Wziąłem.</p>`, "energia", ["klienci", "umowa"]],
  [-37, 9, 0, `<p>Piątek. Policzyłem: mam 5 aktywnych projektów. To o jeden za dużo. Jedno z dwóch — albo zacznę pracować 10h dziennie, albo zatrudnię kogoś do pomocy.</p><p>Napisałem do Karoliny — była koleżanka z Pixelator, szuka zajęcia jako freelancerka. Może współpraca?</p>`, "praca,refleksja,lęk", ["studio", "praca", "wątpliwości"]],

  // 17-18 maja (weekend)
  [-36, 10, 30, `<p>Puszczy Niepołomickiej — całodzienna wyprawa. Znalazłem prawdziwki (Boletus edulis)! Cztery duże okazy. Sezon wreszcie zaczął się na serio. Grzybobranie to jedyna czynność którą robię bez myślenia o pracy.</p>`, "radość,spokoj", ["grzyby", "las", "zielnik", "mycologia"]],
  [-35, 15, 0, `<p>Niedziela — Karolina przyjechała na kawę. Pokazałem jej projekty, porozmawialiśmy o zasadach współpracy. Ona jest mocna w typografii i layoutach — dokładnie to czego mi brakuje czasu. Zaczynamy od jednego projektu testowego.</p>`, "radość,energia", ["studio", "praca", "networking"]],

  // 19-22 maja
  [-34, 8, 30, `<p>Poniedziałek ze świeżym składem. Karolina wzięła projekt kancelarii pod opiekę — codziennie 2h, zdalne, moje wskazówki koncepcyjne. Czuję że to może działać.</p>`, "energia,radość", ["studio", "praca"]],
  [-33, 14, 0, `<p>Gościniec Kowalów — prezentacja pierwszych kierunków. Trzy propozycje. Tomasz milczał przez pół minuty, potem powiedział: „Kierunek trzeci. To my."</p><p>Anna się roześmiała i powiedziała że tak samo o nim pomyślała.</p>`, "radość,flow", ["klienci", "projekt", "przełom"]],
  [-32, 17, 0, `<p>Trening, po raz pierwszy w parze z Karoliną (ona też ćwiczy — łucznictwo, ale bywa na sparingach szablistów). Zabawne.</p>`, "radość", ["szermierka", "trening"]],
  [-31, 11, 0, `<p>Środa. Pieniądze na koncie z trzech rozliczonych projektów. Łącznie w maju do tej pory: 31 200 zł. Wpatrzyłem się w tę liczbę przez chwilę.</p><p>To więcej niż zarabiałem rocznie pięć lat temu.</p>`, "radość,refleksja", ["finanse", "przełom"]],

  // 23-24 maja (weekend)
  [-30, 9, 0, `<p>Sobota — zawody szabli na poziomie regionalnym, tym razem jako widz. Kowalczyk poprosił żebym komentował młodszym zawodnikom ich walkę. Siedziałem z notatnikiem i analizowałem. To zupełnie inny rodzaj treningu — obserwacyjny.</p>`, "refleksja,energia", ["szermierka", "zawody"]],
  [-29, 14, 0, `<p>Niedziela — Hermes 3000 dostała nową taśmę. Napisałem na niej list do siebie za rok. Umieściłem w kopercie z datą: „Otworzyć 22 marca 2027". Zamknąłem i schowałem.</p>`, "refleksja,spokoj", ["maszyna do pisania", "refleksja"]],

  // 25-29 maja
  [-28, 9, 30, `<p>Zaproszenia ślubne — klient Paweł i Dominika mają piękny brief: „stary papier, nowe życie". Zrobiłem pierwszą próbę letterpress'ową (zaprzyjaźniona drukarnia na Salwatorze). Wydruki piękne.</p>`, "radość,flow", ["projekt", "flow"]],
  [-27, 14, 0, `<p>Karolina przekazała mi pierwsze pliki kancelarii. Solidna robota. Klasyczne litery, złota linia. Poprawiłem trzy szczegóły i powiedziałem żeby szła dalej. Współpraca mi odpowiada.</p>`, "radość,refleksja", ["studio", "projekt", "praca"]],
  [-26, 18, 30, `<p>Trening. Nowy element: footwork przy ataku złożonym. Nogi bolą. Ale Kowalczyk mówi że to podstawa podstaw i bez tego nie pójdę wyżej. Wierzę mu.</p>`, "zmęczenie,energia", ["szermierka", "trening"]],
  [-25, 10, 0, `<p>Nowa maszyna — Royal Quiet De Luxe, zielona, 1956. Kupiona przez znajomą z Warszawy, przywiozła osobiście. Potrzebuje tylko oczyszczenia i nowej taśmy. Najszybsza restauracja ever: 3 godziny roboty. Do sprzedaży na Allegro.</p>`, "radość", ["maszyna do pisania", "restauracja", "allegro"]],
  [-24, 9, 30, `<p>Piątek. Dostałem maila od architekta — prosi o identyfikację dla gabinetu architektonicznego. Budżet wysoki (25k), zakres duży. Napisałem że mam pełny harmonogram do końca czerwca, ale jestem dostępny od lipca.</p><p>Odłożyłem go. To zupełnie nowe uczucie — odrzucić projekt nie dlatego że za mało płaci, ale dlatego że nie mam czasu.</p>`, "radość,refleksja", ["klienci", "studio", "przełom"]],

  // 30-31 maja
  [-23, 11, 0, `<p>Sobota — Las Wolski po letnim deszczu. Kuźniaki (Pholiota squarrosa) przy ściętym jodle — niejedalnie ale spektakularne: złotozielone łuski na kapeluszach. Stanowisko 15. Zielnik ma 15 stanowisk po 10 tygodniach.</p>`, "radość,spokoj", ["grzyby", "zielnik", "mycologia", "las"]],
  [-22, 14, 0, `<p>Niedziela. Podsumowanie maja: przychody 47 300 zł brutto, trzy projekty zamknięte, dwa w toku. ZUS i koszty: ~8k. Zostaje 39k. Połowę od razu na podatek (rezerwa), połowę sobie.</p><p>To jest. Firma. Działa.</p>`, "radość,refleksja", ["finanse", "studio", "przełom"]],

  // ═══════ CZERWIEC ═══════

  // 1 czerwca
  [-21, 8, 0, `<p>Czerwiec. Karolina jest teraz stałą współpracowniczką — robimy razem dwa projekty jednocześnie. Poszedłem dziś do notariusza po pieczęć do faktury. Małe rzeczy, które sprawiają że czujesz się poważną firmą.</p>`, "energia,radość", ["studio", "praca"]],
  [-21, 14, 30, `<p>Royal Quiet De Luxe sprzedana za 480 zł. Kupił kolekcjoner z Łodzi. Napisał że to jego 23. maszyna. Jesteśmy swoimi.</p>`, "radość", ["maszyna do pisania", "allegro"]],
  [-21, 21, 0, `<p>Trening — Kowalczyk ogłosił że jesienią mamy duże zawody w Katowicach, kategoria senior. Chce żebym wystartował. To wyższy poziom niż dotąd. Mam 5 miesięcy.</p>`, "energia,lęk", ["szermierka", "zawody", "trening"]],

  // 2 czerwca
  [-20, 9, 0, `<p>Gościiniec Kowalów — oddaję system identyfikacji. Anna i Tomasz mają teraz nowe menu, nowe szyldy, nową stronę (to zrobiła Karolina), nową narrację o historii. Stoją w jadalni z moją teczką i przerzucają strony.</p><p>Tomasz: „My tu mamy naszą restaurację od 40 lat. Pan nam dał twarz na kolejne 40."</p><p>Wyszedłem na parking i stałem chwilę. Naprawdę stałem.</p>`, "radość,refleksja", ["klienci", "projekt", "przełom"]],
  [-20, 21, 30, `<p>Wieczorem napisałem case study Gościńca na stronę. Pierwsze pełne portfolio projektu, ze zdjęciami, procesem, historią. Dobrze czuć że mam co pokazać.</p>`, "radość,energia", ["studio", "projekt"]],

  // 3-4 czerwca
  [-19, 10, 0, `<p>Środa. Pszczelarze. Tak — pszczelarze. Stowarzyszenie Pszczelarzy Małopolskich pisze z prośbą o nowe logo. Polecenie od Agnieszki (jej sąsiad jest prezesem). Budżet symboliczny (3k), ale projekt jest tak piękny że powiedziałem tak bez myślenia.</p><p>Pszczoły i typografia. To jest projekt który zapamiętam.</p>`, "radość,energia", ["klienci", "projekt", "branding"]],
  [-18, 14, 0, `<p>Czwartek. Kancelaria prawna przyjęła projekt od Karoliny i mnie. Pełna akceptacja, szybki przelew. Karolina dostała swoją część — pierwszy raz rozliczyłem kogoś jako podwykonawcę. Dorosła firma.</p>`, "radość,refleksja", ["finanse", "studio", "praca"]],

  // 5-6 czerwca (czw-pt)
  [-17, 9, 30, `<p>Piątek. Zapytanie od dużej firmy eventowej — chcą materiały na wystawę o historii Krakowa. Budżet nieograniczony, termin dwa tygodnie. Powiedziałem że możliwe, ale stawka premium za pośpiech.</p><p>Odpowiedzieli: „Okej."</p><p>Pierwsza premia za pośpiech w życiu.</p>`, "radość,energia", ["klienci", "finanse"]],
  [-16, 10, 0, `<p>Szkoła. Dostałem mail z pytaniem czy nie chciałbym poprowadzić warsztatu dla studentów na ASP o brandingu lokalnym. Bezpłatnie. Pomyślałem 10 sekund i napisałem że tak.</p>`, "energia,refleksja", ["networking", "studio", "kraków"]],

  // 7-8 czerwca (weekend)
  [-15, 9, 0, `<p>Sobota — smardze wróciły w lasku za Prądnikiem. Spóźnione, ale są. I coś nowego: purchawka olbrzymia (Calvatia gigantea). 30 cm średnicy. Jadalna, niesamowita. Sfotografowałem, zabrałem na obiad. Smardze oddałem sąsiadce.</p>`, "radość,energia", ["grzyby", "las", "zielnik", "mycologia"]],
  [-14, 16, 0, `<p>Niedziela — siedzę z Ewą i gadamy o planach. Ona robi doktorat z historii sztuki, ja robię branding pszczół. Oboje się śmiejemy z tego jak zupełnie inaczej skończyliśmy niż myśleliśmy 10 lat temu.</p><p>Ale dobrze.</p>`, "spokoj,radość", ["refleksja", "przyjaciele"]],

  // 9-12 czerwca
  [-13, 8, 30, `<p>Wtorek rano — szkice logotypu dla pszczelarzy. Zacząłem od sześciokątu plastra, bo to oczywiste. Wyrzuciłem. Potem od pszczoły, też oczywiste. Wyrzuciłem. W końcu wyszedłem od ruchu — lot, linia tańca pszczół, sygnał. To coś.</p>`, "flow,energia", ["projekt", "branding", "flow"]],
  [-12, 14, 0, `<p>Środa. Projekt wystawy o Krakowie — siedzę w archiwum i patrzę na stare grafiki. Jak zawsze mam wrażenie że dawni graficy projektowali lepiej na gorszych narzędziach.</p>`, "refleksja,flow", ["projekt", "kraków", "flow"]],
  [-11, 18, 0, `<p>Czwartek — trening szabli. Kowalczyk pokazał mi nagranie z zawodów w Katowicach z zeszłego roku. Poziom jest powyżej tego co znam. Mam 5 miesięcy. Muszę trenować mądrzej, nie więcej.</p>`, "refleksja,lęk", ["szermierka", "zawody", "trening"]],
  [-10, 9, 0, `<p>Piątek. Projekt wystawy złożony przed terminem. Dyrektor artystyczny firmy eventowej napisał: „Nikt mi jeszcze nie oddał wcześniej. Już wiem do kogo zadzwonię przy następnym."</p>`, "radość", ["klienci", "projekt"]],

  // 13-14 czerwca (weekend)
  [-9, 10, 30, `<p>Sobota. Warsztaty dla studentów ASP — 20 osób, 3 godziny, sala na parterze z widokiem na dziedziniec. Mówiłem o brandingu lokalnym i o tym jak badać historię miejsca zanim się postawi pierwszą kreskę. Jeden student zapytał o Gościniec Kowalów. Mam case study!</p>`, "radość,energia", ["networking", "kraków", "studio"]],
  [-8, 15, 0, `<p>Niedziela. Nowa maszyna — Olympia SG3, biurowa, 1972. Waga jak cegła, rozmiar jak akordeon. Ale czcionka: courier bold. Absolutnie precyzyjna. Czyściłem ją przez cztery godziny z Ewą obok, ona czytała głośno eseje o Brzozowskim i to było idealne popołudnie.</p>`, "spokoj,radość", ["maszyna do pisania", "restauracja"]],

  // 15-18 czerwca
  [-7, 9, 0, `<p>Poniedziałek. Spotkanie z architektem z maja — ten co odkładałem. Wrócił. „Słyszałem o Gościńcu, o kancelarii, o wystawie." Umawiamy projekt na lipiec. Pierwszy klient który poczekał.</p>`, "radość,refleksja", ["klienci", "networking", "studio"]],
  [-6, 14, 30, `<p>Wtorek — prezentacja logotypu pszczół. Prezes stowarzyszenia i czterech członków. Linia lotu pszczoły + sześciokąt we właściwym miejscu — harmonia. Wszyscy zaklasnęli. Dosłownie.</p>`, "radość,flow", ["klienci", "projekt", "przełom"]],
  [-5, 18, 0, `<p>Środa — trening, ostatni przed wakacjami (klub ma przerwę w lipcu). Pożegnalny spar z Kowalczykiem osobiście — pierwszy raz walczyłem z mistrzem jeden na jeden. Przegrałem 3:10 ale nie bolało. Trzy trafienia na mistrza to już coś.</p>`, "radość,refleksja", ["szermierka", "trening"]],
  [-4, 11, 0, `<p>Czwartek. Karolina pyta czy wejdzie jako wspólnik formalnie zamiast podwykonawcy. Powiedziałem że musimy porozmawiać poważnie, na razie nie wiem. To big move.</p>`, "refleksja,lęk,wątpliwości", ["studio", "praca", "wątpliwości"]],

  // 19-20 czerwca (czw-pt)
  [-3, 9, 0, `<p>Piątek przed długim weekendem. Policzyłem czerwiec do tej pory: 52k faktur wystawionych, wszystkie zapłacone lub z blisko terminem. Studio Wroński ma 3 miesiące i jest rentowne.</p><p>Trzy miesiące temu wyszedłem z torby ze sketchbookami i kubkiem z sową.</p>`, "radość,refleksja", ["finanse", "studio", "przełom"]],
  [-2, 10, 0, `<p>Sobota. Puszczy Niepołomickiej z Karoliną i Ewą — pierwsza wspólna wyprawa. Karolina nie miała pojęcia o grzybach, pytała o każdą brodawkę na kapeluszu. Znaleźliśmy pieprznik jadalny (nie kurka — to różne), twardnik (Scleroderma citrinum, TRUJĄCY, pokazałem jej różnicę), i stary, ogromny borowik ceglastopory.</p><p>Karolina: „Ty to traktujesz jak projekt badawczy."</p><p>Ja: „Bo to jest projekt badawczy."</p>`, "radość,spokoj", ["grzyby", "zielnik", "las", "mycologia", "przyjaciele"]],

  // 21 czerwca
  [-1, 9, 0, `<p>Niedziela. Obudziłem się o 7, zanim alarm, i leżałem przez chwilę. Dokładnie 3 miesiące temu wychodziłem z Pixelator Studio z torbą i kubkiem z sową. Myślałem wtedy że może mi nie wyjść. Że może się przestraszę. Że może wrócę.</p><p>Nie wróciłem.</p>`, "refleksja,spokoj", ["refleksja", "studio", "przełom"]],
  [-1, 14, 0, `<p>Zrobiłem porządek na biurku. Schowałem szkicowniki z marca i kwietnia. Wyjąłem nowy. Hermes 3000 stoi na komodzie. Napisałem na niej: <em>„Miesiąc czwarty. Zaczynamy."</em></p>`, "spokoj,energia", ["maszyna do pisania", "refleksja"]],
  [-1, 20, 30, `<p>Trening w parku samodzielnie — bez sparingów, bez maestro. Tylko ja i folie, 45 minut wolty i footwork. Słońce zachodziło nad Salwatorem. Nikt mi nie patrzył na ręce.</p><p>Dobrze być sobą w swoim czasie.</p>`, "spokoj,refleksja", ["szermierka", "trening", "kraków"]],

  // 22 czerwca (dziś)
  [0, 8, 0, `<p>22 czerwca. Dokładnie 3 miesiące od startu.</p><p>Mam: firmę z pełnym harmonogramem do końca lata, współpracowniczkę Karolinę, zielnik z 18 stanowiskami, 4 wyrestaurowane maszyny (jedna jako eksponat), 73 wpisy w dzienniku, 6. miejsce w zawodach regionalnych i trening na następne.</p><p>Nie mam: pewności co do wszystkiego, spokoju że zawsze wyjdzie, jasności co do wspólnika.</p><p>Mam też coś czego nie spodziewałem się 3 miesiące temu: ciekawość. Jestem ciekawy co będzie.</p>`, "refleksja,radość,energia", ["studio", "refleksja", "przełom"]],
  [0, 13, 30, `<p>Obiad z Ewą — spaghetti z kurkami zebranymi w sobotę. Najprostsze co można wymyślić, i dlatego najlepsze.</p><p>Zapytała mnie: „Żałujesz?" Pomyślałem przez chwilę naprawdę. „Nie."</p>`, "radość,spokoj", ["refleksja", "przyjaciele"]],
  [0, 18, 30, `<p>Wieczór. Piszę to i myślę że za rok wyjmę list z Hermes 3000. Ale rok to daleko. Na razie jest lipiec z architektem, sierpień pewnie z czymś co jeszcze nie wiem, i maszyna na Allegro do jutra — Olympia SG3.</p><p>Jutro zaczyna się miesiąc czwarty.</p>`, "spokoj,energia,refleksja", ["studio", "refleksja", "maszyna do pisania"]],

  // ─── DODATKOWE WPISY — uzupełnienie do 300 ───────────────────────────────

  // === MARZEC — uzupełnienie ===
  [-91, 11, 0, `<p>Zrobiłem stronę internetową dla studia — tymczasową, jedna strona, tylko portfolio i kontakt. Dwie godziny w Figmie, trzy w kodzie. Nieźle jak na kogoś kto nie jest web developerem.</p>`, "energia", ["studio", "praca"]],
  [-90, 12, 0, `<p>Telefon do mamy. Powiedziałem jej że założyłem firmę. Cisza przez trzy sekundy, potem: „No to pilnuj ZUS-u". Mama zawsze na ziemi.</p>`, "spokoj,radość", ["rodzina"]],
  [-89, 20, 0, `<p>Czytam „Steal Like an Artist" Klampa — kupiłem trzy lata temu, teraz wydaje mi się bardziej aktualna niż kiedykolwiek. Zaznaczam zdania długopisem.</p>`, "refleksja,spokoj", ["refleksja"]],
  [-88, 12, 30, `<p>Zrobiłem pierwsze prawdziwe zdjęcia do portfolio — wziąłem aparat Ewy i odfotografowałem projekt Kafeterki na czarnym tle. Wyszło profesjonalnie. Uploadowałem na stronę.</p>`, "radość,energia", ["studio", "projekt"]],
  [-87, 8, 0, `<p>Rano pół godziny w ciszy zanim odpaliłem komputer. Herbata, okno, gołębie na balkonie. Nie sprawdziłem maili. To był świadomy wybór i był dobry.</p>`, "spokoj", ["poranek"]],
  [-86, 9, 0, `<p>Przetestowałem kilka systemów do fakturowania — Fakturownia wygrywa. Prosta, po polsku, eksport PDF wygląda poważnie. Skonfigurowałem szablon z moim logo.</p>`, "praca", ["finanse", "studio"]],
  [-85, 15, 0, `<p>Skończyłem czyścić mechanizm maszyny nr 2 — Olivetti Lettera 32. Klawisz „o" już nie klei. Maszyna pisze sprawnie, choć wózek ma odrobinę oporu przy powrocie. Zostawię na jutro.</p>`, "spokoj", ["maszyna do pisania", "restauracja"]],
  [-84, 16, 0, `<p>Zadzwonił stary kolega z Pixelatora — mówi że klienci pytają gdzie się przeniosłem. Trochę mi zrobiło miło, trochę poczułem się winny że odszedłem.</p>`, "refleksja", ["refleksja", "networking"]],
  [-83, 20, 0, `<p>Olivetti Lettera 32 — gotowa. Taśma nowa, wózek naoliwiony, wygląda jak nowa. Wystawiłem na Allegro, cena 380 zł.</p>`, "radość", ["maszyna do pisania", "allegro"]],

  // === KWIECIEŃ — uzupełnienie ===
  [-82, 11, 30, `<p>Cafeterka opublikowała nowe menu — z moim layoutem. Wyglądało pięknie. Bart wysłał mi zdjęcie stolika z kawą i menu. Takie rzeczy motywują bardziej niż jakakolwiek nagroda.</p>`, "radość", ["klienci", "projekt"]],
  [-81, 14, 0, `<p>Przygotowałem prezentację wyceny dla restauracji Michała. Rozpisałem każdy element osobno — żeby wiedział za co płaci. Transparentność w wycenie to coś czego nie miałem w agencji.</p>`, "praca", ["oferta", "klienci"]],
  [-80, 11, 0, `<p>Spędziłem godzinę na forum mykologicznym — ktoś przesłał zdjęcie grzyba ze śląska i nikt nie mógł go zidentyfikować. Ja też nie. Gatunek z rodzaju Cortinarius — kilkaset gatunków, połowa trująca. Fascynujące i przerażające.</p>`, "refleksja", ["grzyby", "mycologia"]],
  [-79, 13, 0, `<p>Olivetti sprzedana — kupujący z Poznania, napisał że chce pisać na niej powieść. Coś mi stanęło przed oczami: moja maszyna w rękach kogoś kto pisze powieść w Poznaniu. Lubię to.</p>`, "radość", ["maszyna do pisania", "allegro"]],
  [-78, 9, 0, `<p>Niedziela — zrobiłem porządek w mieszkaniu i w głowie. Wyrzuciłem notatki z poprzedniej pracy — stare briefy, printscreeny, kalendarze. Szuflada puściła 3 kg papieru. Ulga.</p>`, "spokoj", ["refleksja"]],
  [-77, 16, 0, `<p>Kafeterka — roll-upy. Prosty brief, dwa dni roboty. Wysłałem do druku zanim klient się rozmyślił.</p>`, "praca", ["projekt", "klienci"]],
  [-76, 11, 30, `<p>Firma z maila (te z łazienkami) napisała ponownie i poprosiła o referencje. Wysłałem Barta (Kafeterka) i Michała (restauracja). Obaj odpowiedzieli szybko i pochlebnie. Miło mieć takich klientów.</p>`, "radość", ["klienci", "networking"]],
  [-75, 8, 30, `<p>Sesja szkicowania rano — bez konkretnego projektu, po prostu kreślenie. Liternictwo ręczne, ligatury, znaki specjalne. Muszę to robić częściej. To jak ćwiczenie gam.</p>`, "flow", ["poranek", "flow", "praca"]],
  [-74, 19, 0, `<p>Trening szabli był mocny — mocno pracowaliśmy nad paryradami. Kowalczyk mówi: „Dobre parowanie to odpowiedź zanim padnie pytanie." Notowałem po powrocie.</p>`, "energia,refleksja", ["szermierka", "trening"]],
  [-73, 15, 0, `<p>Agnieszka z butiku pokazała mi swoje zdjęcia na Insta z nowym logo. Komentarze same dobre. Jeden: „Skąd ten branding?" a ona odpowiedziała: „Wroński Studio, polecam." Dała mi polecenie publicznie.</p>`, "radość", ["klienci", "networking", "studio"]],
  [-72, 13, 30, `<p>Obiad na Kazimierzu — przy lokalu Michała zobaczyłem nową tablicę z moim logo. Wisi na cegle, złota na czarnym. Zatrzymałem się i stałem przez chwilę jak turysta.</p>`, "radość,refleksja", ["klienci", "kraków", "projekt"]],
  [-71, 20, 0, `<p>Długa rozmowa z Ewą o tym gdzie będę za rok. Ona pytała i słuchała, nie radziła. Czasem to jest wszystko czego potrzeba.</p>`, "refleksja,spokoj", ["refleksja", "przyjaciele"]],
  [-70, 10, 30, `<p>Pracowałem nad briefem dla butiku Agnieszki — system typograficzny. Wybrałem Cormorant Garamond jako display i Jost jako body. Subtelne, kobiece bez bycia stereotypowym.</p>`, "flow", ["projekt", "branding"]],
  [-69, 20, 30, `<p>Kupiony telefon od znajomego, żeby mieć osobny numer firmowy. Małe, ale ważne — teraz wiem które połączenia to biznes, a które prywatne.</p>`, "praca", ["studio"]],
  [-68, 11, 0, `<p>Sprawdziłem pierwszy raz statystyki strony Wroński Studio — 340 unikalnych odwiedzin w miesiąc. Niemało jak na nową stronę bez reklam.</p>`, "radość,refleksja", ["studio", "networking"]],
  [-67, 16, 0, `<p>Hermes jest. Pan Stanisław otworzył mi drzwi w kapeluszu i swetrze. Mieszkanie pełne książek. Powiedział: „Żona pisała na niej przez dwadzieścia lat." Wypiłem herbatę i posłuchałem. Maszyna zapakowała się sama.</p>`, "refleksja,spokoj", ["maszyna do pisania", "kraków"]],
  [-66, 9, 30, `<p>Wtorek — Hermes 3000 stoi na biurku obok komputera. Napisałem na niej kilka zdań testowych. Czcionka: Pica 10pt, wyrazista, trochę jak pismo mamy. Nie idzie na sprzedaż.</p>`, "spokoj", ["maszyna do pisania"]],
  [-65, 17, 30, `<p>Spacerowałem po Plantach po treningu. Myślałem o tym że grzybobranie i szermierka mają jedną wspólną cechę — wymagają obecności w ciele. Przy komputerze można być duchem. W lesie albo z floretem musisz być.</p>`, "refleksja,spokoj", ["grzyby", "szermierka", "kraków"]],
  [-64, 10, 0, `<p>Konrad (fotograf) — projekt zamknięty, ostatnie pliki dostarczone. Powiedział że zrobi mi sesję zdjęciową za darmo jako wymianę. Umówiliśmy się na maj.</p>`, "radość", ["klienci", "projekt"]],
  [-63, 13, 0, `<p>Przejrzałem Instagram w poszukiwaniu projektantów z Krakowa, żeby wiedzieć kto jest na rynku. Kilka dobrych, kilka bardzo dobrych. Jeden — Marek Zając — jest na poziomie który mnie inspiruje. Napisałem do niego komplement. Odpisał po godzinie.</p>`, "radość,refleksja", ["networking", "kraków"]],
  [-62, 13, 0, `<p>Napisałem pierwszy wpis na stronę — o procesie projektowania logotypu Kafeterki. Z fotografiami szkiców. Przeczytałem raz, dwa, trzy. Opublikowałem.</p>`, "radość,lęk", ["studio", "networking"]],
  [-61, 8, 0, `<p>Rano wstałem i nie wiedziałem co robić. Miałem luźne godziny bez deadline'u. Zrobiłem kawę, usiadłem przy Hermes 3000 i pisałem przez godzinę na klawiaturze o niczym. Strumień świadomości na papierze. Archiwum siebie.</p>`, "spokoj", ["poranek", "maszyna do pisania", "refleksja"]],
  [-60, 11, 30, `<p>Prezentacja Konrada wisiała gdzieś w sieci — ktoś go oznaczył i napisał że logo jest „świeże". Konrad przesłał mi screenshot z podziękowaniem. To dobry dzień.</p>`, "radość", ["klienci", "networking"]],
  [-59, 19, 30, `<p>Trening — praca nad tempem kontrataku. Maestro Kowalczyk mówi że mój kontratak jest za wolny bo myślę o nim za wcześnie. „Ciało musi wiedzieć wcześniej niż głowa." Medytacja szermierki.</p>`, "refleksja,energia", ["szermierka", "trening"]],
  [-58, 13, 0, `<p>Wpis na blogu zebrał 12 komentarzy. Jeden od Marka Zająca — napisał że „świetne ukazanie procesu". Zrobiłem screenshot.</p>`, "radość", ["studio", "networking"]],
  [-57, 6, 0, `<p>Obudził mnie alarm o 5:30. W minibusie do Wieliczki rozmawiałem trochę z Agatą — zawodniczką z naszego klubu. Ona trenuje od dziecka, stary rodzinny sport. Pyta mnie dlaczego zacząłem. „Bo chciałem coś gdzie nikt nie może mi pomóc plikiem PDF." Zaśmiała się.</p>`, "energia,refleksja", ["szermierka", "zawody"]],
  [-56, 20, 0, `<p>Ból ramienia faktycznie dobry — to znaczy że walczyłem całym ciałem. Zrobiłem okład, wziąłem ibuprofen, zasnąłem z książką na brzuchu o 21:30.</p>`, "zmęczenie", ["szermierka", "zdrowie"]],
  [-55, 10, 0, `<p>Przegląd finansów kwiecień: 31 800 zł faktur, 3 klientów zamkniętych, 2 nowych. ZUS, koszty, podatek. Zostaje czysto ok. 22k. To dwa i pół razy moje poprzednie zarobki netto miesięcznie.</p>`, "radość,refleksja", ["finanse", "studio"]],
  [-54, 20, 0, `<p>Wieczór po spotkaniu z Agnieszką — poszedłem do ulubionej herbaciarni na Floriańskiej. Zamówiłem dwa gatunki i siedziałem z blokiem rysunkowym. Czasami najlepsze pomysły rodzą się przy złej herbacie w dobrym miejscu.</p>`, "spokoj,flow", ["kraków", "flow"]],
  [-53, 15, 30, `<p>Napisałem cold e-mail do trzech firm z Krakowa które moim zdaniem potrzebują rebrandingu. Jeden to centrum kulturalne, jeden to sklep z herbatą, jeden to producent lokalnych przetworów. Spróbuję, najwyżej nie odpiszą.</p>`, "motywacja", ["klienci", "networking"]],

  // === MAJ — uzupełnienie ===
  [-52, 20, 0, `<p>Wieczór 1 Maja — Ewa i ja siedzieliśmy na balkonie z Sangiovese i rozmawialiśmy o muzyce. Ona ma playlist pracy, ja mam playlist przetważania maszyn. Ona grała swój, ja słuchałem i patrzyłem na dach.</p>`, "spokoj", ["przyjaciele"]],
  [-51, 19, 30, `<p>Kuźniaki z forum — ekspert potwierdził identyfikację w komentarzu i dodał że moje zdjęcia stanowisk są „przykładowe dla dokumentacji terenowej". Zrobiło mi się ciepło.</p>`, "radość", ["grzyby", "mycologia"]],
  [-50, 9, 0, `<p>Sesja zdjęciowa z Konradem — umówiony na wymianę za logo. Byliśmy w jego studio na Grzegórzkach. Trzy godziny, 400 zdjęć. Konrad powiedział że chce uchwycić mnie „przy robocie", więc wziąłem szkicownik i maszyny. Wyszły piękne fotografie.</p>`, "radość,energia", ["praca", "networking"]],
  [-49, 20, 0, `<p>Czytam książkę o mycologii — „Entangled Life" Mermeta Sheldrake. Rozdział o tym jak mycelium komunikuje się przez sieć chemicznych sygnałów. Pomyślałem że to jak internet ale bez Zuckerberga.</p>`, "refleksja,spokoj", ["grzyby", "mycologia"]],
  [-48, 9, 0, `<p>Centrum kulturalne odpisało na cold e-mail. „Właśnie szukaliśmy kogoś." Umawiamy się na rozmowę w przyszłym tygodniu. Cold e-maile działają.</p>`, "radość,energia", ["klienci", "networking"]],
  [-47, 14, 30, `<p>Pojechałem do Hermes 3000 z wizytą. Chciałem zobaczyć czy czcionka jest ta co powinna. Zabrałem ją z powrotem do domu, gdzie stoi obok biurka. Napisałem na niej zdanie: „Dzisiaj jest dobry dzień." Było.</p>`, "spokoj,radość", ["maszyna do pisania"]],
  [-46, 8, 0, `<p>Rano zrobiłem sobie kawę w moka ekspresie — nowa tradycja odkąd pracuję z domu. Stary Bialetti z pchlego targu na Grzegórzkach, naprawiony przez Ewę gumką uszczelniającą. Kawa z niego smakuje inaczej. Może to placebo, może aluminium.</p>`, "spokoj,poranek", ["poranek", "kawa", "kraków"]],
  [-45, 20, 0, `<p>Herbata + muzika + maszyny. Zacząłem renowację czwartej maszyny — Erika 9, wschodnioniemiecka, 1978, kolor szaro-zielony. Kreski renowacyjne na bocznych panelach. Ciekawa historia do opowiedzenia przy sprzedaży.</p>`, "spokoj", ["maszyna do pisania", "restauracja"]],
  [-44, 16, 0, `<p>Kurki z niedzieli poszły na makaron z masłem czosnkowym. Ugotowałem dla Ewy i dla siebie. Ona powiedziała że to najlepszy makaron jaki jadła. Ja powiedziałem że rosły przy potoku za galopowymi torami.</p>`, "radość", ["grzyby", "przyjaciele"]],
  [-43, 8, 30, `<p>Wstałem z pomysłem — zbiór stanowisk grzybowych mógłby być bazą danych z mapą. Mogę to zrobić, mam umiejętności. Na razie zielnik papierowy. Ale kiedyś.</p>`, "energy,refleksja", ["grzyby", "mycologia", "zielnik"]],
  [-42, 20, 0, `<p>Centrum kulturalne — rozmowa przełożona. Dyrektor zachorował. Czekam. To jest część pracy — nie wszystko idzie w tempie które byś chciał.</p>`, "refleksja", ["klienci", "praca"]],
  [-41, 13, 0, `<p>Wieliczka — Anna Kowal zaprosiła mnie na obiad. Dom Kowalów. Gotowała teściowa. Żurek z jajkiem i kiełbasą. Przy stole rozmawialiśmy o historii gościńca — że przyszli Niemcy w 1939 i polscy żołnierze wrócili w 1945, i że restauracja przez oba przetrwała.</p><p>Takich historii nie ma w briefie.</p>`, "refleksja,spokoj", ["klienci", "kraków"]],
  [-40, 14, 0, `<p>Muszę powiedzieć że praca z Karoliną jest inna niż praca solo. Ona pyta „dlaczego" kiedy ja mówię „tak robimy". I to jest dobre — zmusza mnie do artykułowania decyzji zamiast działania na instynkt.</p>`, "refleksja", ["studio", "praca"]],
  [-39, 19, 30, `<p>Trening we dwójkę z Agatą — pracowaliśmy na długim dystansie. Ona ma lepszy timing ode mnie na tym dystansie. Przegrałem 4:7. Zapytałem ją po treningu o wskazówkę. Powiedziała: „Wiesz kiedy przyjdzie atak. Ale nie ufasz temu co wiesz." To brzmi jak coś więcej niż szabla.</p>`, "refleksja,energia", ["szermierka", "trening"]],
  [-38, 10, 0, `<p>Kancelaria prawna — Karolina przesłała mi wersję do rewizji. Zamieniłem dwa kroje i zmieniłem proporcje logo. 20 minut pracy. Reszta była dobra. Ona rośnie.</p>`, "radość,refleksja", ["projekt", "studio"]],
  [-37, 14, 30, `<p>Erika 9 — skończona restauracja. Lakier bocznych paneli odnowiony, taśma wymieniona, mechanizm czysty. Wystawiłem na Allegro. Cena 450 zł + koszt wysyłki — ciężka jak cegła.</p>`, "radość", ["maszyna do pisania", "allegro"]],
  [-36, 11, 0, `<p>Puszczy — purchawka mała (Bovista plumbea). Biała jak ping-pong, twarda jak ping-pong. Jadalna w młodości, teraz już za stara — brązowe wnętrze. Do zielnika jako stanowisko 13.</p>`, "spokoj", ["grzyby", "zielnik", "mycologia"]],
  [-35, 13, 0, `<p>Karolina przyjechała do mnie na lunch roboczy — pracowałyśmy przy kuchennym stole, ona na laptopie, ja na iMacu. Jabłka na blacie, muzika w tle. To było bardzo fajne.</p>`, "radość,energia", ["studio", "praca"]],
  [-34, 19, 0, `<p>Erika sprzedana — kupiła kobieta z Krakowa, studentka polonistyki. Przyszła odebrać osobiście. Napisała potem maila: „Napisałam na niej pierwsze zdanie eseju." Oto po co to robię.</p>`, "radość", ["maszyna do pisania"]],
  [-33, 10, 0, `<p>Centrum kulturalne — dyrektor wrócił do zdrowia. Rozmowa zaplanowana na środę. Cennikuję projekt z góry tym razem — 18k. Nieduże centrum, ale prestiż w Krakowie.</p>`, "praca", ["klienci", "oferta"]],
  [-32, 19, 0, `<p>Rano przy kawie policzyłem wpisy w zielniki — 14 stanowisk, 22 gatunki. Część jeszcze niezidentyfikowana. Zamówiłem przewodnik „Grzyby Europy Środkowej" — 800 stron. Ktoś mi powiedział że to biblia mykologii.</p>`, "radość", ["grzyby", "zielnik", "mycologia"]],
  [-31, 9, 0, `<p>Gościninec zatwierdził wszystkie pliki do druku. Nowe szyldy, menu, papeteria, strona — wszystko naraz. Drukarnia w Wieliczce robi produkcję. Za dwa tygodnie otwarcie z nową identyfikacją.</p>`, "radość,energia", ["klienci", "projekt"]],
  [-30, 15, 30, `<p>Centrum kulturalne — rozmowa była dobra. Dyrektor Tomasz Wierzbicki ma jasną wizję, otwarty na propozycje. Projekt 18k zatwierdził na miejscu. Piąty aktywny projekt.</p>`, "radość,energia,lęk", ["klienci", "umowa", "praca"]],
  [-29, 20, 0, `<p>List od siebie schowany w Hermes 3000. Napisałem go na cienkiej kalce, złożyłem we czworo. Kopertę zaklejałem woskiem od świecy. Schowałem za szufladą komod. Będę go szukał za rok.</p>`, "refleksja,spokoj", ["maszyna do pisania", "refleksja"]],
  [-28, 13, 0, `<p>Warsztaty letterpress w zaprzyjaźnionej drukarni — Paweł i Dominika (para od wesela) chcą ręcznie drukowane zaproszenia. Pierwsza próba na papierze bawełnianym. Mój projekt + czyjeś ręce + stara maszyna drukarska. Piękne.</p>`, "flow,radość", ["projekt", "flow"]],
  [-27, 9, 0, `<p>Środa. Dostałem zapytanie z Gdańska — mała firma produkująca meble, szuka brandingu. Duży projekt, ale daleko. Zastanawiam się czy robię projekty zdalne czy tylko lokalne. Odpowiem że tak, ale termin od listopada.</p>`, "refleksja", ["klienci", "studio"]],
  [-26, 14, 30, `<p>Trening — pracowaliśmy dziś nad rytmem walki. Kowalczyk włączył muzykę (stary walc!) i kazał nam walczyć w tempie muzyki. Śmieszne i pouczające — rytm walki jest jak rytm muzyki, ma frazy i pauzy.</p>`, "radość,energia", ["szermierka", "trening"]],
  [-25, 11, 30, `<p>Royal Quiet De Luxe wystawiona i od razu mam dwa zapytania. Cena poszła do 520 zł — wziąłem droższą ofertę, od kogoś kto napisał dłuższą wiadomość. Cena nie jest jedynym kryterium wyboru kupującego.</p>`, "radość", ["maszyna do pisania", "allegro"]],
  [-24, 15, 0, `<p>Centrum kulturalne — pierwsze szkice koncepcji. Wychodzę od lokalnej symboliki — Smok Wawelski jest zagrany, ale jest też inna Kraków — secesja, Wyspiański, Młoda Polska. Próbuję stamtąd.</p>`, "flow", ["projekt", "branding", "kraków"]],
  [-23, 10, 0, `<p>Kuźniaki przy ściętym jodle wyrosły na wyższe piętro — teraz mają 15 cm kapelusza. Piękne i niejadalne. Zrobiłem nową serię zdjęć do zielnika — zmiana w czasie.</p>`, "radość", ["grzyby", "zielnik"]],
  [-22, 11, 0, `<p>Podsumowanie maja — przychody: 47 300 zł. To nie jest literówka. Jedno pytanie sobie zadaję: czy dałem z siebie tyle co warte te pieniądze? Myślę że tak. Myślę że każdy projekt był dobry.</p>`, "refleksja,radość", ["finanse", "studio"]],

  // === CZERWIEC — uzupełnienie ===
  [-21, 18, 0, `<p>Spacer po zachodzie słońca po Plantach. Kasztanowce w pełnym rozkwicie. Myślałem o tym że firma ma 3 miesiące i czuje się jak trzyletnia.</p>`, "spokoj,refleksja", ["kraków", "refleksja"]],
  [-20, 10, 30, `<p>Wróciłem do gościńca zobaczyć nowe szyldy zamontowane. Tomasz otwierał właśnie rano. Stanęliśmy pod szyldem i on zrobił nam zdjęcie ja i on, oba z gościńcem w tle. Wysłał mi na WhatsApp.</p>`, "radość", ["klienci", "projekt", "kraków"]],
  [-19, 8, 30, `<p>Rano napisałem do stowarzyszenia pszczelarzy pierwsze pytania o ich historię. Chcę zrozumieć pszczoły zanim zacznę rysować. Prezes Jan Nowicki odpowiedział stronnicową wiadomością o historii pszczelarstwa w Polsce od XV w. Świetne.</p>`, "radość,energia", ["projekt", "branding"]],
  [-18, 20, 0, `<p>Kancelaria prawna — oficjalne przekazanie plików. Partner Kowalski powiedział że „to jest godna identyfikacja". Słowo „godna" od prawnika to wyraz absolutnego zachwytu.</p>`, "radość", ["klienci", "projekt"]],
  [-17, 9, 30, `<p>Dobry pomysł rano — zrobiłem folder z case studies jako PDF do wysyłki. Kafeterka, restauracja Michała, fotograf Konrad. Trzy projekty, trzy narracje. Wyślę potencjalnym klientom zamiast linku do strony.</p>`, "energia", ["studio", "networking"]],
  [-16, 13, 0, `<p>Warsztaty ASP potwierdzone — 13 czerwca, sala W piwnicy. Zrobiłem slide deck, 18 slajdów. Zatytułowałem: „Jak projektować dla lokalności, nie dla portfolio."</p>`, "energia", ["networking", "studio"]],
  [-15, 13, 30, `<p>Purchawka olbrzymia z soboty poszła na kotlety purchawkowe z masłem i rozmarynem. Ewa próbowała raz i powiedziała: „Jeśli wszystkie grzyby są takie, rozumiem dlaczego chodzisz w las." Zaprosiłem ją na następną wyprawę.</p>`, "radość", ["grzyby", "przyjaciele"]],
  [-14, 11, 0, `<p>Niedziela — porządki w cyfrowym archiwum. Wszystkie projekty posortowane, wersje finalne w osobnych folderach, backup na dysku zewnętrznym. Małe ale ważne. Jestem jedynym IT-owcem w tej firmie.</p>`, "praca", ["studio", "praca"]],
  [-13, 14, 30, `<p>Centrum kulturalne — szkice na spotkaniu. Dyrektor Wierzbicki poprosił o wariant z bardziej współczesnym krojem. Zaproponowałem Aktiv Grotesk. Powiedział „dokładnie to". Znam już ten dźwięk.</p>`, "radość,energia", ["projekt", "klienci"]],
  [-12, 19, 0, `<p>Projekt wystawy miejskiej — prace ruszają. Treść historyczna dostarczyła kustosz muzealna. Mamy 2 tygodnie na layout 40 plansz A1. Karolina bierze plansz 21-40, ja 1-20.</p>`, "praca,energia", ["projekt", "praca"]],
  [-11, 8, 30, `<p>Rano przepatrzyłem Allegro w poszukiwaniu nowych maszyn. Widzę Brother Deluxe 900 za 80 zł — podbita ceną ale prawdopodobnie do renowacji. Napisałem pytanie do sprzedającego. Obsesja się pogłębia.</p>`, "radość", ["maszyna do pisania", "allegro"]],
  [-10, 18, 30, `<p>Projekt wystawy skończony przed terminem. Karolina była niezawodna — jej 20 plansz było lepszych niż moje pierwsze 10. Razem ujednoliciliśmy styl i wysłaliśmy jedną paczkę. Dyrektor eventowy napisał rano że jest nieziemskie. Użył tego słowa.</p>`, "radość", ["projekt", "klienci"]],
  [-9, 16, 0, `<p>Studenci z ASP byli świetni — pełne zaangażowanie, dobre pytania, jeden chłopak (może 22 lata) powiedział po wykładzie: „Chciałbym tak pracować jak pan." Nie wiedziałem co odpowiedzieć. Powiedziałem że zanim tak wyglądała moja praca, wyglądała gorzej przez dziesięć lat.</p>`, "refleksja,radość", ["networking", "studio"]],
  [-8, 12, 0, `<p>Brother Deluxe 900 dostarczona. Stan: jak myślałem — mechanizm zacina na klawiszu „r", taśma sucha, obudowa brudna. Ale kompletna i potencjał jest. Zaczynam restaurację w weekend.</p>`, "radość", ["maszyna do pisania", "restauracja", "allegro"]],
  [-7, 13, 0, `<p>Architekt Michał Urbański (ten z maja) — wrócił jak mówił. Projekt gabinetu architektonicznego. Rozpisaliśmy zakres: logo + system + strona. 25k. Termin: sierpień. Wpisałem w kalendarz.</p>`, "radość,energia", ["klienci", "umowa"]],
  [-6, 9, 30, `<p>Stowarzyszenie pszczelarzy — prezes Jan Nowicki przyszedł do mnie do studia (pracuję teraz z domu). Przyniósł słoik miodu. „Lipowy, tegoroczny, jeszcze ciepły." Zrobiliśmy kawę, rozmawialiśmy o pszczołach godzinę. Potem o logo pół godziny.</p>`, "radość,spokoj", ["klienci", "projekt", "kraków"]],
  [-5, 10, 30, `<p>Logotyp pszczół — linia lotu zatwierdzona przez zarząd. Teraz rozwijam system kolorów — miodowy żółty, ciemna zieleń, biel. Klasyczny układ ale żywy.</p>`, "flow,radość", ["projekt", "branding", "flow"]],
  [-4, 14, 0, `<p>Karolina i ja rozmawiałyśmy dwie godziny o tym co może oznaczać wspólnik. Różne modele — ona bierze projekty samoistnie vs ona wchodzi jako partner z udziałem. Zrobiłem listę za i przeciw. Lista za jest dłuższa.</p>`, "refleksja", ["studio", "praca", "wątpliwości"]],
  [-3, 14, 0, `<p>Brother Deluxe 900 — klawisz „r" naprawiony (sprężynka sprężyna), taśma nowa, obudowa z szarego teflonu wyglansowana. Maszyna wygląda jak nowa. Wystawiłem za 380 zł, opis napisałem na tej samej maszynie. Żart który rozumiem tylko ja.</p>`, "radość", ["maszyna do pisania", "restauracja", "allegro"]],
  [-2, 16, 0, `<p>Czerwcowe słońce, park Jordana. Siedzieliśmy z Ewą i Karoliną na trawie. Ewa tłumaczyła nam Wyspiańskiego i dlaczego Kraków jest nawiedzony przez własną historię. Karolina robiła szkice do centrum kulturalnego na kolanie. Ja jadłem truskawki.</p>`, "spokoj,radość", ["kraków", "przyjaciele"]],
  [-1, 11, 0, `<p>Wróciłem z parku z notatkami i pomysłem: projekt centrum kulturalnego powinien mieć element nawiązania do secesji krakowskiej — nie cytat, ale echo. Napisałem do Wierzbickiego. Napisał: „Oczywiście, czemu nie myśleliśmy o tym wcześniej?"</p>`, "radość,energia", ["projekt", "kraków", "branding"]],
  [0, 10, 0, `<p>22 czerwca, południe. Za oknem Kraków, liście kasztanów nieruchome, ciepłe. Na biurku Hermes 3000, skaner do zielnika, floret w rogu pokoju. To moje biuro. To moje.</p>`, "spokoj,radość", ["studio", "kraków", "refleksja"]],

  // === DODATKOWE – finalna partia do 300 ===

  // marzec – wypełnienia
  [-91, 16, 0, `<p>Przeczytałem dwa artykuły o brandingu lokalnym na Medium. Jeden o tym jak marki globalne udają lokalne i jak to widać po złym kernigu. Zanotowałem.</p>`, "refleksja", ["praca", "refleksja"]],
  [-90, 20, 0, `<p>Ewa pyta co chcę na urodziny. Mówię że może jakąś starą maszynę. Patrzy na mnie z wyrozumiałością kogoś kto żyje z osobą ze specyficzną pasją.</p>`, "radość,spokoj", ["maszyna do pisania", "przyjaciele"]],
  [-89, 16, 30, `<p>Skończyłem czytać „Logo Design Love" Airey — trochę podstawy, ale ładnie napisane. Kilka historii o klientach którzy niszczą projekt w ostatniej chwili. Mrożące krew.</p>`, "refleksja", ["praca"]],
  [-88, 20, 30, `<p>Sprawdziłem Allegro konkurencji — maszyny do pisania w Polsce sprzedają głównie trzy osoby regularnie. Poziom ich restauracji jest różny. Moje są lepiej opisane i fotograficznie.</p>`, "refleksja,energia", ["maszyna do pisania", "allegro"]],
  [-87, 11, 0, `<p>Wpadłem na kawę do Kafeterki z wizytą. Bart był za barem, przywitał mnie jak starego znajomego. Nowe logo na filiżankach — nie wiedziałem że zamówili papierowe kubki z logo. Zrobiłem zdjęcie.</p>`, "radość", ["klienci", "kraków"]],
  [-86, 21, 0, `<p>Zadzwoniłem do przyjaciela Maćka — żyjemy w różnych miastach od 5 lat i rozmawiamy za rzadko. Powiedział że słyszał że zakładam firmę. Pytał o szczegóły przez godzinę. Dobrze mieć kogoś kto jest ciekaw.</p>`, "spokoj,radość", ["przyjaciele"]],
  [-85, 8, 30, `<p>Hermes 3000 rano — napisałem na niej listę wartości którymi chcę się kierować w studio. Siedem punktów. Jeden: „Nie bierz projektów których nie lubisz dla pieniędzy." Zobaczymy czy to utrzymam.</p>`, "refleksja,motywacja", ["maszyna do pisania", "studio", "motywacja"]],
  [-84, 11, 30, `<p>Przyszło polecenie przez Instagram od kogoś z Wrocławia — chcą logo. Zdalna praca, normalny budżet. Powiedziałem tak — po raz pierwszy klient spoza Krakowa.</p>`, "energia,radość", ["klienci", "studio"]],

  // kwiecień – wypełnienia
  [-82, 9, 0, `<p>Poranek — zanim otworzyłem laptopa, napisałem na Hermes plan dnia. Trzy projekty, trzy priorytety, jedno spotkanie. Tyle. Herbata ostygła zanim skończyłem czytać.</p>`, "spokoj,energia", ["poranek", "maszyna do pisania"]],
  [-80, 20, 0, `<p>Wrocławianin (nowy klient) przysłał brief mailem — chce logo dla pracowni ceramicznej. Dobry brief, wie czego chce. Odpiszę rano z pytaniami doprecyzowującymi.</p>`, "praca", ["klienci", "projekt"]],
  [-79, 19, 0, `<p>Trening w deszczu — sala nie miała ogrzewania, ćwiczyliśmy w kurtkach. Agata mówiła że to hartuje. Kowalczyk chodził z herbatą i oceniał nasze wolty zziębniętymi oczami.</p>`, "energia,zmęczenie", ["szermierka", "trening"]],
  [-78, 20, 0, `<p>Herbata + podkast o projektowaniu szwajcarskim — omawiali Müller-Brockmann. Zawsze wracam do siatki. Nawet gdy projektuję organicznie, siatka jest pod spodem jak kościec.</p>`, "refleksja,spokoj", ["praca", "refleksja"]],
  [-77, 12, 0, `<p>Brief dla kancelarii od Agnieszki — napisali sami, szczegółowy. To już drugi projekt z poleceń Agnieszki. Ona jest moim najlepszym marketerem i nic jej za to nie płacę. Trzeba to zmienić — może polecenie wzajemne.</p>`, "refleksja,radość", ["klienci", "networking"]],
  [-76, 20, 30, `<p>Marek Zając (projektant z Instagrama) zaprosił mnie na kolację z kilkoma projektantami z Krakowa. Przyjąłem. Nie lubię networkingu, ale to nie networking — to po prostu ludzie.</p>`, "lęk,radość", ["networking", "kraków"]],
  [-75, 21, 0, `<p>Kolacja z projektantami. Pięć osób, knajpa na Kazimierzu, rozmowy do 23:00. Nikt nie mówił o klientach ani pieniądzach przez pierwszą godzinę. Gadaliśmy o filmach, ceramice i tym czemu Kraków jest lepszy niż Warszawa (albo gorszy, zależnie od kto mówi).</p>`, "radość", ["networking", "kraków", "przyjaciele"]],
  [-74, 11, 0, `<p>Kancelaria od Agnieszki — Karolina zrobiła pierwsze pliki. Ja jestem głównie koordynatorem na tym projekcie. Dziwne uczucie — projekt idzie do przodu beze mnie. To jest chyba dobre.</p>`, "refleksja", ["studio", "projekt"]],
  [-73, 20, 0, `<p>Agnieszka napisała że ktoś sfilmował jej butik i logo weszło w filmie. Film zebrał 40k wyświetleń. Nie reklama, po prostu codzienne stories. Logo pracuje samo.</p>`, "radość", ["klienci", "networking"]],
  [-72, 9, 30, `<p>Zamówiłem drugą kamerę do studia — małą, na statywie, do filmowania procesu projektowania. Pomysł na content: timelapse szkicowania. Kosztuje 400 zł z kamerą użytkową. Zobaczę.</p>`, "energia", ["studio"]],
  [-71, 14, 0, `<p>Ceramiczka z Wrocławia zatwierdziła szkice — wybrała kierunek z glinia i sygnetem. Budżet 5500 zł, krótki projekt. Wyślę finały w przyszłym tygodniu.</p>`, "radość", ["klienci", "projekt"]],
  [-70, 21, 0, `<p>Sprawdziłem ile mam obserwujących na Instagramie — 1240. W marcu miałem 300. Organiczny wzrost przez portfolio. Jeden post o Hermes 3000 miał 800 polubień — więcej niż jakikolwiek projekt.</p>`, "radość,refleksja", ["studio", "networking"]],
  [-69, 9, 30, `<p>Ceramiczka z Wrocławia — projekt finałowy wysłany, zatwierdził w pół dnia. Przelew tego samego dnia. To był mój najszybszy projekt — tydzień od briefu do zapłaty.</p>`, "radość", ["klienci", "finanse"]],
  [-68, 14, 0, `<p>Szukam kolejnej maszyny. Allegro, OLX, Facebook marketplace. Patrzę na Olivetti Valentine — czerwona, kultowa, 1969, Valentine Sottsassa. Rzadkość, cena wysoka. Czekam na okazję.</p>`, "praca", ["maszyna do pisania", "allegro"]],
  [-67, 22, 30, `<p>Późno, ale spokojnie. Ewa śpi obok, ja piszę na Hermes przy lampce. Piszę do siebie: „Nie wiadomo jak długo to będzie trwało. Ale teraz trwa. Ciesz się."</p>`, "spokoj,refleksja", ["maszyna do pisania", "refleksja"]],

  // maj – wypełnienia
  [-52, 12, 0, `<p>1 Maja, jabłka na drzewie za oknem właśnie kwitną. Zrobiłem sobie kawę i usiadłem przy oknie. Nic nie zrobiłem przez 20 minut. To też jest praca — przerwa planowa.</p>`, "spokoj", ["poranek", "kawa"]],
  [-51, 11, 30, `<p>Mykolog z forum — Artur Kowalenko — zaprosił mnie do korespondencji mailowej o stanowiskach. On dokumentuje zachodnie Karpaty, ja mam kilka stanowisk w mieście których on nie ma. Wymieniamy pliki.</p>`, "radość,energia", ["grzyby", "mycologia", "zielnik"]],
  [-50, 17, 0, `<p>Ewa wygrała stypendium naukowe — miesięczny wyjazd do Florencji w lipcu. Cieszę się dla niej i trochę już tęsknię. Lipiec będzie dziwny.</p>`, "radość,refleksja", ["przyjaciele"]],
  [-49, 11, 0, `<p>Wieliczka — zrobiłem zdjęcia do case study po montażu szyldów. Nowe logo na bramie wejściowej, na menu, na serwetach, na stronie. System identyfikacji żyje. Dodałem do portfolio.</p>`, "radość,energia", ["projekt", "studio"]],
  [-48, 19, 0, `<p>Wieczór po treningu. Ramię lekko boli — stara kontuzja z zawodów daje o sobie znać przy zbyt szybkich woltach. Kowalczyk powiedział że muszę wzmocnić rotatory. Zapisał mi ćwiczenia na kartce.</p>`, "zmęczenie,refleksja", ["szermierka", "zdrowie"]],
  [-47, 10, 30, `<p>Centrum kulturalne — brief dostałem. Dyrektor pisze długo i poetycko. Myślę że jeśli ktoś potrafi opisać swoje miejsce jak on, to chce czegoś ponadprzeciętnego. Cieszę się na ten projekt.</p>`, "energia,radość", ["klienci", "projekt"]],
  [-46, 18, 0, `<p>Wróciłem z centrum do domu i od razu usiadłem do szkicowania. Pięć stron w godzinę. Najbardziej produktywna godzina od tygodnia. Adrenalina po briefie.</p>`, "flow,energia", ["projekt", "flow"]],
  [-45, 21, 0, `<p>Floret wisi na ścianie od marca i nie był używany poza treningiem. Dzisiaj wziąłem go i powtarzałem woltę w salonie — 15 minut. Ewa siedziała na kanapie i patrzyła. „Wyglądasz jak ktoś kto trenuje do czegoś ważnego."</p>`, "energia,refleksja", ["szermierka"]],
  [-44, 19, 30, `<p>Artur Kowalenko przysłał mi zdjęcia z Tatr — stanowiska opieńki miodowej (Armillaria mellea) przy kosodrzewinie. Pytał o moje. Wysłałem mu stanowisko 7 i 11. Wymiana.</p>`, "radość", ["grzyby", "mycologia"]],
  [-43, 11, 0, `<p>Karolina zrobiła stronę centrum kulturalnego — layout jest taki dobry że powiedziałem jej żeby sama podpisała sekcję „design: Karolina Nowicka". Ona jest zaskoczona. Powiedziałem że zasłużyła.</p>`, "radość,refleksja", ["studio", "projekt"]],
  [-42, 20, 0, `<p>Zamówiłem nową lupę — powiększenie 10x, do oglądania zarodnikowania grzybów. Artur pisał że bez lupy nie idzie dobrze rozróżniać gatunków bliskich. Wydałem 120 zł. Wiem że to absurd i nie obchodzi mnie to.</p>`, "radość", ["grzyby", "mycologia"]],
  [-41, 8, 30, `<p>Rano — zrobiłem audyt tego co chcę osiągnąć do końca roku. Lista: 4 duże projekty z case studies, 1 wystawa portfolia, szermierka Katowice, 20 stanowisk w zielniku, 8 maszyn przez ręce. Zapisałem na Hermes. Lista wyszła ładna typograficznie.</p>`, "refleksja,motywacja", ["studio", "refleksja", "motywacja"]],
  [-40, 12, 0, `<p>Obiad z Agatą po treningu — pizzeria na Starówce. Mówiła o tym że szermierka jest dla niej medytacją ruchową. Że kiedy jest w walce, nie myśli o niczym innym. Rozumiem to. Dla mnie grzybobranie jest tym samym.</p>`, "refleksja,spokoj", ["szermierka", "grzyby", "przyjaciele"]],
  [-39, 20, 30, `<p>Nowa lupa dotarła — patrzyłem przez nią na kawałek purchawki który mam jako okaz suchy. Widać strukturę pod spodem, mikrofibry. Coś co nie istnieje gołym okiem nagle jest piękne. Jak z powiększeniem liter w typografii.</p>`, "radość,refleksja", ["grzyby", "mycologia"]],
  [-38, 12, 30, `<p>Rozmowy z Karoliną o co-founders. Ona ma inne doświadczenie — była w startupie, wie co znaczy equity. Ja nie wiem nic o tym formalnie. Postanowiliśmy że zanim cokolwiek podpiszemy, porozmawiamy z prawnikiem.</p>`, "refleksja,lęk", ["studio", "wątpliwości"]],
  [-37, 19, 0, `<p>Prawnik — znajomy Karoliny — powiedział że możemy zacząć od umowy partnerskiej bez zmiany formy spółki. Daje to elastyczność. Brzmi dobrze. Mamy czas do września.</p>`, "refleksja,spokoj", ["studio", "wątpliwości"]],
  [-36, 9, 30, `<p>Las — purchawka duża (Calvatia gigantea) z soboty była jadalna ale ciężka w obróbce. Spróbowałem ją po raz kolejny — smażona na maśle z tymiankiem. Lepsza niż pierwsza próba. Ewa mówi że to jak tofu — neutralne ale wchłania smak.</p>`, "radość", ["grzyby", "las"]],
  [-35, 8, 0, `<p>Rano — napisałem na Hermes 3000 krótki tekst o tym co robię i dlaczego. Zatytułowałem „Studio". Wyszło dwie strony. Przeczytałem dwa razy, złożyłem i schowałem z listem.</p>`, "refleksja", ["maszyna do pisania", "studio", "refleksja"]],
  [-34, 16, 30, `<p>Nowy projekt — sesja zdjęciowa portfolio moich maszyn. Ustawiłem je wszystkie na białym prześcieradle w oknie, zrobiłem 80 zdjęć. Karolina wpadła i mówiła że to jak rodzinna fotografia.</p>`, "radość", ["maszyna do pisania"]],
  [-33, 21, 0, `<p>Czytam „The Elements of Typographic Style" Bringhursta po raz trzeci w życiu. Za każdym razem widzę co innego. Teraz czytam rozdział o przestrzeni optycznej i myślę o logo pszczół które muszę zaprojektować.</p>`, "refleksja,spokoj", ["praca", "refleksja"]],
  [-32, 9, 30, `<p>Artur Kowalenko przysłał zdjęcia opieńki na buku z Babiogórskiego Parku. Niesamowite — pień pokryty grzybami od ziemi po trzy metry. Jak szata. Zapytałem czy mógłbym tam pojechać z nim w sierpniu. Napisał „oczywiście".</p>`, "radość,energia", ["grzyby", "mycologia"]],
  [-31, 21, 30, `<p>Zaproszenia ślubne dla Pawła i Dominiki — Dominika napisała: „Dostaliśmy prototyp z drukarni. Płakałam." To trzecia osoba która płakała przy moich projektach. Nie będę liczyć dalej, żeby nie umniejszać.</p>`, "radość", ["klienci", "projekt"]],

  // czerwiec – wypełnienia
  [-21, 12, 0, `<p>Zrobiłem podsumowanie zebranych maszyn — 7 przez ręce, 1 zostaje (Hermes). 6 sprzedanych. Łączny przychód: 3 240 zł z inwestycji ok. 700 zł w zakup + materiały. Niespodziewana linia dochodu.</p>`, "radość,refleksja", ["maszyna do pisania", "finanse"]],
  [-20, 16, 0, `<p>Gościnniec Kowalów ma pierwsze recenzje po rebrandingu na Google Maps. Jeden komentarz: „Nowe logo i aranżacja są na poziomie restauracji w Warszawie, ale z krakowską duszą." Tomasz przesłał mi screenshot ze słowem „Dziękuję".</p>`, "radość", ["klienci", "kraków"]],
  [-19, 14, 0, `<p>Ewa pakuje się na Florencję. Pytam czy potrzebuje czegoś. Mówi że kupi mi pocztówkę z reprodukcją Botticellego. Poprosiłem o Mantegnę — lubię jego typografię na obrazach. Ewa mówi że jestem niemożliwy. Ma rację.</p>`, "spokoj,radość", ["przyjaciele"]],
  [-18, 9, 0, `<p>Centrum kulturalne — system identyfikacji finalizuję. Dyrektor Wierzbicki zaakceptował sekcję po sekcji. Teraz zostaje dokumentacja techniczna — brambook i specyfikacja dla drukarni.</p>`, "praca,energia", ["projekt", "praca"]],
  [-17, 21, 0, `<p>Brother Deluxe 900 sprzedana za 380 zł. Kupujący — nauczyciel z Nowego Sącza — napisał: „Pierwsza maszyna jaką kupiłem. Uczę dzieci pisania ręcznego, teraz nauczę maszynowego." Nie mam na to słów.</p>`, "radość", ["maszyna do pisania"]],
  [-16, 14, 30, `<p>Warsztaty ASP — sala pełna. Jeden student zapytał o stawki. Powiedziałem prawdę — że na początku brałem za mało, że rynek wycenia się przez odwagę. Drugi student zapytał czy warto iść do agencji przed własną firmą. Powiedziałem że to zależy od tego czy potrzebujesz struktury czy wolności.</p>`, "refleksja,energia", ["networking", "studio"]],
  [-15, 18, 0, `<p>Purchawka olbrzymia w towarzystwie — zrobiłem risotto dla Karoliny i Ewy. Trzy godziny gotowania, godzina jedzenia, dwie godziny rozmowy. Dokładnie takie wieczory chcę mieć.</p>`, "radość,spokoj", ["grzyby", "przyjaciele"]],
  [-14, 9, 0, `<p>Niedziela — wziąłem Hermesa na balkon. Pisałem przy kawie przez godzinę — nic konkretnego, strumień myśli. Sąsiedzi z naprzeciwka patrzyli. Jeden pokazał kciuk w górę. Może mają ochotę na maszynę.</p>`, "spokoj,radość", ["maszyna do pisania", "poranek", "kawa"]],
  [-13, 9, 30, `<p>Centrum kulturalne case study — zrobiłem pierwsze zdjęcia aplikacji logotypu. Materiały drukowane są piękne — papier offsetowy, zadruk jednokolorowy, złota linia. Wyobrażam sobie jak to będzie wyglądało na plakatach w mieście.</p>`, "radość,flow", ["projekt", "studio"]],
  [-12, 10, 0, `<p>Projekt wystawy o Krakowie — 40 plansz A1 zaakceptowanych. Karolina i ja zrobiliśmy to w 10 dni. Rekordzistka.</p>`, "radość,energia", ["projekt", "studio"]],
  [-11, 21, 30, `<p>Wróciłem do zielnika — zaktualizowałem stanowisko 7 o nowe zdjęcia. Artur przysłał komentarz: moje zdjęcia stanowisk są „dokładniejsze niż w połowie publikacji naukowych". To chyba najlepszy komplement jaki dostałem w tym roku.</p>`, "radość", ["grzyby", "zielnik", "mycologia"]],
  [-10, 9, 0, `<p>Rano — projekt wystawy złożony przed terminem. Wypiłem kawę i zrobiłem nic przez godzinę. To był świadomy odpoczynek. Pierwszy od tygodnia.</p>`, "spokoj", ["poranek", "kawa"]],
  [-9, 12, 0, `<p>Po warsztatach na ASP kilkoro studentów dało mi wizytówki lub kontakt mailowy. Jeden — Karol — zapytał czy mógłby zrobić u mnie staż. Odpowiedziałem że jestem za mały firma, ale zapiszę kontakt na jesień.</p>`, "refleksja,radość", ["networking", "studio"]],
  [-8, 18, 0, `<p>Olympia SG3 — restauracja Brother Deluxe zajęła weekend, ta maszyna zajmuje dzień. Zmiana taśmy, czyszczenie grzebienia, oliwienie wózka. Wystawię ją jutro za 420 zł.</p>`, "spokoj", ["maszyna do pisania", "restauracja"]],
  [-7, 8, 30, `<p>Wczoraj wieczorem napisałem do architekta Urbańskiego propozycję wstępną zakresu. Odpowiedział o 7:30 rano. Budżet 25k, termin sierpień, zakres jasny. Tygrys biznesowy z tego człowieka.</p>`, "energia,radość", ["klienci", "umowa"]],
  [-6, 16, 0, `<p>Pszczelarz Jan Nowicki powiedział że zarząd chce logotyp na konkurs lokalny — termin za 3 tygodnie. Zdążymy. Na tym konkursie nagroda to reklama w regionalnym piśmie. Nienagrodzona — ale widoczność.</p>`, "energia,radość", ["klienci", "projekt"]],
  [-5, 21, 0, `<p>Logotyp pszczół — finalizuję. Paleta: miodowy, zieleń lipowa, biel, grafit. Pismo wybrane po trzech dniach testów: Freight Display w odmianie book. Elegankie ale organicze.</p>`, "flow,radość", ["projekt", "branding", "flow"]],
  [-4, 20, 0, `<p>Karolina mówi że jeśli wejdzie formalnie, chce odpowiadać za design systemów (strony, aplikacje) a ja za tożsamość wizualną. Podział ma sens. Napisałem to w notatniku roboczym jako draft umowy.</p>`, "refleksja", ["studio", "praca"]],
  [-3, 19, 0, `<p>Olympia SG3 sprzedana za 420 zł. Kupujący chce ją wstawić do wystroju kawiarni którą otwiera. Powiedziałem że kawiarnia musi być dobra jeśli ma tak dobrą maszynę w wystroju. Odpisał emoji śmiejącego się.</p>`, "radość", ["maszyna do pisania", "allegro"]],
  [-2, 11, 0, `<p>Ewa jedzie na Florencję w poniedziałek. Sprawdziłem jej plecak. Ma za mało miejsca na książki które chce zabrać. Typowe.</p>`, "spokoj,radość", ["przyjaciele"]],
  [-1, 16, 0, `<p>Centrum kulturalne — projekt zamknięty. Dyrektor Wierzbicki napisał oficjalne podziękowanie e-mailem i kopię do rady programowej. Dostałem referencje na firmowym papierze. To pierwsze pisemne referencje które mam.</p>`, "radość,refleksja", ["klienci", "studio", "przełom"]],

  // ostatnie 13 wpisów do 300
  [-83, 9, 30, `<p>Kafeterka zamówiła drugą partię — filiżanki papierowe z nowym logo. Bart mówi że klienci pytają o logo. Dobry znak.</p>`, "radość", ["klienci", "projekt"]],
  [-72, 20, 0, `<p>Kupiłem na OLX stary fotel biurowy za 150 zł. Regulowany, prawdziwa skóra, z lat 80. Pasuje do Hermes 3000. Moje biuro ma teraz klimat.</p>`, "radość", ["studio", "refleksja"]],
  [-66, 15, 30, `<p>Myślę o tym że projektowanie i szermierka uczą tego samego — czytania sytuacji szybciej niż racjonalne myślenie. W obu po czasie reagujesz zanim wiesz po co.</p>`, "refleksja", ["szermierka", "refleksja", "praca"]],
  [-58, 11, 0, `<p>Ewa pyta dlaczego tyle maszyn. Próbuję wyjaśnić że każda jest inna — inny chód, inny głos, inne życie. Ona słucha i kiwa głową. Nie rozumie ale słucha. To wystarczy.</p>`, "spokoj,radość", ["maszyna do pisania", "przyjaciele"]],
  [-53, 9, 0, `<p>Nowe stanowisko w zielniku — zielarka (Phlebia tremellosa) na martwej gałęzi buczyny. Pomarańczowo-różowa, konsystencja galaretki. Niesamowita. Stanowisko 16.</p>`, "radość", ["grzyby", "zielnik", "mycologia"]],
  [-47, 12, 30, `<p>Artur napisał że chce wspólnie napisać artykuł do pisma mykologicznego o stanowiskach miejskich w Krakowie. Moje zdjęcia + jego wiedza naukowa. Powiedziałem tak bez zastanowienia.</p>`, "radość,energia", ["grzyby", "mycologia"]],
  [-43, 10, 0, `<p>Karolina i ja przez telefon — ona z Wrocławia (odwiedza rodziców), ja z Krakowa. Omawialiśmy projekt centrum kulturalnego przez godzinę. Praca zdalna działa. To dobry znak dla ewentualnej spółki.</p>`, "refleksja,energia", ["studio", "praca"]],
  [-37, 11, 0, `<p>Centrum kulturalne — brambook prawie gotowy. 40 stron dokumentacji. Dyrektor Wierzbicki mówi że chce go oprawić i trzymać w gabinecie. To jest to — projekt który żyje poza ekranem.</p>`, "radość", ["projekt", "klienci"]],
  [-28, 10, 0, `<p>Zaproszenia Pawła i Dominiki — finalna wersja zatwierdzona. Letterpress, papier bawełniany 350g, wytłoczenie na kopercie. Kosztuje ich 18 zł za sztukę. Powiedzieli że warto.</p>`, "radość", ["projekt", "klienci"]],
  [-22, 20, 0, `<p>Wieczór na balkonie. Słucham sąsiadki grającej na skrzypcach przez otwarte okno. Myślę że miałem rację wychodzą z Pixelatora. Że strach to był tylko strach.</p>`, "refleksja,spokoj", ["refleksja", "studio"]],
  [-11, 15, 0, `<p>Projekt wystawy — zobaczyłem plansza przyklejone na ścianie galerii. Moje i Karoliny. 40 plansz A1. Stałem z tyłu i poczułem co to znaczy skalować projekt z ekranu na ścianę.</p>`, "radość,refleksja", ["projekt", "kraków"]],
  [-5, 14, 0, `<p>Pszczelarz Jan Nowicki zgłosił logotyp na konkurs. Wyniki za tydzień. Niezależnie od wyniku — projekt jest dobry. Wiem to.</p>`, "spokoj,motywacja", ["klienci", "projekt"]],
  [-1, 9, 0, `<p>Niedziela. Napisałem w zielnik podsumowanie sezonu wiosennego: 18 stanowisk, 29 gatunków, jeden artykuł naukowy w drodze z Arturem. Zielnik ma teraz 60 stron. Zaczynałem z jedną strony 22 marca.</p>`, "radość,refleksja", ["grzyby", "zielnik", "refleksja"]],
];

// ─── Narzędzia ─────────────────────────────────────────────────────────────

function escHtml(s) {
  return s; // already HTML
}

function dateFor(dayOffset, hour, minute) {
  const base = new Date("2026-06-22T00:00:00+02:00");
  base.setDate(base.getDate() + dayOffset);
  base.setHours(hour, minute, 0, 0);
  return base.toISOString();
}

function htmlToText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(p|div|h[1-6]|li|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function api(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers,
    ...opts,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${res.status} ${path}: ${txt}`);
  }
  if (res.status === 204 || res.status === 201 && res.headers.get("content-length") === "0") return null;
  const txt = await res.text();
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch(e) {
    throw new Error(`JSON parse failed for ${path} (status ${res.status}): ${txt.slice(0, 200)}`);
  }
}

// ─── Główna logika ──────────────────────────────────────────────────────────

async function upsertTags() {
  console.log("Upsert tagów...");
  const tagMap = {};
  for (const name of TAG_NAMES) {
    // sprawdź czy tag istnieje
    const existing = await api(`tags?user_id=eq.${USER_ID}&name=eq.${encodeURIComponent(name)}&select=id`);
    if (existing.length > 0) {
      tagMap[name] = existing[0].id;
    } else {
      const created = await api("tags", {
        method: "POST",
        body: JSON.stringify({ user_id: USER_ID, name }),
        headers: { ...headers, Prefer: "return=representation" },
      });
      tagMap[name] = created[0].id;
    }
  }
  console.log(`  ${Object.keys(tagMap).length} tagów gotowych.`);
  return tagMap;
}

async function clearExistingEntries() {
  console.log("Czyszczę istniejące wpisy gościa...");
  // pobierz wszystkie ids
  const existing = await api(`entries?user_id=eq.${USER_ID}&select=id`);
  console.log(`  Znalazłem ${existing.length} istniejących wpisów.`);
  if (existing.length === 0) return;

  // usuń entry_tags najpierw
  for (const e of existing) {
    await api(`entry_tags?entry_id=eq.${e.id}`, { method: "DELETE" });
  }
  // usuń wpisy
  await api(`entries?user_id=eq.${USER_ID}`, { method: "DELETE" });
  console.log("  Wyczyszczone.");
}

async function insertEntry(entry, tagMap) {
  const [dayOffset, hour, minute, html, mood, tags] = entry;
  const createdAt = dateFor(dayOffset, hour, minute);
  const contentText = htmlToText(html);

  const moodFirst = mood ? mood.split(",")[0] : null;

  const rows = await api("entries", {
    method: "POST",
    body: JSON.stringify({
      user_id: USER_ID,
      content_html: html,
      content_text: contentText,
      mood: moodFirst,
      created_at: createdAt,
      updated_at: createdAt,
    }),
    headers: { ...headers, Prefer: "return=representation" },
  });

  const entryId = rows[0].id;

  // entry_tags
  if (tags.length > 0) {
    const tagLinks = tags
      .filter((t) => tagMap[t])
      .map((t) => ({ entry_id: entryId, tag_id: tagMap[t] }));
    if (tagLinks.length > 0) {
      await api("entry_tags", {
        method: "POST",
        body: JSON.stringify(tagLinks),
        headers: { ...headers, Prefer: "return=minimal" },
      });
    }
  }

  return entryId;
}

async function main() {
  console.log(`\nSeed 300 wpisów dla użytkownika ${USER_ID}\n`);

  await clearExistingEntries();
  const tagMap = await upsertTags();

  console.log(`\nWstawiam ${ENTRIES.length} wpisów...`);
  let i = 0;
  for (const entry of ENTRIES) {
    const id = await insertEntry(entry, tagMap);
    i++;
    if (i % 20 === 0) console.log(`  ${i}/${ENTRIES.length}...`);
  }

  console.log(`\n✓ Gotowe! Wstawiono ${i} wpisów.`);
}

main().catch((e) => {
  console.error("BŁĄD:", e.message);
  process.exit(1);
});
