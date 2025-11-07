import type { TextPart } from "../models/session.js";

// 🔹 Regex compilados una sola vez
const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

// 🔹 URLs válidas: http(s)://... o dominio con TLD (mínimo 2 letras)
// 🚫 Evita confundir "210.000" con un dominio
const urlRegex =
  /\b((https?:\/\/[^\s]+)|([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/[^\s]*)?))\b/gi;

// 🔹 Detectar montos de dinero tipo $200.000 o $100,000
const moneyRegex = /\$\s?\d{1,3}(?:[.,]\d{3})*(,\d+)?/g;

const boldRegex = /\*\*(.*?)\*\*/g;

function cleanLink(url: string): string {
  return url.trim().replace(/[.,);:\]]+$/, "");
}

function pushLink(url: string, parts: TextPart[], label?: string) {
  // Evitar falsos positivos como "210.000"
  if (/^\d+(\.\d+)+$/.test(url)) {
    parts.push({ type: "text", content: url });
    return;
  }

  if (!/^https?:\/\//.test(url)) url = "https://" + url;
  parts.push({ type: "link", content: cleanLink(url), label });
}

function pushFormattedText(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let lastIndex = 0;

  text.replace(boldRegex, (match, boldText, offset) => {
    if (offset > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, offset) });
    }
    parts.push({ type: "bold", content: boldText });
    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }
  return parts;
}

export function parseStaticText(text: string): TextPart[] {
  const parts: TextPart[] = [];

  // 🔹 Dividimos el texto por saltos de línea explícitos
  const segments = text.split("\n");

  segments.forEach((segment) => {
    if (segment) {
      parts.push(...pushFormattedText(segment));
    }
  });

  return parts;
}

export function parseTextWithLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];

  // 🔹 PASO 1: Unir montos de dinero separados por saltos de línea
  // Captura patrones como "- $\n 000" o "$\n210.000" o "- $ \n 000"
  text = text
    .replace(/\$\s*\n+\s*/g, "$") // Unir $ con salto de línea y espacios
    .replace(/\n{2,}/g, "\n");     // Normalizar múltiples saltos

  // 🔹 PASO 2: Dividir por saltos de línea para mantener estructura
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    let lastIndex = 0;

    // 🔹 Detectar Markdown links [label](url)
    line.replace(mdLinkRegex, (match, label, url, offset) => {
      if (offset > lastIndex) {
        parts.push(...processTextSegment(line.slice(lastIndex, offset)));
      }
      pushLink(url, parts, label);
      lastIndex = offset + match.length;
      return match;
    });

    const remainingText = line.slice(lastIndex);
    if (remainingText) {
      parts.push(...processTextSegment(remainingText));
    }

    // 🔹 Agregar salto de línea si no es la última línea
    if (i < lines.length - 1) {
      parts.push({ type: "break", content: "\n" });
    }
  }

  return parts;
}

function processTextSegment(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let cursor = 0;

  // 🚀 PASO 1: Detectar primero montos de dinero
  text.replace(moneyRegex, (match, _gr, offset) => {
    if (offset > cursor) {
      parts.push(...processUrls(text.slice(cursor, offset)));
    }
    parts.push({ type: "text", content: match });
    cursor = offset + match.length;
    return match;
  });

  // 🚀 PASO 2: Procesar el texto restante buscando URLs
  const afterMoney = text.slice(cursor);
  if (afterMoney) {
    parts.push(...processUrls(afterMoney));
  }

  return parts;
}

function processUrls(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let urlCursor = 0;

  text.replace(urlRegex, (match, _u, httpUrl, domainUrl, offset) => {
    if (offset > urlCursor) {
      parts.push(...pushFormattedText(text.slice(urlCursor, offset)));
    }

    const rawUrl = httpUrl || domainUrl;
    pushLink(rawUrl.replace(/\*\*/g, ""), parts);

    urlCursor = offset + match.length;
    return match;
  });

  if (urlCursor < text.length) {
    parts.push(...pushFormattedText(text.slice(urlCursor)));
  }

  return parts;
}