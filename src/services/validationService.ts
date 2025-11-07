
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD") // separa acentos
    .replace(/[\u0300-\u036f]/g, "") // elimina acentos
    .trim();

    
}
export const forbiddenWords = {
  greetings: [
    "hola", "holaa", "holi", "holis",
    "buenos dias", "buenas tardes", "buenas noches",
    "saludos", "que tal", "como estas", "hey"
  ],
  thanks: [
    "gracias", "muchas gracias", "mil gracias",
    "se agradece", "te lo agradezco", "gracias por todo",
    "thank you", "thanks", "thx"
  ],
  insults: [
    "hp", "hijueputa", "gonorrea",
    "malparido", "puta", "prostituta"
  ]
};

// -------------------- función Saludos --------------------
export function isGreeting(message: string): boolean {
  const normalized = normalize(message);

  const greetingsRegex = [
    /^hola+!?$/,
    /^holi+s*!?$/,
    /^buenas+!?$/,
    /^saludos+!?$/,
    /^que\s+onda+!?$/,
  ];
  if (greetingsRegex.some((regex) => regex.test(normalized))) return true;

 
  return forbiddenWords.greetings.some((kw) => normalized.includes(kw));
}

// -------------------- función Agradecimientos --------------------
export function isThanks(message: string): boolean {
  const normalized = normalize(message);

  const thanksRegex = [
    /^gracias+!?$/,
    /^mil\s+gracias+!?$/,
    /^thanks+!?$/,
    /^thx+!?$/,
  ];
  if (thanksRegex.some((regex) => regex.test(normalized))) return true;

  
  return forbiddenWords.thanks.some((kw) => normalized.includes(kw));
}

// -------------------- función Risas --------------------
export function isLaugh(message: string): boolean {
  const normalized = normalize(message);

  const laughRegex = [
    /jaj+a+/i,   // jaja, jajaja
    /jeje+/i,    // jeje, jejeje
    /jiji+/i,    // jiji, jijiji
    /jojo+/i,    // jojo, jojojo
    /xd+/i,      // xd, xdd, xddd
    /lol+/i,     // lol, loool
    /lmao+/i,    // lmao, lmaooo
    /haha+/i,    // haha, hahaha
    /hehe+/i,    // hehe, hehehe
  ];
  if (laughRegex.some((regex) => regex.test(normalized))) return true;

  const keywords = ["xd", "😂", "🤣", "😆", "😹"];
  return keywords.some((kw) => normalized.includes(kw));
}

// -------------------- Validación General --------------------
export function isValidMessage(msg: string, hasPendingAmbiguity: boolean = false): boolean {
  const trimmed = msg.trim();

  // Mensajes especiales (siempre válidos)
  if (isGreeting(trimmed) || isThanks(trimmed) || isLaugh(trimmed)) return true;

   // Excepción: Si hay ambigüedad pendiente, permitir números del 1-9
  if (hasPendingAmbiguity && /^[1-9]$/.test(trimmed)) return true;

  // Reglas generales
  if (trimmed.length < 5) return false;
  if (!/[a-zA-Z]/.test(trimmed)) return false;    // debe contener letras
  if (/^[^a-zA-Z]+$/.test(trimmed)) return false; // no solo símbolos/números

  return true;
}
