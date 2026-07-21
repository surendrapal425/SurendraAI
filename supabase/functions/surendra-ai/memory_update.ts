import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { askGroq } from "./groq.ts";

export interface MemoryItem {
  role: string;
  message: string;
}

export async function saveMemoryItems(
  supabase: SupabaseClient,
  user_id: string,
  memories: MemoryItem[],
): Promise<void> {
  for (const memory of memories) {
    const message = memory.message?.trim();

    if (!message) {
      continue;
    }

    const { data } = await supabase
      .from("memory")
      .select("id")
      .eq("user_id", user_id)
      .eq("message", message)
      .limit(1);

    if (data && data.length > 0) {
      continue;
    }

    const { error } = await supabase
      .from("memory")
      .insert({
        user_id,
        message,
      });

    if (error) {
      console.error("Memory save error:", error);
    }
  }
}

const MEMORY_PROMPT = `
Extract only long-term user memories.

Return ONLY a JSON array.

Example:
[
  {
    "role": "user",
    "message": "My favorite food is pani puri."
  }
]

Remember ONLY:
- User name
- City
- Language
- Profession
- Hobbies
- Favorite food
- Favorite color
- Long-term goals

Return [] if nothing should be remembered.

Return ONLY JSON.
`;

export async function extractMemoryItems(
  apiKey: string,
  message: string,
): Promise<MemoryItem[]> {
  const reply = await askGroq(apiKey, [
    {
      role: "system",
      content: MEMORY_PROMPT,
    },
    {
      role: "user",
      content: message,
    },
  ]);

  try {
    const memories = JSON.parse(reply);

    if (!Array.isArray(memories)) {
      return [];
    }

    return memories.filter(
      (item) =>
        item &&
        typeof item.role === "string" &&
        typeof item.message === "string",
    );
  } catch {
    return [];
  }
}