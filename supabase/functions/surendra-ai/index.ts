import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { message, user_id = "default" } = await req.json();

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
    const { data: memory } = await supabase
      .from("memory")
      .select("role,message")
      .eq("user_id", user_id)
      .order("created_at", { ascending: true });

    const messages = [
      {
        role: "system",
        content:
          "You are SurendraAI, a helpful AI assistant. Reply in the user's language.",
      },

      ...(memory ?? []).map((m) => ({
        role: m.role,
        content: m.message,
      })),

      {
        role: "user",
        content: message,
      },
    ];

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
        }),
      },
    );

    const groq = await groqResponse.json();

    const aiReply =
      groq?.choices?.[0]?.message?.content ??
      "Sorry, I couldn't generate a reply.";
    await supabase.from("memory").insert([
      {
        user_id,
        role: "user",
        message,
      },
      {
        user_id,
        role: "assistant",
        message: aiReply,
      },
    ]);

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
