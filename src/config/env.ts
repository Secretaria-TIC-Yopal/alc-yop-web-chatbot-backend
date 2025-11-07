import dotenv from "dotenv";
dotenv.config();

export const LLM_API_URL = process.env.LLM_API_URL!;
export const PORT = process.env.PORT || 3017;
export const NODE_ENV = process.env.NODE_ENV || "development";
