import { useContext } from "react";
import { ToastContext } from "../context/toastContext";

/**
 * Transient feedback for user actions.
 *
 *   const toast = useToast();
 *   toast.success("Booking cancelled.");
 *   toast.error("We couldn't cancel that booking.");
 *
 * @throws when used outside <ToastProvider>, which is a wiring mistake.
 */
export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside a <ToastProvider>.");
  }

  return context;
}

export default useToast;
