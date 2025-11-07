
module.exports = {
  apps: [
    {
      name: "chat-backend",       // nombre del proceso en PM2
      script: "dist/server.js",      // archivo que se ejecuta
      watch: false,                  // true = reinicia si detecta cambios
      env: {
        NODE_ENV: "production",
        PORT: 3017
      }
    }
  ]
};
