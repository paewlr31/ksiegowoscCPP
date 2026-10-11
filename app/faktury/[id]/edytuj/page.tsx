"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FormularzFaktury } from "@/components/FormularzFaktury";
import type { Faktura } from "@/lib/typy";

export default function EdycjaFaktury() {
  const params = useParams<{ id: string }>();
  const [faktura, setFaktura] = useState<Faktura | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/faktury")
      .then((r) => r.json())
      .then((lista: Faktura[]) => setFaktura(lista.find((f) => f.id === params.id) ?? null));
  }, [params.id]);

  if (faktura === undefined) return <p>Wczytuję fakturę...</p>;
  if (!faktura) return <p>Nie ma takiej faktury.</p>;
  if (faktura.ksefNumer) return <p>Ta faktura jest już w KSeF. Poprawkę wystaw jako korektę.</p>;
  return <FormularzFaktury edytowana={faktura} />;
}
