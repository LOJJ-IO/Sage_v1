export type ToastVariant = "success" | "error" | "info" | "progress";

export type ToastRecord = {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  sticky: boolean;
  progress?: number;
};

export type ToastInput = {
  title: string;
  description?: string;
  progress?: number;
};
