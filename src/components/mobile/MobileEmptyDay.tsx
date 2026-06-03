"use client";

export function MobileEmptyDay() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <p className="text-sm text-muted max-w-xs">
        Brak wpisów na ten dzień.
        <br />
        Dodaj nowy mikrofonem po prawej.
      </p>
    </div>
  );
}
