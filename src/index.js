require("dotenv").config();
process.env.TZ = "America/Mexico_City";
const express = require("express");
const http = require("http");

// 1. Importamos sequelize y la carga de todos los modelos desde src/models/index.js
const { sequelize } = require("./models");
const routes = require("./routes");
const cors = require("cors");

const app = express();

const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use(cors(corsOptions));

app.use("/api/webhooks", require("./routes/webhookRoutes"));

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", routes);

const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3000;

// 2. Usamos alter: true o force: true temporalmente para sincronizar en desarrollo
sequelize
  .sync({ alter: true })
  .then(async () => {
    console.log("✅ Base de datos y tablas sincronizadas correctamente");
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`🌐 Servidor corriendo en puerto ${PORT}`);
    });
  })
  .catch((err) => console.error("❌ Error DB:", err));
