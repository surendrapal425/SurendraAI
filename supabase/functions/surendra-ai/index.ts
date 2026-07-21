import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { MEMORY_LIMIT } from "./config.ts";
import { SYSTEM_PROMPT } from "./prompts.ts";

import {
  loadMemory,
  saveMemory,
  buildMemoryMessages,
} from "./memory.ts";

import { askGroq } from "./groq.ts";
import { loadUserProfile } from "./profile.ts";
import { loadSummary } from "./summary.ts";
import { searchWeb } from "./tavily.ts";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;
const TAVILY_API_KEY =
  Deno.env.get("TAVILY_API_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const user_id =
      typeof body.user_id === "string" &&
      body.user_id.trim()
        ? body.user_id.trim()
        : "default";

    if (!message) {
      return new Response(
        JSON.stringify({
          error: "Message is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const memory = await loadMemory(
      supabase,
      user_id,
    );

    const profile = await loadUserProfile(
      supabase,
      user_id,
    );

    const summary = await loadSummary(
      supabase,
      user_id,
    );
        const webContext = await searchWeb(
      TAVILY_API_KEY,
      message,
    );

    const messages: {
      role: string;
      content: string;
    }[] = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
    ];

    if (summary) {
      messages.push({
        role: "system",
        content:
          `Conversation Summary:\n${summary}`,
      });
    }

    if (profile) {
      messages.push({
        role: "system",
        content:
          `User Profile:\n${JSON.stringify(profile)}`,
      });
    }

    if (webContext) {
      messages.push({
        role: "system",
        content:
          `Web Search Results:\n${webContext}`,
      });
    }

    messages.push(
      ...buildMemoryMessages(
        memory.slice(-MEMORY_LIMIT),
      ),
    );

    messages.push({
      role: "user",
      content: message,
    });

    const aiReply = await askGroq(
      GROQ_API_KEY,
      messages,
    );

    await saveMemory(
      supabase,
      user_id,
      message,
      aiReply,
    );
        return new Response(
      JSON.stringify({
        reply: aiReply,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (err) {
    console.error(err);

    return new Response(
      JSON.stringify({
        error:
          err instanceof Error
            ? err.message
            : String(err),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});