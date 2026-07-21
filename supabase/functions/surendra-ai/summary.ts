import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function loadSummary(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("conversation_summary")
    .select("summary")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Summary load error:", error);
    return "";
  }

  return data?.summary ?? "";
}