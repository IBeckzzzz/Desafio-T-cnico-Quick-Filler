export enum DocumentType {
  PAYSLIP = "holerite",
  TIMESHEET = "cartao-ponto",
}

export interface UploadForm {
  file: File | null;
  type: DocumentType;
}