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
Extract user profile information from the user's latest message.

Return ONLY valid JSON.

JSON format:

{
  "name": "",
  "language": "",
  "city": "",
  "profession": "",
  "interests": []
}

If a field is unknown, leave it empty.
Never return markdown.
Never explain anything.
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
    console.error(
      "Profile update error:",
      error,
    );
  }
}
export async function extractUserProfile(
  apiKey: string,
  message: string,
): Promise<Partial<UserProfile>> {
  const reply = await askGroq(
    apiKey,
    [
      {
        role: "system",
        content: PROFILE_PROMPT,
      },
      {
        role: "user",
        content: message,
      },
    ],
  );

  try {
    const profile = JSON.parse(reply);

    return {
      name: profile.name ?? "",
      language: profile.language ?? "",
      city: profile.city ?? "",
      profession: profile.profession ?? "",
      interests: Array.isArray(profile.interests)
        ? profile.interests
        : [],
    };
  } catch (error) {
    console.error(
      "Profile parse error:",
      error,
    );

    return {};
  }
}