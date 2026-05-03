"use client";
import dynamic from "next/dynamic";

const ElectionGuideWizard = dynamic(
  () => import("@/features/election-guide/components/ElectionGuideWizard").then(m => ({ default: m.ElectionGuideWizard })),
  { ssr: false, loading: () => <div style={{ padding: "2rem", textAlign: "center" }}>Loading guide...</div> }
);

export default function GuidePage() {
  return <ElectionGuideWizard />;
}
