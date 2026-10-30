"use client";

import React from "react";
import Link from "next/link";
import { Box, FormControlLabel, Link as MuiLink, Paper, Switch, Typography } from "@mui/material";
import type { PatternChangePoint, PatternFinding, PatternReport, PatternTargetReport } from "@/types";
import { DayLinks, InsightCard, SectionTitle, ShowMoreList, StrengthChip } from "./levers-parts";

const GAPS_STORAGE_KEY = "vaultedmind:levers-show-gaps";

const readGapsPreference = (): boolean => {
  try {
    return localStorage.getItem(GAPS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const writeGapsPreference = (value: boolean): void => {
  try {
    localStorage.setItem(GAPS_STORAGE_KEY, value ? "1" : "0");
  } catch {
    // Stockage indisponible : le choix vaut pour cette visite seulement.
  }
};

const FindingCard: React.FC<{ finding: PatternFinding; tone: "help" | "neutral" }> = ({ finding, tone }) => (
  <InsightCard tone={tone}>
    <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", justifyContent: "space-between" }}>
      <Typography variant="body2">{finding.summary}</Typography>
      <StrengthChip strength={finding.strength} />
    </Box>
    <DayLinks dates={finding.exampleDates} />
  </InsightCard>
);

const FindingGroup: React.FC<{ id: string; title: string; subtitle: string; findings: PatternFinding[]; tone: "help" | "neutral" }> = ({
  id,
  title,
  subtitle,
  findings,
  tone,
}) => {
  if (findings.length === 0) return null;
  return (
    <Box component="section" aria-labelledby={id} sx={{ display: "grid", gap: 1 }}>
      <SectionTitle id={id} title={title} subtitle={subtitle} level="h6" />
      <ShowMoreList items={findings} render={(finding) => <FindingCard key={`${finding.key}-${finding.lag}`} finding={finding} tone={tone} />} />
    </Box>
  );
};

const BeforeDifficultDays: React.FC<{ target: PatternTargetReport }> = ({ target }) => {
  const items = target.beforeDifficultDays?.items ?? [];
  if (items.length === 0) return null;
  const moreOften = items.filter((item) => item.moreFrequentBefore);
  const rarer = items.filter((item) => !item.moreFrequentBefore);
  const id = `before-${target.fieldId}`;
  return (
    <Box component="section" aria-labelledby={id} sx={{ display: "grid", gap: 1.5 }}>
      <SectionTitle
        id={id}
        title="Avant mes journées difficiles"
        subtitle="Pour t'aider à repérer tes signaux, pas pour prédire."
        level="h6"
      />
      {moreOften.length > 0 && (
        <Box sx={{ display: "grid", gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>Revient plus souvent avant</Typography>
          <ShowMoreList items={moreOften} render={(item) => <InsightCard key={item.key} tone="neutral"><Typography variant="body2">{item.summary}</Typography></InsightCard>} />
        </Box>
      )}
      {rarer.length > 0 && (
        <Box sx={{ display: "grid", gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>Plus rare avant</Typography>
          <ShowMoreList items={rarer} render={(item) => <InsightCard key={item.key} tone="help"><Typography variant="body2">{item.summary}</Typography></InsightCard>} />
        </Box>
      )}
    </Box>
  );
};

const TargetSection: React.FC<{ target: PatternTargetReport }> = ({ target }) => {
  const headingId = `target-${target.fieldId}`;
  const helping = target.findings.filter((finding) => finding.favourable === true);
  const weighing = target.findings.filter((finding) => finding.favourable === false);
  const undetermined = target.findings.filter((finding) => finding.favourable === null);
  const direction = target.direction === "HIGHER_IS_BETTER" ? "plus haut, c'est mieux" : "plus bas, c'est mieux";

  return (
    <Paper component="section" aria-labelledby={headingId} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 4, display: "grid", gap: 2 }}>
      <Box>
        <Typography id={headingId} variant="h5" component="h2">{target.label}</Typography>
        <Typography variant="caption" color="text.secondary">Repère suivi : {direction}</Typography>
      </Box>

      {!target.targetStillValid ? (
        <Typography variant="body2" color="text.secondary" role="status">
          Ce champ n&apos;est plus actif ou n&apos;est plus un repère choisi. Mettez à jour{" "}
          <MuiLink component={Link} href="/profile#insight-targets">Ce que je veux comprendre</MuiLink>.
        </Typography>
      ) : (
        <>
          {target.findings.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Aucun lien assez net pour l&apos;instant. Cela peut évoluer avec davantage de jours notés.
            </Typography>
          )}
          <FindingGroup id={`help-${target.fieldId}`} title="Ce qui t'aide" subtitle="Des liens qui vont dans le sens que tu souhaites." findings={helping} tone="help" />
          <FindingGroup id={`weigh-${target.fieldId}`} title="Ce qui pèse" subtitle="Des liens qui vont à l'inverse de ce que tu souhaites." findings={weighing} tone="neutral" />
          <FindingGroup id={`other-${target.fieldId}`} title="Autres liens observés" subtitle="Le sens de ces liens ne peut pas être tranché." findings={undetermined} tone="neutral" />
          <BeforeDifficultDays target={target} />
        </>
      )}
    </Paper>
  );
};

const ChangePoints: React.FC<{ items: PatternChangePoint[] }> = ({ items }) => {
  if (items.length === 0) return null;
  return (
    <Paper component="section" aria-labelledby="changes-title" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 4, display: "grid", gap: 1.5 }}>
      <SectionTitle id="changes-title" title="Ce qui a changé" subtitle="Des moments où la moyenne d'un repère ou d'un signal a basculé." />
      <ShowMoreList
        items={items}
        render={(item) => (
          <InsightCard key={`${item.key}-${item.date}`} tone="neutral">
            <Typography variant="body2">{item.summary}</Typography>
            <DayLinks dates={[item.date]} label="Ouvrir ce jour :" />
          </InsightCard>
        )}
      />
    </Paper>
  );
};

const ScoreTextGaps: React.FC<{ targets: PatternTargetReport[] }> = ({ targets }) => {
  const [shown, setShown] = React.useState<boolean>(readGapsPreference);
  const gaps = targets.filter((target) => target.targetStillValid).flatMap((target) => target.scoreTextGaps);
  if (gaps.length === 0) return null;
  return (
    <Paper component="section" aria-labelledby="gaps-title" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 4, display: "grid", gap: 1.5 }}>
      <Typography id="gaps-title" variant="h5" component="h2">Écarts entre score et texte</Typography>
      <FormControlLabel
        control={
          <Switch
            checked={shown}
            onChange={(event) => {
              setShown(event.target.checked);
              writeGapsPreference(event.target.checked);
            }}
          />
        }
        label="Afficher les écarts entre mon score et mes notes"
        sx={{ alignItems: "flex-start", "& .MuiSwitch-root": { mt: -0.5 } }}
      />
      {shown && (
        <ShowMoreList
          items={gaps}
          render={(gap) => (
            <InsightCard key={gap.date} tone="neutral">
              <Typography variant="body2">{gap.summary}</Typography>
              <DayLinks dates={[gap.date]} label="Ouvrir ce jour :" />
            </InsightCard>
          )}
        />
      )}
    </Paper>
  );
};

export const LeversReport: React.FC<{ report: PatternReport }> = ({ report }) => {
  const changePoints = [
    ...report.targets.filter((target) => target.targetStillValid).flatMap((target) => target.changePoints),
    ...report.stateChangePoints,
  ];
  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      {report.targets.map((target) => (
        <TargetSection key={target.fieldId} target={target} />
      ))}
      <ChangePoints items={changePoints} />
      <ScoreTextGaps targets={report.targets} />
    </Box>
  );
};
