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

interface LogTableProps {
  logs: DailyLog[];
  activeFields: CustomField[];
  onEdit: (log: DailyLog) => void;
  onDelete: (id: string) => void;
}

export const LogTable: React.FC<LogTableProps> = ({ logs, activeFields, onEdit, onDelete }) => {
  return (
    <TableContainer>
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
              {activeFields.map((field) => {
                const fieldValue = log.fieldValues?.find((v) => v.customFieldId === field.id);
                let displayValue = "-";
                if (fieldValue) {
                  if (field.fieldType === FieldType.BOOLEAN) {
                    displayValue = fieldValue.value === "true" ? "Oui" : "Non";
                  } else if (field.fieldType === FieldType.NUMBER && (field.optionsOrder || []).includes("isHourly")) {
                    displayValue = formatHourlyValue(fieldValue.value);
                  } else {
                    displayValue = fieldValue.value;
                  }
                }
                return <TableCell key={field.id}>{displayValue}</TableCell>;
              })}
              <TableCell>
                <Typography variant="body2" sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {log.notes || "-"}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <IconButton size="small" onClick={() => onEdit(log)} color="primary">
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => onDelete(log.id)} color="error">
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
  );
};
