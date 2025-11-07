import type { Session } from "../models/session.js";

export interface AmbiguityResult {
  isAmbiguous: boolean;
  suggestions?: string[];
}

export interface PendingAmbiguity {
  originalMessage: string;
  suggestions: string[];
}

// ------------------ Detecta si un mensaje es demasiado general y requiere aclaración ------------------
export function detectAmbiguity(message: string): AmbiguityResult {
  const normalized = message.toLowerCase();

  // -------------------------
  // Casos de trámites de pagos
  // -------------------------
  if (
    normalized.includes("recibo") ||
    normalized.includes("impuesto")
  ) {
    if (
      !normalized.includes("predial") &&
      !normalized.includes("industria y comercio")&&
      !normalized.includes("delineación urbana")&&
      !normalized.includes("impuesto vehicular")&&
      !normalized.includes("estampilla")
    ) {
      return {
        isAmbiguous: true,
        suggestions: [
          "predial", 
          "industria y comercio",
          "delineación urbana",
          "impuesto vehicular público",
          "estampilla"
        ],
      };
    }
  }

  // -------------------------
  // Casos de certificados
  // -------------------------
  if (normalized.includes("certificado")) {
    if (
      !normalized.includes("residencia") &&
      !normalized.includes("discapacidad") &&
      !normalized.includes("uso de suelos") &&
      !normalized.includes("sana posesión") &&
      !normalized.includes("estratificacion y nomenclatura")
    ) {
      return {
        isAmbiguous: true,
        suggestions: [
          "residencia",
          "discapacidad",
          "uso de suelos",
          "sana posesión",
          "estratificacion y nomenclatura",

        ],
      };
    }
  }

  if (
    normalized.includes("rity") ||
    normalized.includes("RITY")
  ) {
    if (
      !normalized.includes("persona jurídica") &&
      !normalized.includes("persona natural")&&
      !normalized.includes("consorcio o union temporal")&&
      !normalized.includes("union temporal")&&
      !normalized.includes("suceciones ilíquidas")
    ) {
      return {
        isAmbiguous: true,
        suggestions: [
          "persona jurídica", 
          "persona natural",
          "consorcio",
          "union temporal",
          "suceciones ilíquidas"
        ],
      };
    }
  }













  return { isAmbiguous: false ,

  };
}

// ------------------ Resuelve si el usuario responde a una ambigüedad previa ------------------
export function resolveAmbiguity(
  message: string,
  session: Session
): { resolved?: string; invalid?: boolean } {
  if (!session.pendingAmbiguity) return {};

  const normalized = message.toLowerCase().trim();

  // Verificar si es un número (1-9)
  const numMatch = normalized.match(/^(\d+)$/);
  if (numMatch) {
    const index = parseInt(numMatch[1], 10) - 1; // Convertir a índice base 0
    if (index >= 0 && index < session.pendingAmbiguity.suggestions.length) {
      const selectedOption = session.pendingAmbiguity.suggestions[index];
      const resolvedMessage = `${session.pendingAmbiguity.originalMessage} ${selectedOption}`;
      session.pendingAmbiguity = undefined; // ✅ Limpiamos porque ya se resolvió
      return { resolved: resolvedMessage };
    }
  }

  //  Verificar si escribió el texto completo de la opción
  const match = session.pendingAmbiguity.suggestions.find(
    (s) => s.toLowerCase() === normalized
  );

  if (match) {
    const resolvedMessage = `${session.pendingAmbiguity.originalMessage} ${match}`;
    session.pendingAmbiguity = undefined; //  Limpiamos porque ya se resolvió
    return { resolved: resolvedMessage };
  }

  // ❌ Opción inválida, mantenemos la ambigüedad activa
  return { invalid: true };

}
