import { Metadata } from "next";
import { notFound } from "next/navigation";
import { SETTINGS_SECTION_IDS, SETTINGS_TITLES, isSettingsSectionId } from "@/components/settings/settings-routes";
import SettingsSectionClient from "./section-client";

interface SettingsSectionPageProps {
  params: Promise<{ section: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return SETTINGS_SECTION_IDS.map((section) => ({ section }));
}

export async function generateMetadata({ params }: SettingsSectionPageProps): Promise<Metadata> {
  const { section } = await params;
  const title = isSettingsSectionId(section) ? SETTINGS_TITLES[section] : "Paramètres";
  return { title: `${title} | VaultedMind` };
}

export default async function SettingsSectionPage({ params }: SettingsSectionPageProps) {
  const { section } = await params;
  if (!isSettingsSectionId(section)) notFound();
  return <SettingsSectionClient section={section} />;
}
