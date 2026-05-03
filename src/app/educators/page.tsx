import { Metadata } from "next";
import { EducatorDashboard } from "@/features/educators/components/EducatorDashboard";

export const metadata: Metadata = {
  title: "Educator Mode | CivicIQ",
  description: "Manage your students' civic education progress, assign quizzes, and access lesson plans.",
};

export default function EducatorsPage() {
  return <EducatorDashboard />;
}
