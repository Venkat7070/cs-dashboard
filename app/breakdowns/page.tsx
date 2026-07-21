import { Suspense } from "react";
import BreakdownsShell from "@/components/BreakdownsShell";

export default function Page() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-text/50">Loading…</div>}>
      <BreakdownsShell />
    </Suspense>
  );
}
