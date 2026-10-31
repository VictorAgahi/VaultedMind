"use client";

import React from "react";
import Link from "next/link";
import { Box, Button, FormControlLabel, Link as MuiLink, Paper, Switch, Typography } from "@mui/material";
import { apiService } from "@/services/api.service";
import { useAuth } from "@/context/auth-context";
import { leversWording } from "@/utils/tracked-subject";
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

type ObviousVerdict = (findingKey: string, obvious: boolean) => void;

interface FindingCardProps {
  finding: PatternFinding;
  tone: "help" | "neutral";
  /** Avis actuel de la personne sur ce lien, pour proposer le bon bouton. */
  obvious: boolean;
  onVerdict: ObviousVerdict;
}

const FindingCard: React.FC<FindingCardProps> = ({ finding, tone, obvious, onVerdict }) => (
  <InsightCard tone={tone}>
    <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", justifyContent: "space-between" }}>
      <Typography variant="body2">{finding.summary}</Typography>
      <StrengthChip strength={finding.strength} />
    </Box>
    <DayLinks dates={finding.exampleDates} />
    {finding.findingKey && (
      <Button
        size="small"
        color="inherit"
        onClick={() => onVerdict(finding.findingKey as string, !obvious)}
        sx={{ justifySelf: "start", minHeight: 32, textTransform: "none" }}
      >
        {obvious ? "Ce n'est pas évident" : "C'est évident"}
      </Button>
    )}
  </InsightCard>
);

interface FindingGroupProps {
  id: string;
  title: string;
  subtitle: string;
  findings: PatternFinding[];
  tone: "help" | "neutral";
  obvious: boolean;
  onVerdict: ObviousVerdict;
}

const FindingGroup: React.FC<FindingGroupProps> = ({ id, title, subtitle, findings, tone, obvious, onVerdict }) => {
  if (findings.length === 0) return null;
  return (
    <Box component="section" aria-labelledby={id} sx={{ display: "grid", gap: 1 }}>
      <SectionTitle id={id} title={title} subtitle={subtitle} level="h6" />
      <ShowMoreList
        items={findings}
        render={(finding) => (
          <FindingCard key={`${finding.key}-${finding.lag}-${finding.rho > 0 ? "p" : "n"}`} finding={finding} tone={tone} obvious={obvious} onVerdict={onVerdict} />
        )}
      />
    </Box>
  );
};

