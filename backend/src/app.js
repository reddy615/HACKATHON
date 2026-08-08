const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { env } = require("./config/env");
const logger = require("./utils/logger");
const { apiSuccess } = require("./utils/apiResponse");
const { notFound, errorHandler } = require("./middleware");
const path = require('path');
const fs = require('fs');

const app = express();
const { swaggerSpec, swaggerUi } = require("./swagger");

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(","),
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

if (env.NODE_ENV !== "test") {
  app.use(
    morgan("combined", {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    })
  );
}

app.get("/health", (req, res) => {
  res.status(200).json(apiSuccess("Server is healthy", { status: "ok" }));
});

// Root status endpoint - in production, if the frontend build exists, serve it.
app.get("/", (req, res) => {
  const environment = process.env.NODE_ENV || env.NODE_ENV || "production";
  // If production and frontend build exists, serve index.html to allow React to handle routing
  if (environment === 'production') {
    const clientDist = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
    const indexHtml = path.join(clientDist, 'index.html');
    if (fs.existsSync(indexHtml)) {
      return res.sendFile(indexHtml);
    }
  }

  // Fallback: return API status JSON (useful for health checks and API-only deployments)
  res.status(200).json(
    apiSuccess("Cart Rescue API is running", {
      status: "ok",
      environment,
    })
  );
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/carts", require("./routes/cartRoutes"));
app.use("/api/wishlist", require("./routes/wishlistRoutes"));
app.use("/api/sessions", require("./routes/sessionRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/ai", require("./ai/routes/aiRoutes"));
app.use("/api/ai", require("./ai/routes/predictionRoutes"));
app.use("/api/ai", require("./ai/routes/recommendationRoutes"));
app.use("/api/ai", require("./ai/routes/interventionRoutes"));

// Serve frontend static files and SPA fallback (production only)
try {
  const clientDist = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
  if (fs.existsSync(clientDist)) {
    // Serve static assets
    app.use(express.static(clientDist));

    // SPA fallback: only when the request is NOT for API, /health or /api-docs
    app.get('*', (req, res, next) => {
      const p = req.path || '';
      if (p.startsWith('/api') || p === '/health' || p.startsWith('/api-docs')) return next();
      return res.sendFile(path.join(clientDist, 'index.html'));
    });
  } else {
    logger.warn(`Frontend dist not found at ${clientDist} — skipping static serving.`);
  }
} catch (err) {
  logger.error(`Error while trying to serve frontend static files: ${err.message}`);
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
