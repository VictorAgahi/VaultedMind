"use client";

import { Container, Typography, Box, Paper, Breadcrumbs, Link as MuiLink, Grid, TextField, Button, Card, CardContent } from "@mui/material";
import Link from "next/link";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import EmailIcon from "@mui/icons-material/Email";
import LanguageIcon from "@mui/icons-material/Language";
import GitHubIcon from "@mui/icons-material/GitHub";

export default function ContactClient() {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: 4 }}
      >
        <MuiLink component={Link} href="/" color="inherit" underline="hover">
          Accueil
        </MuiLink>
        <Typography color="text.primary">Contact</Typography>
      </Breadcrumbs>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 900, mb: 3, color: "primary.main" }}>
            Parlons ensemble.
          </Typography>
          <Typography variant="body1" color="text.primary" sx={{ mb: 6, fontSize: "1.1rem" }}>
            Vous avez une question, un retour d&apos;expérience ou besoin d&apos;aide ? Notre équipe est là pour vous accompagner dans votre parcours de bien-être.
          </Typography>

          <Card elevation={0} sx={{ borderRadius: 4, bgcolor: "background.paper", border: "1px solid", borderColor: "primary.main", mb: 3 }}>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 3, p: 3 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "primary.main", color: "white" }}>
                <EmailIcon />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.primary" sx={{ opacity: 0.7 }}>Email</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "text.primary" }}>support@vaultedmind.com</Typography>
              </Box>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ borderRadius: 4, bgcolor: "background.paper", border: "1px solid", borderColor: "primary.main", mb: 3 }}>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 3, p: 3 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "primary.main", color: "white" }}>
                <LanguageIcon />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.primary" sx={{ opacity: 0.7 }}>Web</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "text.primary" }}>www.vaultedmind.com</Typography>
              </Box>
            </CardContent>
          </Card>

          <MuiLink href="https://github.com/VictorAgahi/VaultedMind" target="_blank" rel="noopener noreferrer" sx={{ textDecoration: "none", color: "inherit" }}>
            <Card elevation={0} sx={{ borderRadius: 4, bgcolor: "background.paper", border: "1px solid", borderColor: "primary.main", transition: "all 0.2s", '&:hover': { bgcolor: "rgba(216, 24, 50, 0.05)" } }}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 3, p: 3 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "primary.main", color: "white" }}>
                  <GitHubIcon />
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.primary" sx={{ opacity: 0.7 }}>Open Source</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "text.primary" }}>GitHub Repository</Typography>
                </Box>
              </CardContent>
            </Card>
          </MuiLink>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Paper elevation={0} sx={{ p: { xs: 3, md: 6 }, borderRadius: 6, bgcolor: "background.paper", border: "1px solid", borderColor: "primary.main" }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 4, color: "text.primary" }}>Envoyez-nous un message</Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Nom" variant="outlined" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Email" variant="outlined" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Sujet" variant="outlined" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Message" multiline rows={5} variant="outlined" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Button fullWidth variant="contained" size="large" sx={{ py: 2, borderRadius: 2, fontWeight: 700 }}>
                  Envoyer le message
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
