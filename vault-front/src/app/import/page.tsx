"use client";

import React, { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { Navbar } from "@/components/organisms/navbar/navbar";
import { apiService } from "@/services/api.service";
import { BulkImportDto, BulkImportResponseDto, BulkRowDto } from "@/types";

const FRENCH_MONTHS: Record<string, number> = {
  janvier: 0,
  février: 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  août: 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  décembre: 11,
};

function parseDate(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;

  const trimmed = dateStr.trim().toLowerCase();
  const parts = trimmed.split(/\s+/);

  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const month = FRENCH_MONTHS[parts[1]];
    const year = parseInt(parts[2], 10);

    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }

  return null;
}

function isValidTextFile(content: string): boolean {
  // Check for binary file signatures
  if (content.startsWith("PK") || content.startsWith("\0")) {
    return false;
  }
  // Check if content has mostly printable characters
  const printableChars = (content.match(/[\x20-\x7E\t\n\r]/g) || []).length;
  return printableChars / content.length > 0.8;
}

function detectDelimiter(headerLine: string): string {
  const tabCount = (headerLine.match(/\t/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;

  const max = Math.max(tabCount, commaCount, semicolonCount);
  if (max === 0) {
    return ","; // default to comma if no delimiters found
  }
  if (tabCount === max) return "\t";
  if (semicolonCount === max) return ";";
  return ",";
}

function cleanColumnName(value: string): string {
  return value
    .replace(/^["']|["']$/g, "") // Remove quotes
    .trim(); // Remove all leading/trailing whitespace
}

function parseCSV(content: string): BulkRowDto[] {
  if (!isValidTextFile(content)) {
    throw new Error(
      'Invalid file format. Please export your spreadsheet as a CSV or TSV file. From Numbers: File → Export → CSV or Excel format'
    );
  }

  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV file is empty or has only headers');
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0]
    .split(delimiter)
    .map((h) => cleanColumnName(h.trim()))
    .filter((h) => h);

  if (headers.length === 0) {
    throw new Error(
      `Could not parse file headers. Make sure the file uses ${delimiter === "\t" ? "tab" : "comma"} as delimiter`
    );
  }

  const dateColumnIndex = headers.findIndex(
    (h) => h.toLowerCase() === "date"
  );

  if (dateColumnIndex === -1) {
    throw new Error(
      `CSV must have a "Date" column. Found columns: ${headers.join(", ")}`
    );
  }

  const rows: BulkRowDto[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(delimiter).map((v) => cleanColumnName(v.trim()));
    const dateStr = values[dateColumnIndex] || "";
    const parsedDate = parseDate(dateStr);

    if (!parsedDate) {
      continue;
    }

    const fields: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (index !== dateColumnIndex && header !== "") {
        const value = values[index] || "";
        if (value && value.trim()) {
          fields[header] = value;
        }
      }
    });

    rows.push({
      date: parsedDate.toISOString().split("T")[0],
      fields,
    });
  }

  return rows;
}

export default function ImportPage() {
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<BulkImportResponseDto | null>(null);
  const [parsedRows, setParsedRows] = useState<BulkRowDto[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [parseSuccess, setParseSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const processFile = async (file: File) => {
    setParsing(true);
    try {
      setError(null);
      setSuccess(null);
      setParseSuccess(false);
      setFileName(file.name);
      const content = await file.text();
      const rows = parseCSV(content);

      if (rows.length === 0) {
        setParsing(false);
        setError("❌ No valid rows found in the CSV file. Check that dates are in format: 'day month year' (e.g., '8 mai 2026')");
        setParsedRows([]);
        return;
      }

      setParsedRows(rows);
      setParseSuccess(true);
      setParsing(false);
    } catch (err) {
      setParsing(false);
      setError(`❌ Error parsing file: ${(err as Error).message}`);
      setParsedRows([]);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) {
      setError("❌ No rows to import");
      return;
    }

    setLoading(true);
    setParseSuccess(false);
    try {
      const dto: BulkImportDto = { rows: parsedRows };
      console.log("Sending import data:", JSON.stringify(dto, null, 2));

      const result = await apiService.post<BulkImportResponseDto, BulkImportDto>(
        "/health/import",
        dto
      );
      console.log("✅ Import successful:", result);
      setSuccess(result);
      setParsedRows([]);
      setFileName("");
      setError(null);

      // Notify other components that logs have been imported
      console.log("📢 Dispatching logs-imported event...");
      window.dispatchEvent(
        new CustomEvent("vaultedmind:logs-imported", {
          detail: { logsCreated: result.logsCreated },
        })
      );
    } catch (err) {
      const errorObj = err as Record<string, unknown>;
      let errorMsg = "Unknown error";

      if (errorObj.message) {
        if (Array.isArray(errorObj.message)) {
          errorMsg = errorObj.message.join(", ");
        } else {
          errorMsg = String(errorObj.message);
        }
      }

      console.error("Import error details:", errorObj);
      setError(`❌ Import failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#ede5d9" }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ mb: 6 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 800 }}>
            Import Data
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Upload a CSV or TSV file to bulk import daily logs and create custom fields.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {/* Upload Section */}
          <Grid size={{ xs: 12 }}>
            <Paper
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              sx={{
                p: 4,
                borderRadius: 4,
                border: "2px dashed",
                borderColor: dragActive ? "#3b82f6" : "transparent",
                bgcolor: dragActive ? "#eff6ff" : "transparent",
                transition: "all 0.3s ease",
                cursor: "pointer",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  py: 4,
                }}
              >
                {parsing ? (
                  <>
                    <CircularProgress size={48} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Parsing file...
                    </Typography>
                  </>
                ) : (
                  <>
                    <CloudUploadIcon
                      sx={{
                        fontSize: 48,
                        color: dragActive ? "#1e40af" : "#3b82f6",
                        transition: "color 0.3s ease",
                      }}
                    />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {dragActive ? "Drop your file here" : "Upload CSV or TSV File"}
                    </Typography>
                  </>
                )}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: "center", maxWidth: 400 }}
                >
                  Drag and drop your file or click to browse. The file must have a &quot;Date&quot;
                  column (e.g., &quot;8 mai 2026&quot;).
                </Typography>
                <Button
                  variant="contained"
                  component="label"
                  disabled={parsing}
                  sx={{ mt: 2 }}
                >
                  {parsing ? "Parsing..." : "Choose File"}
                  <input
                    type="file"
                    hidden
                    accept=".csv,.tsv,.txt"
                    onChange={handleFileChange}
                    disabled={parsing}
                  />
                </Button>
                {parsing && (
                  <Typography variant="body2" sx={{ color: "#3b82f6", fontWeight: 500 }}>
                    Reading and validating...
                  </Typography>
                )}
                {fileName && !parsing && (
                  <Typography variant="body2" sx={{ color: "#059669", fontWeight: 500 }}>
                    ✓ {fileName}
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Error Alert */}
          {error && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="error" sx={{ fontSize: "1rem" }}>
                {error}
              </Alert>
            </Grid>
          )}

          {/* Parse Success Alert */}
          {parseSuccess && !success && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="success" sx={{ fontSize: "1rem" }}>
                ✓ File parsed successfully! {parsedRows.length} valid rows ready to import.
              </Alert>
            </Grid>
          )}

          {/* Import Success Alert */}
          {success && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="success" sx={{ fontSize: "1rem" }}>
                ✓ Import successful! Created {success.logsCreated} logs,{" "}
                {success.fieldsCreated} fields, and {success.valuesCreated} values.
              </Alert>
            </Grid>
          )}

          {/* Preview Section */}
          {parsedRows.length > 0 && !success && (
            <>
              <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 4, borderRadius: 4 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    Preview ({parsedRows.length} rows)
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "#ede5d9" }}>
                          <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Fields</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {parsedRows.slice(0, 10).map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{row.date}</TableCell>
                            <TableCell>
                              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                                {Object.entries(row.fields).map(([key, val]) => (
                                  <Box
                                    key={key}
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
                  {parsedRows.length > 10 && (
                    <Typography variant="caption" sx={{ mt: 2, display: "block" }}>
                      ... and {parsedRows.length - 10} more rows
                    </Typography>
                  )}
                </Paper>
              </Grid>

              {/* Import Button */}
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleImport}
                    disabled={loading}
                    sx={{
                      bgcolor: "#059669",
                      "&:hover": { bgcolor: "#047857" },
                    }}
                  >
                    {loading ? <CircularProgress size={24} /> : "Import"}
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => {
                      setParsedRows([]);
                      setFileName("");
                      setError(null);
                      setParseSuccess(false);
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </Box>
              </Grid>
            </>
          )}
        </Grid>
      </Container>
    </Box>
  );
}
