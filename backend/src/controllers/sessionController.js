const crypto = require("crypto");
const Session = require("../models/Session");
const { apiSuccess, apiError } = require("../utils/apiResponse");

const normalizeDeviceType = (userAgent = "") => {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|ipod/.test(ua)) return "mobile";
  if (/tablet/.test(ua)) return "tablet";
  return "desktop";
};

const normalizeBrowser = (userAgent = "") => {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();
  if (/edg\//.test(ua)) return "edge";
  if (/chrome\//.test(ua) && !/opr\//.test(ua)) return "chrome";
  if (/firefox\//.test(ua)) return "firefox";
  if (/safari\//.test(ua) && !/chrome\//.test(ua)) return "safari";
  if (/opr\//.test(ua)) return "opera";
  return "unknown";
};

const normalizeLocation = (location = {}) => ({
  country: location.country || "",
  city: location.city || "",
  region: location.region || "",
});

const sanitizePayload = (payload = {}) => {
  const normalized = { ...payload };
  if (normalized.eventType === "page_view" || normalized.eventType === "product_view") {
    normalized.page = normalized.page || normalized.path || "/";
  }
  if (normalized.eventType === "payment_attempt") {
    normalized.status = normalized.status || "pending";
  }
  return normalized;
};

const ensureSession = async (sessionId, req) => {
  let session = await Session.findOne({ sessionId });

  if (session && session.user && req.user && String(session.user) !== String(req.user._id) && req.user.role !== 'admin') {
    const error = new Error('Session access forbidden');
    error.statusCode = 403;
    throw error;
  }

  if (!session) {
    const userAgent = req.body.userAgent || req.headers["user-agent"] || "";
    session = new Session({
      sessionId,
      user: req.user?._id || undefined,
      deviceType: req.body.deviceType || normalizeDeviceType(userAgent),
      browser: req.body.browser || normalizeBrowser(userAgent),
      os: req.body.os || "unknown",
      ipAddress: req.body.ipAddress || req.ip || "",
      userAgent,
      location: normalizeLocation(req.body.location),
      startedAt: new Date(),
      lastActivityAt: new Date(),
      status: "active",
    });
  }

  const userAgent = req.body.userAgent || req.headers["user-agent"] || session.userAgent || "";
  session.user = req.user?._id || session.user;
  session.deviceType = req.body.deviceType || session.deviceType || normalizeDeviceType(userAgent);
  session.browser = req.body.browser || session.browser || normalizeBrowser(userAgent);
  session.os = req.body.os || session.os || "unknown";
  session.ipAddress = req.body.ipAddress || req.ip || session.ipAddress || "";
  session.userAgent = userAgent;
  session.location = normalizeLocation(req.body.location || session.location || {});
  session.lastActivityAt = new Date();
  session.status = "active";
  if (!session.startedAt) session.startedAt = new Date();

  // Ensure arrays exist to avoid runtime push errors
  session.events = session.events || [];
  session.pageViews = session.pageViews || [];
  session.clickEvents = session.clickEvents || [];
  session.cartUpdates = session.cartUpdates || [];
  session.checkoutSteps = session.checkoutSteps || [];
  session.paymentAttempts = session.paymentAttempts || [];

  return session;
};

const appendSessionEvent = (session, payload = {}) => {
  const normalized = sanitizePayload(payload);
  if (!normalized.eventType && !normalized.type && !normalized.page && !normalized.action && !normalized.step) return;

  const eventType = normalized.eventType || normalized.type || normalized.action || normalized.step || "custom_event";
  const eventEntry = {
    type: eventType,
    eventName: normalized.eventName || normalized.label || eventType,
    page: normalized.page || "",
    productId: normalized.productId || undefined,
    metadata: normalized.metadata || normalized,
    createdAt: new Date(),
  };

  session.events.push(eventEntry);

  if (eventType === "page_view" || normalized.page) {
    const pagePath = normalized.page || normalized.path || "/";
    session.pageViews.push({
      path: pagePath,
      title: normalized.title || "",
      enteredAt: normalized.enteredAt ? new Date(normalized.enteredAt) : new Date(),
      exitedAt: normalized.exitedAt ? new Date(normalized.exitedAt) : null,
      durationMs: Number(normalized.durationMs || 0),
      referrer: normalized.referrer || "",
    });
  }

  if (eventType === "click" || normalized.element) {
    session.clickEvents.push({
      element: normalized.element || "",
      label: normalized.label || "",
      page: normalized.page || "",
      createdAt: new Date(),
    });
  }

  if (eventType === "cart_update" || normalized.action || normalized.cartAction) {
    session.cartUpdates.push({
      action: normalized.action || normalized.cartAction || "update",
      productId: normalized.productId || undefined,
      quantity: Number(normalized.quantity || 0),
      page: normalized.page || "",
      createdAt: new Date(),
    });
  }

  if (eventType === "checkout_step" || normalized.step) {
    session.checkoutSteps.push({
      step: normalized.step || "checkout",
      status: normalized.status || "completed",
      createdAt: new Date(),
    });
  }

  if (eventType === "payment_attempt" || normalized.paymentMethod || normalized.status === "failed") {
    session.paymentAttempts.push({
      method: normalized.paymentMethod || normalized.method || "unknown",
      status: normalized.status || "pending",
      amount: Number(normalized.amount || 0),
      error: normalized.error || "",
      createdAt: new Date(),
    });
  }
};

exports.startSession = async (req, res, next) => {
  try {
    const sessionId = req.body.sessionId || crypto.randomUUID();
    const session = await ensureSession(sessionId, req);

    if (req.body.eventType || req.body.page || req.body.action || req.body.step) {
      appendSessionEvent(session, req.body);
    }

    await session.save();
    res.status(201).json(apiSuccess("Session started", { session }));
  } catch (error) {
    next(error);
  }
};

exports.updateSession = async (req, res, next) => {
  try {
    const sessionId = req.params.sessionId || req.body.sessionId;
    if (!sessionId) return res.status(400).json(apiError("Session id is required", 400));

    const session = await ensureSession(sessionId, req);
    appendSessionEvent(session, req.body);
    await session.save();

    res.status(200).json(apiSuccess("Session updated", { session }));
  } catch (error) {
    next(error);
  }
};

exports.trackSession = async (req, res, next) => {
  try {
    const sessionId = req.body.sessionId || crypto.randomUUID();
    const session = await ensureSession(sessionId, req);
    appendSessionEvent(session, req.body);
    session.totalSessionSeconds = Math.max(0, Math.floor((new Date() - session.startedAt) / 1000));
    await session.save();

    res.status(201).json(apiSuccess("Session event tracked", { session }));
  } catch (error) {
    next(error);
  }
};

exports.endSession = async (req, res, next) => {
  try {
    const sessionId = req.params.sessionId || req.body.sessionId;
    const session = await Session.findOne({ sessionId });

    if (!session) return res.status(404).json(apiError("Session not found", 404));

    session.status = "ended";
    session.endedAt = new Date();
    session.totalSessionSeconds = Math.max(0, Math.floor((session.endedAt - session.startedAt) / 1000));
    session.lastActivityAt = new Date();

    if (req.body?.eventType || req.body?.eventName || req.body?.step) {
      appendSessionEvent(session, req.body);
    }

    await session.save();
    res.status(200).json(apiSuccess("Session ended", { session }));
  } catch (error) {
    next(error);
  }
};

exports.getSessionSummary = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id).populate("user", "name email role");
    if (!session) return res.status(404).json(apiError("Session not found", 404));

    if (session.user && req.user && String(session.user._id || session.user) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json(apiError("Forbidden", 403));
    }

    const summary = {
      _id: session._id,
      sessionId: session.sessionId,
      user: session.user,
      status: session.status,
      deviceType: session.deviceType,
      browser: session.browser,
      location: session.location,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      totalSessionSeconds: session.totalSessionSeconds,
      eventCount: session.events.length,
      pageViewCount: session.pageViews.length,
      cartUpdateCount: session.cartUpdates.length,
      paymentAttemptCount: session.paymentAttempts.length,
      lastActivityAt: session.lastActivityAt,
    };

    res.status(200).json(apiSuccess("Session summary fetched", { session: summary }));
  } catch (error) {
    next(error);
  }
};

exports.getMySessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.status(200).json(apiSuccess("User sessions fetched", { sessions }));
  } catch (error) {
    next(error);
  }
};

exports.getAllSessions = async (req, res, next) => {
  try {
    const { limit = 50, page = 1, status } = req.query;
    const filter = status ? { status } : {};

    const sessions = await Session.find(filter)
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Session.countDocuments(filter);

    res.status(200).json(apiSuccess("Sessions fetched", { sessions, pagination: { page: Number(page), limit: Number(limit), total } }));
  } catch (error) {
    next(error);
  }
};

exports.getSessionHistory = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json(apiError("Session not found", 404));

    if (session.user && req.user && String(session.user) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json(apiError("Forbidden", 403));
    }

    res.status(200).json(
      apiSuccess("Session history fetched", {
        sessionId: session.sessionId,
        user: session.user,
        pageViews: session.pageViews,
        clickEvents: session.clickEvents,
        cartUpdates: session.cartUpdates,
        checkoutSteps: session.checkoutSteps,
        paymentAttempts: session.paymentAttempts,
        events: session.events,
      })
    );
  } catch (error) {
    next(error);
  }
};
