import fetch from "node-fetch";
import { LLM_API_URL } from "../config/env.js";
import logger from "../utils/logger.js";
import type { ChatMessage } from "../models/session.js";

interface LMChoice {
  message: { role: "assistant" | "user" | "system"; content: string };
}
interface LMResponse {
  choices: LMChoice[];
}

function isLMResponse(data: any): data is LMResponse {
  return (
    Array.isArray(data?.choices) &&
    data.choices.every((c: LMChoice) => !!c?.message?.content)
  );
}

export async function generateAIResponse(messages: ChatMessage[]): Promise<string> {
  try {
    const lmResponse = await fetch(LLM_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-ultralong-1m-instruct",
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: 500,
        temperature: 0.7,
        stream: false,
      }),
    });

    const raw = await lmResponse.json();
    if (!isLMResponse(raw)) return "⚠️ Respuesta inesperada del modelo.";
    return raw.choices[0]?.message?.content ?? "⚠️ Respuesta vacía del modelo.";
  } catch (err) {
    logger.error(err);
    return "⚠️ Error al conectar con el modelo de IA.";
  }
}
