import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function loadMemory(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("memory")
    .select("role,message")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    console.error("Memory load error:", error);
    return [];
  }

  return data ?? [];
}

export async function saveMemory(
  supabase: SupabaseClient,
  userId: string,
  userMessage: string,
  aiReply: string,
) {
  const { error } = await supabase
    .from("memory")
    .insert([
      {
        user_id: userId,
        role: "user",
        message: userMessage,
      },
      {
        user_id: userId,
        role: "assistant",
        message: aiReply,
      },
    ]);

  if (error) {
    console.error("Memory save error:", error);
  }
}

export function buildMemoryMessages(
  memory: { role: string; message: string }[],
) {
  return memory.map((item) => ({
    role: item.role,
    content: item.message,
  }));
}
