import { useCallback, useEffect, useState } from "react";

/**
 * Runs an async function and tracks its loading / success / error lifecycle,
 * so every data-driven view handles all four states without repeating itself.
 *
 * The callback MUST be stable — wrap it in useCallback at the call site so the
 * dependencies that should trigger a refetch are explicit:
 *
 *   const load = useCallback(() => getRoomTypes({ sort }), [sort]);
 *   const { data, status, isLoading, error, reload } = useAsync(load);
 *
 * @param {() => Promise<any>} asyncFunction
 * @returns {{
 *   data: any, error: Error|null, status: "loading"|"success"|"error",
 *   isLoading: boolean, isEmpty: boolean, reload: () => void
 * }}
 */
export function useAsync(asyncFunction) {
  const [state, setState] = useState({ status: "loading", data: null, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    asyncFunction()
      .then((data) => {
        if (!cancelled) setState({ status: "success", data, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", data: null, error });
      });

    // A result arriving after the inputs changed must not overwrite a newer one.
    return () => {
      cancelled = true;
    };
  }, [asyncFunction, reloadKey]);

  const reload = useCallback(() => {
    setState({ status: "loading", data: null, error: null });
    setReloadKey((key) => key + 1);
  }, []);

  return {
    ...state,
    isLoading: state.status === "loading",
    isEmpty: state.status === "success" && Array.isArray(state.data) && state.data.length === 0,
    reload,
  };
}

export default useAsync;
