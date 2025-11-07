import type { Request, Response } from "express";
import { isLaugh, isValidMessage, isGreeting, isThanks, normalize, forbiddenWords } from "../services/validationService.js";
import { retrieveContext, getEmbedding, cosineSimilarity, knowledgeBase, saveUnansweredMessage } from "../utils/rag.js";
import logger from "../utils/logger.js";
import { generateAIResponse } from "../services/aiServices.js";
import { sessions } from "../models/session.js";
import type { ChatMessage, Session} from "../models/session.js";
import { detectAmbiguity, resolveAmbiguity } from "../utils/ambiguity.js";
import { actualizarEstadisticas } from "../utils/statsManager.js";





function containsForbidden(text: string, category: keyof typeof forbiddenWords): boolean {
  const normalized = normalize(text);
  return forbiddenWords[category].some((w) => normalized.includes(w));
}

export async function chatHandler(req: Request, res: Response) {
  const { sessionId, message } = req.body;
  if (!sessionId || !message) return res.status(400).json({ error: "Falta sessionId o mensaje" });

  let finalMessage = message;

  if (!sessions[sessionId]) sessions[sessionId] = { messages: [], lastActive: Date.now() };
  const session: Session = sessions[sessionId];
  session.lastActive = Date.now();

    if (!isValidMessage(finalMessage, !!session.pendingAmbiguity)) {
    return res.json({
      response: "⚠️ No entiendo tu mensaje. Por favor escribe una oración o pregunta clara.",
      contextFound: false,
    });
  }
  session.messages.push({ role: "user", content: finalMessage, timestamp: Date.now() });
  actualizarEstadisticas(sessionId, false);

  // ------------------ Saludos, gracias y risa ------------------
 // Función auxiliar para obtener una respuesta aleatoria
const getRandomResponse = (responses: string[]): string => {
  return responses[Math.floor(Math.random() * responses.length)];
};

// Arrays de respuestas para cada tipo de mensaje
const greetingResponses = [
  "👋 ¡Hola! ¿En qué puedo ayudarte hoy?",
  "😊 ¡Hola! ¿Qué necesitas saber?",
  "👋 ¡Bienvenido! Estoy aquí para ayudarte.",
  "🙂 ¡Hola! ¿Cómo puedo asistirte?",
  "😎 ¡Hey! ¿En qué te puedo colaborar?",
  "😄 ¡Saludos! ¿Qué información buscas?",
  "🌟 ¡Hola! Cuéntame, ¿qué necesitas?",
  "✨ ¡Buenas! ¿Cómo te ayudo hoy?"
];

const thanksResponses = [
  "🙏 ¡Con gusto! Estoy aquí para ayudarte.",
  "😊 ¡De nada! Es un placer asistirte.",
  "🤗 ¡Para eso estoy! Cualquier cosa me avisas.",
  "🫶 ¡No hay de qué! Estoy para servirte.",
  "💙 ¡Encantado de ayudar! 😊",
  "🙏 ¡A la orden! Siempre disponible para ti.",
  "🫶 ¡Con mucho gusto! Si necesitas algo más, avísame.",
  "💙 ¡Me alegra poder ayudarte! 😊",
  "🥳 ¡Es un placer! Para eso estamos.",
  "😉 ¡No es nada! Cuenta conmigo cuando lo necesites."
];

const laughResponses = [
  "🤣 jajaja, me contagiaste la risa.",
  "😄 jajaja, ¡qué bueno!",
  "😂 jajaja, me hiciste reír.",
  "🤣 jajaja, ¡buena esa!",
  "😆 jajaja, me alegra que estés de buen humor.",
  "😄 jajaja, ¡la risa es contagiosa!",
  "🤣 jajaja, me encanta tu energía.",
  "😂 jajaja, ¡qué gracioso!",
  "😁 jajaja, el buen humor es lo mejor.",
  
];

// Implementación en tus condiciones
if (isGreeting(finalMessage)) {
  const saludo = getRandomResponse(greetingResponses);
  session.messages.push({ role: "assistant", content: saludo, timestamp: Date.now() });
  return res.json({ response: saludo, contextFound: false });
}

if (isThanks(finalMessage)) {
  const agradece = getRandomResponse(thanksResponses);
  session.messages.push({ role: "assistant", content: agradece, timestamp: Date.now() });
  return res.json({ response: agradece, contextFound: false });
}

if (isLaugh(finalMessage)) {
  const lol = getRandomResponse(laughResponses);
  session.messages.push({ role: "assistant", content: lol, timestamp: Date.now() });
  return res.json({ response: lol, contextFound: false });
}

  // ------------------ Presentación (nombre) ------------------
  if (
    !session.nameCaptured &&
    (finalMessage.toLowerCase().includes("mi nombre es") || finalMessage.toLowerCase().includes("soy "))
  ) {
    let possibleName = "";

    if (finalMessage.toLowerCase().includes("mi nombre es")) {
      possibleName = finalMessage.split(/mi nombre es/i)[1]?.trim() ?? "";
    } else if (finalMessage.toLowerCase().includes("soy ")) {
      possibleName = finalMessage.split(/soy/i)[1]?.trim() ?? "";
    }

    //  Evitar frases típicas que no son nombres
    const forbiddenStarts = ["beneficiario", "de ", "del ", "la ", "el ", "usuario", "trabajador", "estudiante"];
    if (forbiddenStarts.some(f => possibleName.toLowerCase().startsWith(f))) {
      // No capturamos, dejamos seguir el flujo normal
    } else {
      if (
        containsForbidden(possibleName, "greetings") ||
        containsForbidden(possibleName, "thanks") ||
        containsForbidden(possibleName, "insults")
      ) {
        const warning = "⚠️ Ese no es un nombre válido. Por favor ingresa tu nombre real.";
        session.messages.push({ role: "assistant", content: warning, timestamp: Date.now() });
        return res.json({ response: warning, contextFound: false });
      }

      const confirm = `¡Encantado de conocerte, ${possibleName}! ¿En qué puedo ayudarte hoy?`;
      session.messages.push({ role: "assistant", content: confirm, timestamp: Date.now() });

      session.nameCaptured = true;

      return res.json({ response: confirm, contextFound: false });
    }
  }

  // ------------------ Ambigüedad ------------------
const ambiguity = detectAmbiguity(finalMessage);
if (ambiguity.isAmbiguous) {
  session.pendingAmbiguity = {
    originalMessage: finalMessage,
    suggestions: ambiguity.suggestions || [],
  };

  const resp = `**🤔 Tu mensaje es muy general. ¿Te refieres a:**\n\n${ambiguity.suggestions?.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
  actualizarEstadisticas(sessionId, true); 
  return res.json({ response: resp, contextFound: false });
}

if (session.pendingAmbiguity) {
  const resolution = resolveAmbiguity(finalMessage, session);
  if (resolution.invalid) {
    const resp = `**⚠️ Esa opción no es válida.** Por favor elige una de las siguientes:\n\n${session.pendingAmbiguity.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
    actualizarEstadisticas(sessionId, true); 
    return res.json({ response: resp, contextFound: false });
  }
  if (resolution.resolved) finalMessage = resolution.resolved;
  else {
    const resp = `**⚠️ Debes elegir una de las opciones:**\n\n${session.pendingAmbiguity.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
    return res.json({ response: resp, contextFound: false });
  }
}

  // ------------------ Recuperar contexto ------------------
  const context = await retrieveContext(finalMessage, 1, 5, 0.65);
  const qEmbedding = await getEmbedding(finalMessage);
  let topScore = 0;

  if (qEmbedding) {
    topScore = knowledgeBase.map(c => cosineSimilarity(qEmbedding, c.embedding)).sort((a, b) => b - a)[0] ?? 0;
  } else logger.warn(`⚠️ No se pudo generar embedding para: "${finalMessage}"`);

  const STRICT_THRESHOLD = 0.7;
  if (!context?.trim() || topScore < STRICT_THRESHOLD) {
    const warningMessage = "⚠️ Aún estoy aprendiendo y no tengo la respuesta, pero la guardaré para revisión.";
    saveUnansweredMessage(sessionId, finalMessage, context ? [context] : [], topScore);
    session.messages.push({ role: "assistant", content: warningMessage, timestamp: Date.now() });
    return res.json({ response: warningMessage, contextFound: false });
  }

  // ------------------ Prompt para LLM ------------------
  const systemPrompt = `
Eres un asistente virtual de la Alcaldía de Yopal. Responde SOLO con la información del contexto.

Reglas:
- No inventes información ni uses conocimiento externo.
- Si el contexto NO contiene enlaces, no inventes ni agregues ninguno.
- Si la respuesta del contexto contiene únicamente un enlace, nunca lo devuelvas solo: acompáñalo siempre de un paso a paso sencillo o una instrucción clara sobre qué hacer en esa página.
- Si en el contexto tiene enlace, inclúyelo en la respuesta en formato markdown: [texto](url)
- Reescribe las respuestas en un tono claro, cordial y natural, no las copies textualmente
- Formatea tu respuesta usando markdown cuando sea apropiado (negritas, listas, enlaces, etc.)

Contexto:

${context}
`;

  // ------------------ Historial de conversación ------------------
  const HISTORY_LIMIT = 1; // ajustar el número de mensajes que quieres mantener en contexto
  const recentMessages = session.messages.slice(-HISTORY_LIMIT).map((m): ChatMessage => ({
    role: m.role as "user" | "assistant",
    content: m.content,
    timestamp: m.timestamp ?? Date.now()
  }));

  const finalMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt, timestamp: Date.now() },
    // ...recentMessages,
    { role: "user", content: finalMessage, timestamp: Date.now() },
  ];

  const respuesta = await generateAIResponse(finalMessages);
  session.messages.push({ role: "assistant", content: respuesta, timestamp: Date.now() });
  actualizarEstadisticas(sessionId, true); // con respuesta
  logger.info("📌 Sesiones actuales:");
  Object.entries(sessions).forEach(([id, session]) => {
    logger.info(`\n🆔 Session ID: ${id}`);
    session.messages.forEach((msg, i) => {
      logger.info(
        `   [${i + 1}] (${msg.role.toUpperCase()}) ${msg.content} - ${new Date(msg.timestamp).toLocaleString()}`
      );
    });
  });
  return res.json({ response: respuesta, contextFound: true });
}