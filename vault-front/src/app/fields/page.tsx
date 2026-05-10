"use client";

import React, { useState, useEffect } from "react";
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  TablePagination,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { Navbar } from "@/components/organisms/navbar/navbar";
import { apiService } from "@/services/api.service";
import { CustomField, FieldType, CreateCustomFieldDto, UpdateCustomFieldDto } from "@/types";

export default function FieldsPage() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentFieldId, setCurrentFieldId] = useState<string | null>(null);

  // Form state
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState<FieldType>(FieldType.STRING);
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const refetchFields = async () => {
    try {
      const data = await apiService.get<CustomField[]>("/health/custom-fields");
      setFields(data);
      setError(null);
    } catch {
      setError("Échec du chargement des champs");
    }
  };

  useEffect(() => {
    const fetchFields = async () => {
      setLoading(true);
      try {
        const data = await apiService.get<CustomField[]>("/health/custom-fields");
        setFields(data);
        setError(null);
      } catch {
        setError("Échec du chargement des champs");
      } finally {
        setLoading(false);
      }
    };

    fetchFields();
  }, []);

  const handleOpenDialog = (field?: CustomField) => {
    if (field) {
      setIsEditing(true);
      setCurrentFieldId(field.id);
      setFieldName(field.name);
      setFieldType(field.fieldType);
    } else {
      setIsEditing(false);
      setCurrentFieldId(null);
      setFieldName("");
      setFieldType(FieldType.STRING);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFieldName("");
    setFieldType(FieldType.STRING);
    setCurrentFieldId(null);
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditing && currentFieldId) {
        const updateDto: UpdateCustomFieldDto = {
          name: fieldName,
        };
        await apiService.patch(`/health/custom-fields/${currentFieldId}`, updateDto);
        setSuccess("Champ mis à jour avec succès !");
      } else {
        const createDto: CreateCustomFieldDto = {
          name: fieldName,
          fieldType: fieldType,
        };
        await apiService.post("/health/custom-fields", createDto);
        setSuccess("Champ créé avec succès !");
      }
      handleCloseDialog();
      refetchFields();
      window.dispatchEvent(new Event("vaultedmind:fields-updated"));
    } catch {
      setError("Échec de l'enregistrement du champ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (field: CustomField) => {
    try {
      const updateDto: UpdateCustomFieldDto = {
        isActive: !field.isActive,
      };
      await apiService.patch(`/health/custom-fields/${field.id}`, updateDto);
      setSuccess(`Champ ${field.isActive ? "désactivé" : "activé"} !`);
      refetchFields();
      window.dispatchEvent(new Event("vaultedmind:fields-updated"));
    } catch {
      setError("Échec de la mise à jour du champ");
    }
  };

  const handleDelete = async (fieldId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce champ ? Cette action est irréversible.")) {
      try {
        await apiService.delete(`/health/custom-fields/${fieldId}`);
        setSuccess("Champ supprimé avec succès !");
        refetchFields();
        window.dispatchEvent(new Event("vaultedmind:fields-updated"));
      } catch {
        setError("Échec de la suppression du champ");
      }
    }
  };

  const visibleFields = fields.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#ede5d9" }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ mb: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 800 }}>
              Champs personnalisés
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Créez et gérez vos propres champs de suivi
            </Typography>
          </div>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: "#059669", "&:hover": { bgcolor: "#047857" } }}
          >
            Nouveau champ
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 4 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 4 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : fields.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Aucun champ personnalisé pour le moment. Créez le premier !
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Créer un champ
            </Button>
          </Paper>
        ) : (
          <Paper sx={{ borderRadius: 4 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#ede5d9" }}>
                    <TableCell sx={{ fontWeight: 700 }}>Nom</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">
                      Actif
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleFields.map((field) => (
                    <TableRow key={field.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{field.name}</TableCell>
                      <TableCell>{field.fieldType}</TableCell>
                      <TableCell align="center">
                        <Switch
                          checked={field.isActive}
                          onChange={() => handleToggleActive(field)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(field)}
                          title="Modifier"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(field.id)}
                          title="Supprimer"
                          sx={{ color: "error.main" }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={fields.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
            />
          </Paper>
        )}
      </Container>

      {/* Create/Edit Field Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
          <DialogTitle>{isEditing ? "Modifier le champ" : "Créer un nouveau champ"}</DialogTitle>
          <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              autoFocus
              label="Nom du champ"
              fullWidth
              variant="outlined"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              placeholder="ex: Humeur, Niveau d'énergie"
              required
            />
            {!isEditing && (
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={fieldType}
                  label="Type"
                  onChange={(e) => setFieldType(e.target.value as FieldType)}
                >
                  <MenuItem value={FieldType.STRING}>Texte</MenuItem>
                  <MenuItem value={FieldType.NUMBER}>Nombre</MenuItem>
                  <MenuItem value={FieldType.BOOLEAN}>Oui/Non</MenuItem>
                  <MenuItem value={FieldType.DATE}>Date</MenuItem>
                </Select>
              </FormControl>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={submitting || !fieldName.trim()}>
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
