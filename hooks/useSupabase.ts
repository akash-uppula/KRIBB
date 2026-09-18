import { useAuth } from "@clerk/expo";
import { useRef } from "react";

import { createSupabaseClient } from "../lib/supabase";

export const useSupabase = () => {
  const { getToken } = useAuth();

  const supabaseRef = useRef<ReturnType<typeof createSupabaseClient> | null>(
    null,
  );

  if (!supabaseRef.current) {
    supabaseRef.current = createSupabaseClient(getToken);
  }

  return supabaseRef.current;
};
