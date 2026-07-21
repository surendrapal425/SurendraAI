import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { askGroq } from "./groq.ts";

export interface UserProfile {
  user_id: string;
  name?: string;
  language?: string;
  city?: string;
  profession?: string;
  interests?: string[];
}

const PROFILE_PROMPT = `
You extract long-term user profile information.

Read ONLY the latest user message.

Return ONLY valid JSON.

Schema:

{
  "name": "",
  "language": "",
  "city": "",
  "profession": "",
  "interests": []
}

Rules:

- Extract the user's full name if mentioned.
- Extract the city if mentioned.
- Extract the profession if mentioned.
- Extract the language only if explicitly mentioned.
- Extract hobbies or interests only if explicitly mentioned.
- If a field is unknown, return an empty string.
- For interests, return an empty array if none.
- Return ONLY JSON.
`;

export async function saveUserProfile(
  supabase: SupabaseClient,
  profile: UserProfile,
): Promise<void> {
  const { error } = await supabase
    .from("user_profile")
    .upsert(profile, {
      onConflict: "user_id",
    });

  if (error) {
    console.error("Profile update error:", error);
  }
}export async function extractUserProfile(
  apiKey: string,
  message: string,
): Promise<Omit<UserProfile, "user_id">> {
  const reply = await askGroq(apiKey, [
    {
      role: "system",
      content: PROFILE_PROMPT,
    },
    {
      role: "user",
      content: message,
    },
  ]);

  try {
    const profile = JSON.parse(reply);

    const text = message;

    if (!profile.name) {
      const m = text.match(/my name is\s+(.+)/i);
      if (m) profile.name = m[1].trim();
    }

    if (!profile.city) {
      const m = text.match(/i live in\s+(.+)/i);
      if (m) profile.city = m[1].trim();
    }

    if (!profile.profession) {
      const m = text.match(/i am\s+(?:an?|the)?\s*(.+)/i);
      if (m) profile.profession = m[1].trim();
    }

    if (!Array.isArray(profile.interests)) {
      profile.interests = [];
    }

    return {
      name: profile.name ?? "",
      language: profile.language ?? "",
      city: profile.city ?? "",
      profession: profile.profession ?? "",
      interests: profile.interests,
    };
  } catch (err) {
    console.error("Profile parse error:", err);

    return {
      name: "",
      language: "",
      city: "",
      profession: "",
      interests: [],
    };
  }
}
