import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function loadUserProfile(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("user_profile")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Profile load error:", error);
    return null;
  }

  return data;
}