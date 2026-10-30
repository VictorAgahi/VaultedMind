"use client";

import React from "react";
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Button
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { apiService } from "@/services/api.service";
import { SubFieldDefinition } from "@/types";

export interface ChatSuggestedAction {
  type: "CREATE_FIELD" | "DEACTIVATE_FIELD" | "UPDATE_CATEGORY";
  id?: string;
  name: string;
  fieldType?: string;
  category?: string;
  options?: string[];
  subFields?: SubFieldDefinition[];
  reason?: string;
}

export function ChatSuggestedActionsList({ actions }: { actions: ChatSuggestedAction[] }) {
  const [completed, setCompleted] = React.useState<string[]>([]);
  const [selectedAction, setSelectedAction] = React.useState<{ action: ChatSuggestedAction, idx: number, editedOptions?: string[] } | null>(null);
  
  const handleApply = async (action: ChatSuggestedAction, idx: number, editedOptions?: string[]) => {
    try {
      if (action.type === "CREATE_FIELD") {
        let cleanFieldType = (action.fieldType || "STRING").toUpperCase();
        if (cleanFieldType === "TEXT") cleanFieldType = "STRING";
        if (!["STRING", "NUMBER", "BOOLEAN", "DATE"].includes(cleanFieldType)) {
          cleanFieldType = "STRING";
        }
        
        await apiService.post("/health/custom-fields", {
          name: action.name,
          fieldType: cleanFieldType,
          category: action.category || "Général",
          optionsOrder: editedOptions !== undefined ? editedOptions : action.options,
          subFields: action.subFields,
          rememberLastValue: true,
        });
      } else if (action.type === "DEACTIVATE_FIELD" && action.id) {
        await apiService.patch(`/health/custom-fields/${action.id}`, {
          isActive: false,
        });
      } else if (action.type === "UPDATE_CATEGORY" && action.id) {
        await apiService.patch(`/health/custom-fields/${action.id}`, {
          category: action.category,
        });
      }
      setCompleted(prev => [...prev, String(idx)]);
      setSelectedAction(null);
      window.dispatchEvent(new CustomEvent("custom-fields-updated"));
    } catch (e) {
      console.error("Failed to apply AI action:", e);
      alert("Erreur lors de l'application de l'action.");
    }
  };

  if (!actions || actions.length === 0) return null;

  return (
    <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
         Actions suggérées ({actions.length - completed.length})
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {actions.map((action, idx) => {
          const isDone = completed.includes(String(idx));
          if (isDone) return null;
          
          let label = action.name;
          if (action.type === "DEACTIVATE_FIELD") label = `Désactiver ${action.name}`;
          
          return (
            <Chip
              key={idx}
              label={label}
              onClick={() => setSelectedAction({ action, idx, editedOptions: action.options ? [...action.options] : undefined })}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 500, bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.05)', borderColor: 'primary.main' }}
            />
          );
        })}
      </Box>

      <Dialog 
        open={Boolean(selectedAction)} 
        onClose={() => setSelectedAction(null)}
        maxWidth="sm"
        fullWidth
        sx={{ "& .MuiDialog-paper": { borderRadius: 3 } }}
      >
        {selectedAction && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              {selectedAction.action.type === "CREATE_FIELD" && "Créer un nouveau champ"}
              {selectedAction.action.type === "DEACTIVATE_FIELD" && "Désactiver le champ"}
              {selectedAction.action.type === "UPDATE_CATEGORY" && "Mettre à jour la catégorie"}
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                {selectedAction.action.name}
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {selectedAction.action.type === "CREATE_FIELD" && (
                  <>
                    <Typography variant="body2">
                      <strong>Type :</strong> {selectedAction.action.fieldType}
                    </Typography>
                    {selectedAction.editedOptions && selectedAction.editedOptions.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Options suggérées (cliquez pour retirer) :</strong>
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {selectedAction.editedOptions.map((opt, i) => (
                            <Chip 
                              key={i} 
                              label={opt} 
                              onDelete={() => {
                                setSelectedAction(prev => {
                                  if (!prev || !prev.editedOptions) return prev;
                                  return { ...prev, editedOptions: prev.editedOptions.filter((_, index) => index !== i) };
                                });
                              }} 
                              color="primary" 
                              variant="outlined"
                              size="small"
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </>
                )}
                {selectedAction.action.category && (
                  <Typography variant="body2">
                    <strong>Catégorie :</strong> {selectedAction.action.category}
                  </Typography>
                )}
                {selectedAction.action.reason && (
                  <Box sx={{ mt: 1, p: 2, bgcolor: 'var(--mui-palette-grey-100)', borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', display: 'block', mb: 0.5 }}>
                      Pourquoi cette suggestion ?
                    </Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                      &quot;{selectedAction.action.reason}&quot;
                    </Typography>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
              <Button onClick={() => setSelectedAction(null)} color="inherit">
                Retour
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => handleApply(selectedAction.action, selectedAction.idx, selectedAction.editedOptions)}
                endIcon={<SendIcon />}
                sx={{ borderRadius: 2, px: 3 }}
              >
                Appliquer
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