// Les liens connus de tous restent consultables mais à l'écart, repliés par défaut.
const ExpectedLinks: React.FC<{ id: string; findings: PatternFinding[]; onVerdict: ObviousVerdict }> = ({ id, findings, onVerdict }) => {
  const [open, setOpen] = React.useState(false);
  if (findings.length === 0) return null;
  const panelId = `${id}-panel`;
  return (
    <Box component="section" aria-labelledby={id} sx={{ display: "grid", gap: 1 }}>
      <Button
        id={id}
        color="inherit"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        sx={{ justifySelf: "start", textTransform: "none" }}
      >
        Liens attendus ({findings.length})
      </Button>
      {open && (
        <Box id={panelId} sx={{ display: "grid", gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Des liens réels mais connus de tous : ils sont mis de côté pour laisser la place à ce qui est moins évident.
          </Typography>
          <ShowMoreList
            items={findings}
            render={(finding) => (
              <FindingCard key={`${finding.key}-${finding.lag}-${finding.rho > 0 ? "p" : "n"}`} finding={finding} tone="neutral" obvious onVerdict={onVerdict} />
            )}
          />
        </Box>
      )}
    </Box>
  );
};

const BeforeDifficultDays: React.FC<{ target: PatternTargetReport; idSuffix: string }> = ({ target, idSuffix }) => {
  const items = target.beforeDifficultDays?.items ?? [];
  if (items.length === 0) return null;
  const moreOften = items.filter((item) => item.moreFrequentBefore);
  const rarer = items.filter((item) => !item.moreFrequentBefore);
  const id = `before-${idSuffix}`;
  const heading = target.binary ? "Avant les jours moins favorables" : "Avant mes journées difficiles";
  return (
    <Box component="section" aria-labelledby={id} sx={{ display: "grid", gap: 1.5 }}>
      <SectionTitle
        id={id}
        title={heading}
        subtitle="Pour repérer des signaux, pas pour prédire."
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

const directionCaption = (target: PatternTargetReport): string => {
  if (target.direction === "NEUTRAL") return "comprendre ce qui le fait varier";
  const higher = target.direction === "HIGHER_IS_BETTER";
  if (target.binary) return higher ? "plus fréquent, c'est mieux" : "plus rare, c'est mieux";
  return higher ? "plus haut, c'est mieux" : "plus bas, c'est mieux";
};

// Sens du lien pour un repère sans côté favorable : la valeur monte ou baisse avec le prédicteur.
const raisesTarget = (finding: PatternFinding): boolean => (finding.effect?.difference ?? finding.rho) >= 0;

interface TargetSectionProps {
  target: PatternTargetReport;
  index: number;
  isObvious: (finding: PatternFinding) => boolean;
  onVerdict: ObviousVerdict;
}

const TargetSection: React.FC<TargetSectionProps> = ({ target, index, isObvious, onVerdict }) => {
  const { user } = useAuth();
  const wording = leversWording(user?.preferences?.trackedSubject);
  const headingId = `target-${index}`;
  const findings = target.findings ?? [];
  const main = findings.filter((finding) => !isObvious(finding));
  const expected = findings.filter(isObvious);
  const neutral = target.direction === "NEUTRAL";
  const helping = main.filter((finding) => finding.favourable === true);
  const weighing = main.filter((finding) => finding.favourable === false);
  const undetermined = main.filter((finding) => finding.favourable === null);
  const raising = neutral ? undetermined.filter(raisesTarget) : [];
  const lowering = neutral ? undetermined.filter((finding) => !raisesTarget(finding)) : [];

  return (
    <Paper component="section" aria-labelledby={headingId} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 4, display: "grid", gap: 2 }}>
      <Box>
        <Typography id={headingId} variant="h5" component="h2">{target.label}</Typography>
        <Typography variant="caption" color="text.secondary">Repère suivi : {directionCaption(target)}</Typography>
      </Box>

      {!target.targetStillValid ? (
        <Typography variant="body2" color="text.secondary" role="status">
          Ce champ n&apos;est plus actif ou n&apos;est plus un repère choisi. Mettez à jour{" "}
          <MuiLink component={Link} href="/settings/analyse#insight-targets">Ce que je veux comprendre</MuiLink>.
        </Typography>
      ) : (
        <>
          {main.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {expected.length > 0
                ? "Seuls des liens attendus ont été repérés pour l'instant."
                : "Aucun lien assez net pour l'instant. Cela peut évoluer avec davantage de jours notés."}
            </Typography>
          )}
          {neutral ? (
            <>
              <FindingGroup id={`up-${index}`} title="Ce qui le fait monter" subtitle="Des liens associés à des valeurs plus hautes." findings={raising} tone="neutral" obvious={false} onVerdict={onVerdict} />
              <FindingGroup id={`down-${index}`} title="Ce qui le fait baisser" subtitle="Des liens associés à des valeurs plus basses." findings={lowering} tone="neutral" obvious={false} onVerdict={onVerdict} />
            </>
          ) : (
            <>
              <FindingGroup id={`help-${index}`} title={wording.helps} subtitle={wording.helpsSubtitle} findings={helping} tone="help" obvious={false} onVerdict={onVerdict} />
              <FindingGroup id={`weigh-${index}`} title={wording.weighs} subtitle={wording.weighsSubtitle} findings={weighing} tone="neutral" obvious={false} onVerdict={onVerdict} />
              <FindingGroup id={`other-${index}`} title="Autres liens observés" subtitle="Le sens de ces liens ne peut pas être tranché." findings={undetermined} tone="neutral" obvious={false} onVerdict={onVerdict} />
            </>
          )}
          <BeforeDifficultDays target={target} idSuffix={String(index)} />
          <ExpectedLinks id={`expected-${index}`} findings={expected} onVerdict={onVerdict} />
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
  const gaps = targets.filter((target) => target.targetStillValid).flatMap((target) => target.scoreTextGaps ?? []);
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
  // Avis de la personne en attente de confirmation du serveur, par clé de lien (mise à jour optimiste).
  const [overrides, setOverrides] = React.useState<Record<string, boolean>>({});
  const [notice, setNotice] = React.useState<string | null>(null);

  const isObvious = (finding: PatternFinding): boolean => {
    const own = finding.findingKey ? overrides[finding.findingKey] : undefined;
    return own ?? finding.obvious ?? false;
  };

  const sendVerdict: ObviousVerdict = (findingKey, obvious) => {
    const previous = overrides[findingKey];
    setNotice(null);
    setOverrides((current) => ({ ...current, [findingKey]: obvious }));
    apiService.post("/insights/patterns/obvious", { findingKey, obvious }).catch(() => {
      setOverrides((current) => {
        const next = { ...current };
        if (previous === undefined) delete next[findingKey];
        else next[findingKey] = previous;
        return next;
      });
      setNotice("Ton avis n'a pas pu être enregistré. Réessaie dans un instant.");
    });
  };

  const changePoints = [
    ...report.targets.filter((target) => target.targetStillValid).flatMap((target) => target.changePoints ?? []),
    ...(report.stateChangePoints ?? []),
  ];
  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      {notice && <Typography variant="body2" role="status">{notice}</Typography>}
      {report.targets.map((target, index) => (
        <TargetSection key={`${target.key}-${target.value ?? ""}`} target={target} index={index} isObvious={isObvious} onVerdict={sendVerdict} />
      ))}
      <ChangePoints items={changePoints} />
      <ScoreTextGaps targets={report.targets} />
    </Box>
  );
};
