"use client";

import React from "react";
import {
  Box,
  Paper,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from "@mui/material";
import { BulkRowDto } from "@/types";

interface ImportPreviewProps {
  rows: BulkRowDto[];
}

export const ImportPreview: React.FC<ImportPreviewProps> = ({ rows }) => {
  return (
    <Paper sx={{ p: 4, borderRadius: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Aperçu ({rows.length} lignes)
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#ede5d9" }}>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Champs</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.slice(0, 10).map((row) => (
              <TableRow key={row.tempId}>
                <TableCell>{row.date}</TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {Object.entries(row.fields).map(([key, val], fIdx) => (
                      <Box
                        key={`${key}-${fIdx}`}
                        sx={{
                          bgcolor: "#e0f2fe",
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: "0.875rem",
                        }}
                      >
                        <strong>{key}:</strong> {val}
                      </Box>
                    ))}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {rows.length > 10 && (
        <Typography variant="caption" sx={{ mt: 2, display: "block" }}>
          ... et {rows.length - 10} lignes supplémentaires
        </Typography>
      )}
    </Paper>
  );
};
