type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastRecord {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  show: (variant: ToastVariant, title: string, description?: string) => void;
  dismiss: (id: string) => void;
}
