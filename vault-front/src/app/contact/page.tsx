"use client";

import React from "react";
import { Container, Typography, Box, Paper, Button, TextField, Grid } from "@mui/material";
import { Navbar } from "@/components/organisms/navbar/navbar";
import { Footer } from "@/components/organisms/footer/footer";
import EmailIcon from "@mui/icons-material/Email";

export default function ContactPage() {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "#fcfaf8" }}>
      <Navbar />
      
      <Container maxWidth="md" sx={{ py: 12 }}>
        <Paper elevation={0} sx={{ p: { xs: 4, md: 8 }, borderRadius: 6, border: "1px solid #e5e7eb" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
            <EmailIcon color="primary" sx={{ fontSize: 40 }} />
            <Typography variant="h3" component="h1" sx={{ fontWeight: 800 }}>
              Contact
            </Typography>
          </Box>
          
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: "1.1rem", mb: 6 }}>
            Une question sur la sécurité de vos données ? Un problème technique ? 
            Notre équipe est à votre écoute.
          </Typography>

          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Nom" variant="outlined" sx={{ mb: 3 }} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Email" variant="outlined" sx={{ mb: 3 }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField 
                fullWidth 
                label="Message" 
                multiline 
                rows={4} 
                variant="outlined" 
                sx={{ mb: 4 }} 
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button 
                variant="contained" 
                size="large" 
                fullWidth 
                sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}
              >
                Envoyer le message
              </Button>
            </Grid>
          </Grid>

          <Box sx={{ mt: 8, pt: 4, borderTop: "1px solid #f3f4f6", textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Vous pouvez aussi nous contacter directement à : 
              <br />
              <strong style={{ color: "#3b82f6" }}>support@vault-mind.cyrus-ag.com</strong>
            </Typography>
          </Box>
        </Paper>
      </Container>

      <Footer />
    </Box>
  );
}
