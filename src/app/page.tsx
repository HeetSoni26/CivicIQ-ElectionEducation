import type { Metadata } from "next";
import HomePage from "@features/home/components/HomePage";

export const metadata: Metadata = {
  title: "CivicIQ — Election Process Education Assistant",
  description:
    "Understand your country's election process, check voting eligibility, and participate in democracy with confidence. Free, accessible, and politically neutral.",
};

export default function Page() {
  return <HomePage />;
}
