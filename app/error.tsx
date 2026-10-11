"use client";

export default function Blad({ error }: { error: Error }) {
  return (
    <div className="rounded-2xl border border-linia bg-karta p-6">
      <p className="font-serif text-3xl">Coś nie wstało</p>
      <p className="mt-2 text-sm">{error.message}</p>
    </div>
  );
}
