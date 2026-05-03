import type { Metadata } from "next";
import QuizPage from "@features/quiz/components/QuizPage";

export const metadata: Metadata = {
  title: "Civic Knowledge Quiz",
  description:
    "Test your civic knowledge with 500+ questions covering election processes across 10+ countries. Earn badges, track progress, and become a more informed voter.",
};

export default function Page() {
  return <QuizPage />;
}
