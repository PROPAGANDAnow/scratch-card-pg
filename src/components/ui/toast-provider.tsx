"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Toast } from "./toast";

interface ToastMessage {
  id: string;
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: "success" | "error" | "info", duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type?: "success" | "error" | "info", duration?: number) => {
    const id = Date.now().toString();
    const newToast: ToastMessage = { id, message, type, duration };

    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="flex flex-col items-center gap-2 p-4">
          {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto">
              <Toast
                message={toast.message}
                type={toast.type}
                duration={toast.duration}
                onClose={() => removeToast(toast.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}