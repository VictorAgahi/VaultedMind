"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  Box
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { DailyLog, CustomField, FieldType } from "@/types";
import { ClientOnlyDate } from "../ui/client-only-date";
import { formatHourlyValue } from "@/utils/time-converter";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { NoteText } from "./note-text";

interface LogTableProps {
  logs: DailyLog[];
  activeFields: CustomField[];
  onEdit: (log: DailyLog) => void;
  onDelete: (id: string) => void;
}

const getDisplayValue = (log: DailyLog, field: CustomField): string => {
  const fieldValue = log.fieldValues?.find((v) => v.customFieldId === field.id);
  if (!fieldValue) return "-";
  let displayValue: string;
  if (field.fieldType === FieldType.BOOLEAN) {
    displayValue = fieldValue.value === "true" ? "Oui" : "Non";
  } else if (field.fieldType === FieldType.NUMBER && (field.optionsOrder || []).includes("isHourly")) {
    displayValue = formatHourlyValue(fieldValue.value);
  } else {
    displayValue = fieldValue.value;
  }

  if (fieldValue.subValues && Object.keys(fieldValue.subValues).length > 0) {
    const subLabels = Object.entries(fieldValue.subValues)
      .map(([subKey, subVal]) => {
        const subDef = field.subFields?.find((sf) => sf.id === subKey || sf.name === subKey);
        return subDef ? `${subDef.name}: ${subVal}` : subVal;
      })
      .join(", ");
    displayValue = `${displayValue} (${subLabels})`;
  }
  return displayValue;
};

// Sur mobile, une carte par journée : la date, les valeurs renseignées, les actions sous le pouce.
const LogCards: React.FC<LogTableProps> = ({ logs, activeFields, onEdit, onDelete }) => (
  <Box sx={{ display: { xs: "grid", md: "none" }, gap: 1 }}>
    {logs.map((log) => {
      const filled = activeFields
        .map((field) => ({ field, value: getDisplayValue(log, field) }))
        .filter((item) => item.value !== "-");
      return (
        <Box key={log.id} sx={{ p: 1.5, borderRadius: 3, bgcolor: "action.hover", display: "grid", gap: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
            <Typography variant="subtitle2" sx={{ textTransform: "capitalize" }}>
              <ClientOnlyDate date={log.logDate} />
            </Typography>
            <Box sx={{ display: "flex", mr: -1 }}>
              <IconButton onClick={() => onEdit(log)} aria-label={`Modifier le journal du ${new Date(log.logDate).toLocaleDateString("fr-FR")}`} sx={{ color: "text.secondary" }}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton onClick={() => onDelete(log.id)} aria-label={`Supprimer le journal du ${new Date(log.logDate).toLocaleDateString("fr-FR")}`} sx={{ color: "text.secondary" }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          {filled.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {filled.map(({ field, value }) => (
                <Box key={field.id} sx={{ px: 1.25, py: 0.5, borderRadius: 999, bgcolor: "background.paper", fontSize: "0.8125rem", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <Box component="span" sx={{ color: "text.secondary" }}>{field.name} </Box>
                  <Box component="span" sx={{ fontWeight: 700 }}>{value}</Box>
                </Box>
              ))}
            </Box>
          )}
          {log.notes && (
            <NoteText notes={log.notes} notesClean={log.notesClean} logId={log.id} signals={log.signals} variant="card" />
          )}
        </Box>
      );
    })}
    {logs.length === 0 && (
      <Typography sx={{ py: 4, textAlign: "center" }} color="text.secondary">Aucun journal trouvé.</Typography>
    )}
  </Box>
);

export const LogTable: React.FC<LogTableProps> = ({ logs, activeFields, onEdit, onDelete }) => {
  return (
    <>
    <LogCards logs={logs} activeFields={activeFields} onEdit={onEdit} onDelete={onDelete} />
    <TableContainer sx={{ display: { xs: "none", md: "block" }, overflowX: "auto" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
            {activeFields.map((f) => {
              const isHourly = f.fieldType === FieldType.NUMBER && (f.optionsOrder || []).includes("isHourly");
              return (
                <TableCell key={f.id} sx={{ fontWeight: 700 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {f.name}
                    {isHourly && <AccessTimeIcon sx={{ fontSize: 16, color: "primary.main", opacity: 0.8 }} />}
                  </Box>
                </TableCell>
              );
            })}
            <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id} hover>
              <TableCell>
                <ClientOnlyDate date={log.logDate} />
              </TableCell>
              {activeFields.map((field) => (
                <TableCell key={field.id}>{getDisplayValue(log, field)}</TableCell>
              ))}
              <TableCell>
                <NoteText notes={log.notes} notesClean={log.notesClean} logId={log.id} signals={log.signals} variant="cell" />
              </TableCell>
              <TableCell align="right">
                <IconButton size="small" onClick={() => onEdit(log)} color="primary" aria-label={`Modifier le journal du ${new Date(log.logDate).toLocaleDateString("fr-FR")}`}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => onDelete(log.id)} color="error" aria-label={`Supprimer le journal du ${new Date(log.logDate).toLocaleDateString("fr-FR")}`}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {logs.length === 0 && (
            <TableRow>
              <TableCell colSpan={activeFields.length + 3} align="center">
                <Typography sx={{ py: 4 }} color="text.secondary">Aucun journal trouvé.</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
    </>
  );
};
