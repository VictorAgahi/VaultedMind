import type { Metadata } from "next";
import { TherapistExport } from "@/components/export/therapist-export";

export const metadata: Metadata = {
  title: "Export pour mon thérapeute",
  robots: { index: false, follow: false },
};

export default function ExportPage() {
  return <TherapistExport />;
}
