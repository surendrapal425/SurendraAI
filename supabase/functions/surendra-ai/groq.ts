import { GROQ_URL, MODEL } from "./config.ts";

export async function askGroq(
  apiKey: string,
  messages: { role: string; content: string }[],
): Promise<string> {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Groq API Error: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();

  return (
    data?.choices?.[0]?.message?.content ??
    "Sorry, I couldn't generate a reply."
  );
}