import React from "react";
import { Box, Typography } from "@mui/material";

export const WhackABardella = () => {
  const [score, setScore] = React.useState(0);
  const [activeMole, setActiveMole] = React.useState<number>(-1);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setActiveMole(Math.floor(Math.random() * 9));
    }, 700);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ mt: 1, p: 1.5, bgcolor: "#f1f5f9", borderRadius: 2, textAlign: "center", userSelect: "none" }}>
      <Typography variant="caption" sx={{ fontWeight: 800, mb: 1, display: "block", color: "primary.main" }}>
        Mini-jeu politique pour patienter 🕹️
      </Typography>
      <Typography variant="caption" sx={{ mb: 1.5, display: "block", color: "text.secondary" }}>
        Tapez sur Bardella ! Score : <strong>{score}</strong>
        {score >= 10 && " (La République vous remercie ! 🇫🇷)"}
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, maxWidth: 180, mx: "auto" }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Box
            key={i}
            onClick={() => {
              if (activeMole === i) {
                setScore(s => s + 1);
                setActiveMole(-1);
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
              cursor: activeMole === i ? "pointer" : "default",
              fontSize: "1.5rem",
              transition: "transform 0.05s",
              boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.05)",
              touchAction: "manipulation",
              "&:active": {
                transform: activeMole === i ? "scale(0.85)" : "none",
                boxShadow: "none",
              }
            }}
          >
            {activeMole === i ? (
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Jordan_Bardella_2022.jpg/400px-Jordan_Bardella_2022.jpg" 
                alt="Bardella" 
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "3px", pointerEvents: "none" }} 
              />
            ) : ""}
          </Box>
        ))}
      </Box>
    </Box>
  );
};
