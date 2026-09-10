import { useAuth } from "@clerk/expo";
import { useMemo } from "react";

import { createSupabaseClient } from "../lib/supabase";

export const useSupabase = () => {
  const { getToken } = useAuth();

  const supabase = useMemo(() => {
    return createSupabaseClient(getToken);
  }, [getToken]);

  return supabase;
};
