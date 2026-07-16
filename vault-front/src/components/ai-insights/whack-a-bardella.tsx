import React from "react";
import { Box, Typography } from "@mui/material";

export const WhackABardella = () => {
  const [score, setScore] = React.useState(0);
  const [activeMole, setActiveMole] = React.useState<{ index: number, type: 'bardella' | 'macron' | 'melenchon' | 'attal' } | null>(null);

  React.useEffect(() => {
    // La vitesse augmente (le délai diminue) au fur et à mesure que le score monte
    const speed = Math.max(350, 700 - score * 15);
    
    const interval = setInterval(() => {
      const rand = Math.random();
      let type: 'bardella' | 'macron' | 'melenchon' | 'attal' = 'bardella';
      
      if (rand < 0.15) {
        type = 'macron';
      } else if (rand < 0.25) {
        type = 'melenchon';
      } else if (rand < 0.35) {
        type = 'attal';
      }

      setActiveMole({
        index: Math.floor(Math.random() * 9),
        type
      });
    }, speed);
    
    return () => clearInterval(interval);
  }, [score]);

  const getMessage = () => {
    if (score >= 40) return " Vous êtes le nouveau Premier Ministre ! 👑";
    if (score >= 30) return " Cohabitation difficile... 🥊";
    if (score >= 15) return " Dissolution en cours... 🌪️";
    if (score >= 5) return " La République vous remercie ! 🇫🇷";
    return "";
  };

  const getImageUrl = (type: string) => {
    switch (type) {
      case 'bardella': return "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Jordan_Bardella_2022.jpg/400px-Jordan_Bardella_2022.jpg";
      case 'macron': return "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Emmanuel_Macron_in_2023.jpg/400px-Emmanuel_Macron_in_2023.jpg";
      case 'melenchon': return "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Jean-Luc_M%C3%A9lenchon_2022.jpg/400px-Jean-Luc_M%C3%A9lenchon_2022.jpg";
      case 'attal': return "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Gabriel_Attal_2024_%28cropped%29.jpg/400px-Gabriel_Attal_2024_%28cropped%29.jpg";
      default: return "";
    }
  };

  return (
    <Box sx={{ mt: 1, p: 1.5, bgcolor: "#f1f5f9", borderRadius: 2, textAlign: "center", userSelect: "none" }}>
      <Typography variant="caption" sx={{ fontWeight: 800, mb: 1, display: "block", color: "primary.main" }}>
        Mini-jeu politique pour patienter 🕹️
      </Typography>
      <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
        Tapez sur Bardella, <strong>évitez les autres !</strong>
      </Typography>
      <Typography variant="caption" sx={{ mb: 1.5, display: "block", color: "text.secondary" }}>
        Score : <strong>{score}</strong>
        <span style={{ color: score >= 5 ? "#e11d48" : "inherit", fontWeight: score >= 5 ? "bold" : "normal" }}>
          {getMessage()}
        </span>
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, maxWidth: 180, mx: "auto" }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Box
            key={i}
            onClick={() => {
              if (activeMole?.index === i) {
                if (activeMole.type === 'bardella') {
                  setScore(s => s + 1);
                } else {
                  // Piège ! On perd 3 points
                  setScore(s => Math.max(0, s - 3));
                }
                setActiveMole(null);
              }
            }}
            sx={{
              height: 52,
              bgcolor: "white",
              borderRadius: 1,
              border: "1px solid #cbd5e1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: activeMole?.index === i ? "pointer" : "default",
              fontSize: "1.5rem",
              transition: "transform 0.05s",
              boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.05)",
              touchAction: "manipulation",
              "&:active": {
                transform: activeMole?.index === i ? "scale(0.85)" : "none",
                boxShadow: "none",
              }
            }}
          >
            {activeMole?.index === i ? (
              <img 
                src={getImageUrl(activeMole.type)}
                alt={activeMole.type} 
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "3px", pointerEvents: "none" }} 
              />
            ) : ""}
          </Box>
        ))}
      </Box>
    </Box>
  );
};
