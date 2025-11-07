import fs from "fs";
import path from "path";

interface SesionStats {
  preguntas: number;
  respondidas: number;
  no_respondidas: number;
}

export interface Estadisticas {
  total_usuarios: number;
  total_preguntas: number;
  preguntas_con_respuesta: number;
  preguntas_sin_respuestas: number;
  sesiones: Record<string, SesionStats>;
}


const statsPath = path.resolve(process.cwd(), "src/data/stats.json");

function inicializar(): Estadisticas {
  return {
    total_usuarios: 0,
    total_preguntas: 0,
    preguntas_con_respuesta: 0,
    preguntas_sin_respuestas: 0,
    sesiones: {}
  };
}

export function cargarEstadisticas(): Estadisticas {
  try {
    if (!fs.existsSync(statsPath)) {
      const init = inicializar();
      fs.writeFileSync(statsPath, JSON.stringify(init, null, 2), { encoding: "utf8" });
      console.log("[stats] creado stats.json en:", statsPath);
      return init;
    }
    const raw = fs.readFileSync(statsPath, { encoding: "utf8" });
    return JSON.parse(raw) as Estadisticas;
  } catch (err) {
    console.error("[stats] error cargarEstadisticas:", err);
    const fallback = inicializar();
    try {
      fs.writeFileSync(statsPath, JSON.stringify(fallback, null, 2), { encoding: "utf8" });
    } catch (e) {
      console.error("[stats] no se pudo crear fallback:", e);
    }
    return fallback;
  }
}

export function guardarEstadisticas(data: Estadisticas): void {
  try {
    fs.writeFileSync(statsPath, JSON.stringify(data, null, 2), { encoding: "utf8" });
  } catch (err) {
    console.error("[stats] error guardarEstadisticas:", err);
    throw err;
  }
}

/**
 * Actualiza las estadísticas solo si el mensaje proviene del usuario
 * @param sessionId - ID de la sesión actual
 * @param respondida - true si el bot respondió
 * @param tipo - "usuario" o "bot"
 */
export function actualizarEstadisticas(sessionId: string, respondida: boolean = false): void {
  const stats = cargarEstadisticas();

  if (!stats.sesiones[sessionId]) {
    stats.sesiones[sessionId] = { preguntas: 0, respondidas: 0, no_respondidas: 0 };
    stats.total_usuarios++;
  }

  // Solo sumar pregunta si aún no hay preguntas registradas
  if (!respondida) {
    stats.sesiones[sessionId].preguntas++;
    stats.total_preguntas++;
  }

  if (respondida) {
    stats.sesiones[sessionId].respondidas++;
    stats.preguntas_con_respuesta++;
  }
  guardarEstadisticas(stats);
}


export function incrementarSinRespuesta(sessionId: string) {
  const data = cargarEstadisticas();

  // Si no existe la sesión, no la contamos como nuevo usuario
  if (!data.sesiones[sessionId]) {
    data.sesiones[sessionId] = { preguntas: 0, respondidas: 0 , no_respondidas: 0};
  }

  // Solo aumentamos preguntas sin respuesta
  data.preguntas_sin_respuestas++;
  data.sesiones[sessionId].no_respondidas++

  guardarEstadisticas(data);
}


