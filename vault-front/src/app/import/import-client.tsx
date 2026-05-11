"use client";

import React from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Grid,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { Navbar } from "@/components/navbar/navbar";
import { apiService } from "@/services/api.service";
import { AppError, BulkImportDto, BulkImportResponseDto, BulkRowDto } from "@/types";
import { parseCSV } from "@/utils/csv-parser";
import { ImportPreview } from "./import-preview";

interface ImportState {
  loading: boolean;
  parsing: boolean;
  error: string | null;
  success: BulkImportResponseDto | null;
  parsedRows: BulkRowDto[];
  fileName: string;
  dragActive: boolean;
}

type ImportAction =
  | { type: "START_PARSING"; fileName: string }
  | { type: "PARSING_SUCCESS"; rows: BulkRowDto[] }
  | { type: "PARSING_ERROR"; error: string }
  | { type: "START_IMPORT" }
  | { type: "IMPORT_SUCCESS"; result: BulkImportResponseDto }
  | { type: "IMPORT_ERROR"; error: string }
  | { type: "RESET_PREVIEW" }
  | { type: "SET_DRAG"; active: boolean };

const importReducer = (state: ImportState, action: ImportAction): ImportState => {
  switch (action.type) {
    case "START_PARSING": return { ...state, parsing: true, fileName: action.fileName, error: null, success: null };
    case "PARSING_SUCCESS": return { ...state, parsing: false, parsedRows: action.rows };
    case "PARSING_ERROR": return { ...state, parsing: false, error: action.error, parsedRows: [] };
    case "START_IMPORT": return { ...state, loading: true, error: null };
    case "IMPORT_SUCCESS": return { ...state, loading: false, success: action.result, parsedRows: [], fileName: "" };
    case "IMPORT_ERROR": return { ...state, loading: false, error: action.error };
    case "RESET_PREVIEW": return { ...state, parsedRows: [], fileName: "" };
    case "SET_DRAG": return { ...state, dragActive: action.active };
    default: return state;
  }
};

export default function ImportPage() {
  const [state, dispatch] = React.useReducer(importReducer, {
    loading: false,
    parsing: false,
    error: null,
    success: null,
    parsedRows: [],
    fileName: "",
    dragActive: false,
  });

  const { loading, parsing, error, success, parsedRows, fileName, dragActive } = state;

  const processFile = async (file: File) => {
    dispatch({ type: "START_PARSING", fileName: file.name });
    try {
      const content = await file.text();
      const rows = parseCSV(content);
      if (rows.length === 0) {
        dispatch({ type: "PARSING_ERROR", error: "❌ Aucune ligne valide trouvée." });
      } else {
        dispatch({ type: "PARSING_SUCCESS", rows });
      }
    } catch (err) {
      dispatch({ type: "PARSING_ERROR", error: `❌ Erreur : ${(err as Error).message}` });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleImport = async () => {
    if (!parsedRows.length) return;
    dispatch({ type: "START_IMPORT" });
    try {
      const result = await apiService.post<BulkImportResponseDto, BulkImportDto>("/health/import", { rows: parsedRows });
      dispatch({ type: "IMPORT_SUCCESS", result });
      window.dispatchEvent(new CustomEvent("vaultedmind:logs-imported", { detail: { logsCreated: result.logsCreated } }));
    } catch (err: unknown) {
      const error = err as AppError;
      dispatch({ type: "IMPORT_ERROR", error: `❌ Échec : ${error.message || "Erreur inconnue"}` });
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#ede5d9" }}>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ mb: 6 }}>
          <Typography variant="h3" sx={{ fontWeight: 800 }}>Importer des données</Typography>
          <Typography variant="h6" color="text.secondary">Gérez vos journaux en masse.</Typography>
        </Box>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12 }}>
            <Paper
              onDragOver={(e) => { e.preventDefault(); dispatch({ type: "SET_DRAG", active: true }); }}
              onDragLeave={() => dispatch({ type: "SET_DRAG", active: false })}
              onDrop={(e) => { e.preventDefault(); dispatch({ type: "SET_DRAG", active: false }); const f = e.dataTransfer.files?.[0]; if (f) processFile(f); }}
              sx={{ p: 4, borderRadius: 4, border: "2px dashed", borderColor: dragActive ? "#3b82f6" : "transparent", bgcolor: dragActive ? "#eff6ff" : "transparent", textAlign: "center", cursor: "pointer" }}
            >
              <CloudUploadIcon sx={{ fontSize: 48, color: "#3b82f6", mb: 2 }} />
              <Typography variant="h6">{parsing ? "Analyse..." : "Déposez votre CSV"}</Typography>
              <Button variant="contained" component="label" sx={{ mt: 2 }}>
                Choisir un fichier
                <input type="file" hidden accept=".csv,.tsv,.txt" onChange={handleFileChange} />
              </Button>
              {fileName && <Typography sx={{ mt: 1, color: "success.main" }}>✓ {fileName}</Typography>}
            </Paper>
          </Grid>
          {error && <Grid size={{ xs: 12 }}><Alert severity="error">{error}</Alert></Grid>}
          {success && <Grid size={{ xs: 12 }}><Alert severity="success">Importation réussie : {success.logsCreated} journaux créés.</Alert></Grid>}
          {parsedRows.length > 0 && !success && (
            <>
              <Grid size={{ xs: 12 }}><ImportPreview rows={parsedRows} /></Grid>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Button variant="contained" onClick={handleImport} disabled={loading} sx={{ bgcolor: "#059669" }}>{loading ? <CircularProgress size={24} /> : "Importer"}</Button>
                  <Button variant="outlined" onClick={() => dispatch({ type: "RESET_PREVIEW" })}>Annuler</Button>
                </Box>
              </Grid>
            </>
          )}
        </Grid>
      </Container>
    </Box>
  );
}
