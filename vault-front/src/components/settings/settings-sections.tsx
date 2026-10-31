"use client";

import React from "react";
import type { SvgIconComponent } from "@mui/icons-material";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import { SETTINGS_TITLES, type SettingsSectionId } from "./settings-routes";
import { AdvancedAnalysisSettings } from "./advanced-analysis-settings";
import { AiAssistantSettings } from "./ai-assistant-settings";
import { NotificationSettings } from "./notification-settings";
import { PrivacySecuritySettings } from "./privacy-security-settings";
import { DataSettings } from "./data-settings";

export interface SettingsSection {
  id: SettingsSectionId;
  title: string;
  /** Ce que contient la section, en une ligne. */
  hint: string;
  icon: SvgIconComponent;
  Content: React.FC;
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "analyse",
    title: SETTINGS_TITLES.analyse,
    hint: "Qui est suivi, entourage, repères, signaux",
    icon: PsychologyOutlinedIcon,
    Content: AdvancedAnalysisSettings,
  },
  {
    id: "assistant",
    title: SETTINGS_TITLES.assistant,
    hint: "Consentement, notes, ce que l'IA sait de moi",
    icon: SmartToyOutlinedIcon,
    Content: AiAssistantSettings,
  },
  {
    id: "rappels",
    title: SETTINGS_TITLES.rappels,
    hint: "Rappel du soir, notifications de l'appareil",
    icon: NotificationsNoneOutlinedIcon,
    Content: NotificationSettings,
  },
  {
    id: "confidentialite",
    title: SETTINGS_TITLES.confidentialite,
    hint: "Code de verrouillage, consentements",
    icon: ShieldOutlinedIcon,
    Content: PrivacySecuritySettings,
  },
  {
    id: "donnees",
    title: SETTINGS_TITLES.donnees,
    hint: "Champs, Apple Santé, import, export",
    icon: FolderOutlinedIcon,
    Content: DataSettings,
  },
];

export const sectionById = (id: SettingsSectionId): SettingsSection =>
  SETTINGS_SECTIONS.find((section) => section.id === id) ?? SETTINGS_SECTIONS[0];
