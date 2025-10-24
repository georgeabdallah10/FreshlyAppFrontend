// api/home/chat.ts  (React Native frontend)
import { BASE_URL } from "../env/baseUrl";

export async function askAI({
  prompt,   
  system,      
          // full prompt you compose on the client
}: {
  prompt: string;
  system: string;
}): Promise<string> {
  const resp = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, prompt}),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return data.reply ?? "";
}