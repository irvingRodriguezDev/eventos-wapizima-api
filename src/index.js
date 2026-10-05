require("dotenv").config();

const express = require("express");
const http = require("http");
const sequelize = require("./config/db");
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

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

const httpServer = http.createServer(app);

app.use("/api", routes);

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("✅ Base de datos conectada.");

    // Sincronizar tablas (alter: true actualiza campos sin borrar datos)
    await sequelize.sync({ alter: true });
    console.log("✅ Tablas sincronizadas.");

    app.listen(PORT, () => {
      console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error al iniciar servidor:", error.message);
  }
}

startServer();
