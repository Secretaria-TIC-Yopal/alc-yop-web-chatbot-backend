import app from "./app.js";
import { PORT } from "./config/env.js";
import logger from "./utils/logger.js";
import { loadKnowledge } from "./utils/rag.js";
import { sessions } from "./models/session.js";


const SESSION_EXPIRATION = 30 * 60 * 1000; // 30 min
setInterval(() => {
  const now = Date.now();
  for (const id in sessions) {
    const session = sessions[id];
    if (!session) continue;
    if (now - session.lastActive > SESSION_EXPIRATION) {
      logger.info(`🗑️ Sesión ${id} eliminada por inactividad`);
      delete sessions[id];
    }
  }
}, 5 * 60 * 1000);

app.listen(PORT, async () => {
  logger.info(`🚀 Baaaaackend + Frontend listo en http://localhost:${PORT}`);
  await loadKnowledge();
});
