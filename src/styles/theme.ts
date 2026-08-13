import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#173772",
    },
    secondary: {
      main: "#1976d2",
    },
    background: {
      default: "#f5f7fa",
    },
  },

  shape: {
    borderRadius: 10,
  },

  typography: {
    fontFamily: "Inter, sans-serif",
  },
});

export default theme;