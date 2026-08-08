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

// Root status endpoint - returns a simple API status for production root URL
app.get("/", (req, res) => {
  // Prefer the live process env first (covers hosting platforms),
  // then fall back to the configured env value, then 'production'.
  const environment = process.env.NODE_ENV || env.NODE_ENV || "production";
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

app.use(notFound);
app.use(errorHandler);

module.exports = app;
