import { Suspense } from "react";
import { FormularzFaktury } from "@/components/FormularzFaktury";

export default function NowaFaktura() {
  return (
    <Suspense fallback={<p>Wczytuję formularz...</p>}>
      <FormularzFaktury />
    </Suspense>
  );
}
