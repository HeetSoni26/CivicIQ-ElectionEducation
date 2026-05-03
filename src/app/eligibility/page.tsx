import type { Metadata } from "next";
import EligibilityPage from "@features/eligibility-checker/components/EligibilityPage";

export const metadata: Metadata = {
  title: "Check Voting Eligibility",
  description:
    "Find out if you are eligible to vote in your country. Enter your age, citizenship, and residency information to get an instant eligibility check — no account needed.",
};

export default function Page() {
  return <EligibilityPage />;
}
