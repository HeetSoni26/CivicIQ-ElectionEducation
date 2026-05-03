import type { Metadata } from "next";
import CalendarPage from "@/features/calendar/components/CalendarPage";

export const metadata: Metadata = {
  title: "Election Calendar",
  description:
    "See upcoming election dates, voter registration deadlines, and key civic dates for your country. Add reminders to Google Calendar, Apple Calendar, or iCal.",
};

export default function Page() {
  return <CalendarPage />;
}
