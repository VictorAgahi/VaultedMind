"use client";

import { createTheme, ThemeOptions } from "@mui/material/styles";

const themeOptions: ThemeOptions = {
  palette: {
    primary: {
      main: "#d81832",
      dark: "#c2152a",
      light: "#e63a4f",
      contrastText: "#fff",
    },
    secondary: {
      main: "#d81832",
      dark: "#c2152a",
      light: "#e63a4f",
    },
    background: {
      default: "#ede5d9",
      paper: "#ede5d9",
    },
    divider: "#d81832",
    text: {
      primary: "#142949",
      secondary: "#4b5563",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 800,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 700,
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          padding: "8px 20px",
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        fullWidth: true,
        margin: "normal",
      },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderColor: "#d81832",
            },
            "&:hover fieldset": {
              borderColor: "#d81832",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#d81832",
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: "#ede5d9",
          borderColor: "#d81832",
          border: "1px solid #d81832",
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          border: "none",
          borderRadius: "8px",
          backgroundColor: "#ede5d9",
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          backgroundColor: "#ede5d9",
          "& thead th": {
            borderColor: "#d81832",
            backgroundColor: "#ede5d9",
            fontWeight: 700,
          },
          "& tbody tr": {
            borderColor: "#d81832",
            backgroundColor: "#ede5d9",
            "&:hover": {
              backgroundColor: "#ede5d9",
            },
          },
          "& tbody td": {
            borderBottom: "1px solid rgba(216, 24, 50, 0.2)",
            backgroundColor: "#ede5d9",
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: "rgba(216, 24, 50, 0.2)",
          backgroundColor: "#ede5d9",
        },
        head: {
          backgroundColor: "#ede5d9",
          borderColor: "#d81832",
          borderBottomWidth: "2px",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "& fieldset": {
            borderColor: "#d81832",
          },
          "&:hover fieldset": {
            borderColor: "#d81832",
          },
          "&.Mui-focused fieldset": {
            borderColor: "#d81832",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: "#ede5d9",
          borderColor: "#d81832",
          border: "1px solid #d81832",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: "#ede5d9",
        },
      },
    },
  },
};

export const theme = createTheme(themeOptions);
