import express from "express";
import type { Request, Response } from "express";
import { cargarEstadisticas } from "../utils/statsManager.js";

const router = express.Router();

router.get("/estadisticas", (req: Request, res: Response) => {
  try {
    const stats = cargarEstadisticas();
    res.status(200).json(stats);
  } catch (error) {
    console.error("❌ Error /estadisticas:", error);
    res.status(500).json({ error: "Error interno al obtener estadísticas" });
  }
});

export default router;
