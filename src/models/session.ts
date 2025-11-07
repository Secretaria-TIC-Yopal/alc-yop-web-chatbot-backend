export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface PendingAmbiguity {
  originalMessage: string;
  suggestions: string[];
}

export interface Session {
  messages: ChatMessage[];
  lastActive: number;
  pendingAmbiguity?: PendingAmbiguity; 
  nameCaptured?: boolean;
}

export interface TextPart {
  type: "text" | "link" | "bold" | "break" | "listItem";
  content: string;
  label?: string;
  ordered?: boolean;
}

export const sessions: Record<string, Session> = {};

