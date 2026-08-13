import {
  AutoAwesome,
  Description,
  UploadFile,
} from "@mui/icons-material";

import {
  Box,
  Paper,
  Typography,
} from "@mui/material";

import UploadCard from "@/components/upload/UploadCard";

const steps = [
  {
    number: "1",
    title: "Envie o PDF",
    description:
      "Holerite ou cartão de ponto, um arquivo por vez.",
  },
  {
    number: "2",
    title: "Extração automática",
    description:
      "Os campos são identificados e estruturados.",
  },
  {
    number: "3",
    title: "Revise e exporte",
    description:
      "Ajuste o que for necessário e baixe o Excel.",
  },
];

export default function Home() {
  return (
    <Box className="qf-page">
      {/* HEADER */}
      <header className="qf-header">
        <Box className="qf-container">
          <Box className="qf-header-inner">
            <Box className="qf-brand">
              <Box className="qf-brand-icon">
                <Description />
              </Box>

              <Box>
                <div className="qf-brand-name">
                  Quick Filler
                </div>

                <div className="qf-brand-tagline">
                  Extração documental
                </div>
              </Box>
            </Box>

            <span className="qf-badge qf-badge-muted">
              <AutoAwesome
                sx={{
                  fontSize: 15,
                  mr: 0.5,
                }}
              />
              Extração assistida por IA
            </span>
          </Box>
        </Box>
      </header>

      {/* ÁREA PRINCIPAL */}
      <main>
        <Box className="qf-container">
          <Box
            className="qf-grid-upload"
            sx={{
              paddingTop: {
                xs: "2rem",
                md: "4rem",
              },
              paddingBottom: {
                xs: "2rem",
                md: "4rem",
              },
            }}
          >
            {/* COLUNA PRINCIPAL */}
            <Box>
              <div className="qf-text-section-title qf-font-semibold qf-tracking-wider qf-uppercase qf-text-brand">
                Novo processamento
              </div>

              <Typography
  component="h1"
  className="qf-text-page-title qf-font-bold qf-text-foreground"
  sx={{
    marginTop: "0.75rem",
    fontSize: {
      xs: "1.95rem",
      md: "1.95rem",
    },
    lineHeight: 1.12,
    letterSpacing: "-0.035em",
    maxWidth: "900px",
  }}
>
  Envie um documento para extrair os dados
</Typography>

              <Typography
                className="qf-text-base qf-text-muted qf-leading-relaxed"
                sx={{
                  marginTop: "1rem",
                  maxWidth: "760px",
                }}
              >
                Faça upload do PDF, escolha o tipo de
                documento e o Quick Filler estrutura as
                informações para revisão antes da exportação.
              </Typography>

              {/* CARD DE UPLOAD */}
              <Box
                sx={{
                  marginTop: "2rem",
                  width: "100%",
                  maxWidth: "850px",
                }}
              >
                <UploadCard />
              </Box>
            </Box>

            {/* COLUNA LATERAL */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              {/* COMO FUNCIONA */}
              <Paper
                elevation={0}
                className="qf-card qf-card-padding"
              >
                <div className="qf-text-section-title qf-font-semibold qf-tracking-wider qf-uppercase qf-text-brand">
                  Como funciona
                </div>

                <Box
                  component="ol"
                  className="qf-stepper"
                  sx={{
                    marginTop: "0.75rem",
                  }}
                >
                  {steps.map((step) => (
                    <li
                      key={step.number}
                      className="qf-stepper-item"
                    >
                      <span className="qf-stepper-number qf-stepper-number-active">
                        {step.number}
                      </span>

                      <Box>
                        <div className="qf-stepper-label qf-stepper-label-active">
                          {step.title}
                        </div>

                        <div className="qf-text-sm qf-text-muted qf-leading-relaxed">
                          {step.description}
                        </div>
                      </Box>
                    </li>
                  ))}
                </Box>
              </Paper>

              {/* FORMATOS */}
              <Paper
                elevation={0}
                className="qf-card qf-card-padding"
              >
                <div className="qf-font-semibold qf-text-foreground">
                  Formatos suportados
                </div>

                <Typography
                  className="qf-text-sm qf-text-muted qf-leading-relaxed"
                  sx={{
                    marginTop: "0.5rem",
                  }}
                >
                  PDFs nativos e digitalizados. Documentos
                  escaneados com boa legibilidade têm maior
                  precisão na extração.
                </Typography>

                <Box
                  className="qf-flex qf-items-center qf-gap-2"
                  sx={{
                    marginTop: "1rem",
                  }}
                >
                  <span className="qf-badge qf-badge-muted">
                    <UploadFile
                      sx={{
                        fontSize: 14,
                        mr: 0.5,
                      }}
                    />
                    PDF
                  </span>

                  <span className="qf-badge qf-badge-soft">
                    IA
                  </span>
                </Box>
              </Paper>
            </Box>
          </Box>
        </Box>
      </main>
    </Box>
  );
}