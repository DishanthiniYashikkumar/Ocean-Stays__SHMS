import { useCallback, useMemo, useRef, useState } from "react";
import { ToastContext } from "./toastContext";
import ToastViewport from "../components/common/ToastViewport";

/**
 * Holds the active toasts.
 *
 * Every meaningful action in the app reports its outcome through this rather
 * than through `alert()`, so feedback is consistent and never blocks the page.
 */

const DEFAULT_DURATION = 5000;

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));

    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (message, { tone = "info", duration = DEFAULT_DURATION, title } = {}) => {
      nextId.current += 1;
      const id = nextId.current;

      setToasts((current) => [...current, { id, message, tone, title }]);

      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      }

      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      show,
      dismiss,
      success: (message, options) => show(message, { ...options, tone: "success" }),
      error: (message, options) => show(message, { ...options, tone: "danger", duration: 7000 }),
      info: (message, options) => show(message, { ...options, tone: "info" }),
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export default ToastProvider;
