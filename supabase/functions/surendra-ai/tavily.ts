export async function searchWeb(
  apiKey: string,
  query: string,
): Promise<string> {
  if (!apiKey) {
    return "";
  }

  const response = await fetch(
    "https://api.tavily.com/search",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: 3,
      }),
    },
  );

  if (!response.ok) {
    return "";
  }

  const data = await response.json();

  return (
    data?.results
      ?.map((item: { content: string }) => item.content)
      .join("\n\n") ?? ""
  );
}