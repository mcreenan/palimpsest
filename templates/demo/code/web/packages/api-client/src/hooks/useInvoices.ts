import { useEffect, useState } from "react";
import { api, type Invoice } from "../client";

/**
 * Representative hook — the pattern every endpoint follows: call the typed
 * client, expose `{ data, isLoading, error }`. The other hooks (useMembers,
 * useOrgSearch) mirror this shape and are elided in the sample.
 */
export function useInvoices() {
  const [data, setData] = useState<Invoice[]>();
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    api
      .listInvoices()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { data, isLoading, error };
}
