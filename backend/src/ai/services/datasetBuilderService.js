const mongoose = require("mongoose");
const Session = require("../../models/Session");
const Order = require("../../models/Order");
const Product = require("../../models/Product");
const TrainingDataset = require("../models/TrainingDataset");
const { escapeCsvValue, flattenFeatures } = require("../utils/datasetUtils");

const formatDateValue = (value) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  return Number(value) || 0;
};

const safeAverage = (values = []) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
};

const getSessionDuration = (session) => {
  if (!session.startedAt) return 0;
  const end = session.endedAt || new Date();
  return Math.max(0, (new Date(end) - new Date(session.startedAt)) / 1000);
};

const buildDatasetVersion = (suffix = "") => {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return suffix ? `${suffix}-${stamp}` : `v-${stamp}`;
};

const PURCHASE_SUCCESS_STATUSES = new Set(["paid", "shipped", "completed", "delivered", "success", "approved"]);

const encodeCategoricalValue = (value = "", mapping = {}) => {
  const normalizedValue = String(value || "").trim().toLowerCase();
  if (!normalizedValue) return 0;
  if (mapping[normalizedValue] !== undefined) return mapping[normalizedValue];
  mapping[normalizedValue] = Object.keys(mapping).length + 1;
  return mapping[normalizedValue];
};

const buildOrderWindowLookupStage = () => ({
  $lookup: {
    from: "orders",
    let: { userId: "$user", sessionStart: "$startedAt", sessionEnd: "$endedAt" },
    pipeline: [
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ["$user", "$$userId"] },
              { $gte: ["$createdAt", "$$sessionStart"] },
              { $lte: ["$createdAt", { $ifNull: ["$$sessionEnd", "$$sessionStart"] }] },
            ],
          },
        },
      },
      { $project: { _id: 1, user: 1, totalAmount: 1, createdAt: 1, status: 1 } },
    ],
    as: "ordersInWindow",
  },
});

const buildCartLookupStage = () => ({
  $lookup: {
    from: "carts",
    let: { userId: "$user" },
    pipeline: [
      {
        $match: { $expr: { $eq: ["$user", "$$userId"] } },
      },
      { $project: { _id: 1, user: 1, items: 1, subtotal: 1, status: 1, updatedAt: 1, createdAt: 1 } },
    ],
    as: "carts",
  },
});

const deriveLabelFromOrders = (ordersInWindow = []) => {
  const normalizedOrders = Array.isArray(ordersInWindow) ? ordersInWindow : [];

  return normalizedOrders.some((order) => {
    const status = String(order?.status || "").toLowerCase();
    return PURCHASE_SUCCESS_STATUSES.has(status);
  })
    ? 1
    : 0;
};

const buildPriorUserStats = (currentSession = {}, orders = [], priorSessions = []) => {
  const sessionStart = currentSession?.startedAt ? new Date(currentSession.startedAt) : null;
  if (!sessionStart) {
    return {
      previousOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0,
      previousAbandonments: 0,
    };
  }

  const previousOrders = Array.isArray(orders)
    ? orders.filter((order) => {
        const createdAt = order?.createdAt ? new Date(order.createdAt) : null;
        return Boolean(createdAt && createdAt < sessionStart);
      })
    : [];

  const previousAbandonments = (Array.isArray(priorSessions) ? priorSessions : []).filter((session) => {
    const sessionStartedAt = session?.startedAt ? new Date(session.startedAt) : null;
    if (!sessionStartedAt || sessionStartedAt >= sessionStart) return false;
    if (session?.sessionId && currentSession?.sessionId && String(session.sessionId) === String(currentSession.sessionId)) {
      return false;
    }

    const ordersInWindow = Array.isArray(session.ordersInWindow) ? session.ordersInWindow : [];
    return !ordersInWindow.some((order) => {
      const status = String(order?.status || "").toLowerCase();
      return PURCHASE_SUCCESS_STATUSES.has(status);
    });
  }).length;

  const totalSpent = previousOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const averageOrderValue = previousOrders.length > 0 ? totalSpent / previousOrders.length : 0;

  return {
    previousOrders: previousOrders.length,
    totalSpent,
    averageOrderValue,
    previousAbandonments,
  };
};

const getHistoricalUserStats = async (userId, currentSession = {}) => {
  if (!userId) {
    return buildPriorUserStats(currentSession, [], []);
  }

  const sessionStart = currentSession?.startedAt ? new Date(currentSession.startedAt) : null;
  if (!sessionStart) {
    return buildPriorUserStats(currentSession, [], []);
  }

  const normalizedUserId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
  const previousOrders = await Order.find({ user: normalizedUserId, createdAt: { $lt: sessionStart } }).lean();
  const previousSessions = await Session.aggregate([
    {
      $match: {
        user: normalizedUserId,
        status: "ended",
        startedAt: { $ne: null, $lt: sessionStart },
      },
    },
    buildOrderWindowLookupStage(),
    { $project: { _id: 1, sessionId: 1, startedAt: 1, endedAt: 1, ordersInWindow: 1 } },
  ]);

  return buildPriorUserStats(currentSession, previousOrders, previousSessions);
};

const buildFeatureVector = async (session, previousUserStats, productsById) => {
  const eventList = Array.isArray(session.events) ? session.events : [];
  const pageViews = Array.isArray(session.pageViews) ? session.pageViews : [];
  const clickEvents = Array.isArray(session.clickEvents) ? session.clickEvents : [];
  const cartUpdates = Array.isArray(session.cartUpdates) ? session.cartUpdates : [];
  const checkoutSteps = Array.isArray(session.checkoutSteps) ? session.checkoutSteps : [];
  const paymentAttempts = Array.isArray(session.paymentAttempts) ? session.paymentAttempts : [];

  const durationSeconds = getSessionDuration(session);
  const activeTime = pageViews.reduce((sum, view) => sum + Number(view.durationMs || 0), 0) / 1000;
  const idleTime = Math.max(0, durationSeconds - activeTime);

  const eventTimestamps = eventList
    .map((event) => (event.createdAt ? new Date(event.createdAt).getTime() : null))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  const averageEventGap = eventTimestamps.length > 1
    ? safeAverage(
        eventTimestamps.slice(1).reduce((diffs, timestamp, index) => {
          const previous = eventTimestamps[index];
          diffs.push(Math.max(0, (timestamp - previous) / 1000));
          return diffs;
        }, [])
      )
    : 0;

  const productViews = eventList.filter((event) => event.type === "product_view" || event.productId).length;
  const uniqueProductsViewed = new Set(
    eventList
      .filter((event) => event.productId)
      .map((event) => String(event.productId))
  ).size;

  const productCategories = {};
  const productIds = eventList.filter((event) => event.productId).map((event) => String(event.productId));
  productIds.forEach((productId) => {
    const product = productsById.get(productId);
    if (product && product.category) {
      productCategories[product.category] = (productCategories[product.category] || 0) + 1;
    }
  });

  const addToCartCount = cartUpdates.filter((entry) => /add|increment|add_to_cart/i.test(entry.action || "")).length;
  const removeFromCartCount = cartUpdates.filter((entry) => /remove|delete|drop/i.test(entry.action || "")).length;
  const quantityChanges = cartUpdates.filter((entry) => Number(entry.quantity) > 0).length;
  const wishlistCount = eventList.filter((event) => /wishlist/i.test(event.type || event.eventName || "")).length;

  const finalCart = (session.finalCart || null) || null;
  const finalCartValue = Number(finalCart?.subtotal || 0);
  const cartItemCount = finalCart && Array.isArray(finalCart.items) ? finalCart.items.length : 0;

  const checkoutStarted = checkoutSteps.length > 0 || eventList.some((event) => /checkout/i.test(event.type || event.eventName || "")) ? 1 : 0;
  const checkoutStepsCompleted = checkoutSteps.length;
  const checkoutCompletionRate = checkoutSteps.length > 0 ? Math.min(1, checkoutSteps.length / 4) : 0;
  const paymentAttemptsList = paymentAttempts;
  const paymentAttemptsCount = paymentAttemptsList.length;
  const paymentFailures = paymentAttemptsList.filter((entry) => /fail|decline|error/i.test(entry.status || "")).length;

  const userStats = previousUserStats.get(String(session.user)) || {
    previousOrders: 0,
    totalSpent: 0,
    averageOrderValue: 0,
    previousAbandonments: 0,
  };

  const previousOrders = userStats.previousOrders || 0;
  const previousAbandonments = userStats.previousAbandonments || 0;
  const totalSpent = userStats.totalSpent || 0;
  const averageOrderValue = userStats.averageOrderValue || 0;
  const returningCustomer = previousOrders > 0 ? 1 : 0;

  const sessionDate = session.startedAt ? new Date(session.startedAt) : new Date();
  const sessionHour = sessionDate.getHours();
  const dayOfWeek = sessionDate.getDay();
  const weekendIndicator = dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0;

  const deviceTypeLookup = {};
  const browserLookup = {};
  const operatingSystemLookup = {};

  const features = {
    sessionDuration: Number(durationSeconds.toFixed(2)),
    activeTime: Number(activeTime.toFixed(2)),
    idleTime: Number(idleTime.toFixed(2)),
    totalEvents: eventList.length,
    pageViewCount: pageViews.length,
    clickCount: clickEvents.length,
    bounceSession: pageViews.length <= 1 ? 1 : 0,
    averageEventGap: Number(averageEventGap.toFixed(2)),

    productViews,
    uniqueProductsViewed,
    averageProductViewTime: productViews > 0 ? Number((activeTime / productViews).toFixed(2)) : 0,
    categoryViews: productCategories,
    searchCount: eventList.filter((event) => /search/i.test(event.type || event.eventName || "") || /search/i.test(String(event.metadata?.query || ""))).length,
    filterUsage: eventList.filter((event) => /filter/i.test(event.type || event.eventName || "") || /filter/i.test(String(event.metadata?.filter || ""))).length,
    sortUsage: eventList.filter((event) => /sort/i.test(event.type || event.eventName || "") || /sort/i.test(String(event.metadata?.sort || ""))).length,

    addToCartCount,
    removeFromCartCount,
    quantityChanges,
    wishlistCount,
    finalCartValue,
    cartItemCount,

    checkoutStarted,
    checkoutStepsCompleted: checkoutStepsCompleted,
    checkoutCompletionRate: Number(checkoutCompletionRate.toFixed(2)),
    paymentAttempts: paymentAttemptsCount,
    paymentFailures,

    previousOrders,
    previousAbandonments,
    totalSpent,
    averageOrderValue,
    returningCustomer,

    deviceTypeCode: encodeCategoricalValue(session.deviceType || "unknown", deviceTypeLookup),
    browserCode: encodeCategoricalValue(session.browser || "unknown", browserLookup),
    operatingSystemCode: encodeCategoricalValue(session.os || "unknown", operatingSystemLookup),

    sessionHour,
    dayOfWeek,
    weekendIndicator,
  };

  return flattenFeatures(features);
};

const createTrainingRecords = async (sessions, datasetVersion, createdBy) => {
  const uniqueProductIds = [...new Set(
    sessions.flatMap((session) => (Array.isArray(session.events) ? session.events : []).filter((event) => event.productId).map((event) => String(event.productId)))
  )];

  const normalizedProductIds = uniqueProductIds.filter(Boolean).map((id) => new mongoose.Types.ObjectId(id));
  const productDocs = await Product.find({ _id: { $in: normalizedProductIds } }).lean();
  const productsById = new Map(productDocs.map((product) => [String(product._id), product]));

  const userStatsByKey = new Map();
  const records = [];
  let purchasedSessions = 0;
  let abandonedSessions = 0;

  for (const session of sessions) {
    const ordersInWindow = Array.isArray(session.ordersInWindow) ? session.ordersInWindow : [];
    const label = deriveLabelFromOrders(ordersInWindow);

    if (label === 1) purchasedSessions += 1;
    else abandonedSessions += 1;

    const userKey = session.user ? String(session.user) : "__anonymous__";
    if (!userStatsByKey.has(userKey) && session.user) {
      userStatsByKey.set(userKey, await getHistoricalUserStats(session.user, session));
    }

    const features = await buildFeatureVector(session, userStatsByKey.get(userKey) ? new Map([[userKey, userStatsByKey.get(userKey)]]) : new Map(), productsById);

    records.push({
      sessionId: session.sessionId,
      userId: session.user || null,
      features,
      label,
      datasetVersion,
      createdAt: new Date(),
      createdBy,
    });
  }

  return {
    records,
    totalSessions: sessions.length,
    processedSessions: records.length,
    purchasedSessions,
    abandonedSessions,
  };
};

const generateDataset = async ({ createdBy, datasetVersion, maxSessions = 5000 } = {}) => {
  const requestedVersion = datasetVersion || buildDatasetVersion("cartrescue");
  const existingVersion = await TrainingDataset.exists({ datasetVersion: requestedVersion });
  const version = existingVersion ? buildDatasetVersion(`${requestedVersion}-retry`) : requestedVersion;

  const completedSessions = await Session.aggregate([
    {
      $match: {
        status: "ended",
        startedAt: { $ne: null },
        endedAt: { $ne: null },
      },
    },
    buildOrderWindowLookupStage(),
    buildCartLookupStage(),
    {
      $addFields: {
        finalCart: {
          $let: {
            vars: {
              latestCart: {
                $max: {
                  $map: {
                    input: "$carts",
                    as: "cart",
                    in: { $ifNull: ["$$cart.updatedAt", "$$cart.createdAt"] },
                  },
                },
              },
            },
            in: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: "$carts",
                    as: "cart",
                    cond: {
                      $eq: [
                        { $ifNull: ["$$cart.updatedAt", "$$cart.createdAt"] },
                        "$$latestCart",
                      ],
                    },
                  },
                },
                0,
              ],
            },
          },
        },
      },
    },
    {
      $sort: { startedAt: -1 },
    },
    { $limit: Number(maxSessions) || 5000 },
  ]);

  const datasetResult = await createTrainingRecords(completedSessions, version, createdBy);

  const dataset = await TrainingDataset.create({
    datasetVersion: version,
    createdBy,
    numberOfRecords: datasetResult.records.length,
    totalSessions: datasetResult.totalSessions,
    processedSessions: datasetResult.processedSessions,
    purchasedSessions: datasetResult.purchasedSessions,
    abandonedSessions: datasetResult.abandonedSessions,
    generatedDate: new Date(),
    records: datasetResult.records,
  });

  return dataset;
};

const getDatasets = async (filters = {}, { page = 1, limit = 20 } = {}) => {
  const pageNumber = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));

  return TrainingDataset.find(filters)
    .populate("createdBy", "name email role")
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize);
};

const getDatasetById = async (datasetId) => TrainingDataset.findById(datasetId).populate("createdBy", "name email role");

const deleteDataset = async (datasetId) => TrainingDataset.findByIdAndDelete(datasetId);

const exportDataset = async ({ datasetId, format = "json", datasetVersion } = {}) => {
  const normalizedFormat = (format || "json").toLowerCase();
  const dataset = await TrainingDataset.findOne(datasetId ? { _id: datasetId } : { datasetVersion }).lean();
  if (!dataset) {
    throw new Error("Dataset not found");
  }

  const rows = Array.isArray(dataset.records) ? dataset.records : [];

  if (normalizedFormat === "json") {
    await TrainingDataset.updateOne({ _id: dataset._id }, { $set: { status: "exported" } });
    return {
      contentType: "application/json",
      filename: `${dataset.datasetVersion || "dataset"}.json`,
      body: JSON.stringify(rows, null, 2),
    };
  }

  const featureKeys = Array.from(
    new Set(
      rows.flatMap((row) => Object.keys(flattenFeatures(row.features || {})))
    )
  ).sort();

  const headers = ["sessionId", "userId", "label", "datasetVersion", "createdAt", ...featureKeys];
  const csvRows = [headers.join(",")];

  rows.forEach((row) => {
    const values = headers.map((header) => {
      if (header === "sessionId") return escapeCsvValue(row.sessionId || "");
      if (header === "userId") return escapeCsvValue(row.userId ? String(row.userId) : "");
      if (header === "label") return escapeCsvValue(row.label ?? 0);
      if (header === "datasetVersion") return escapeCsvValue(row.datasetVersion || dataset.datasetVersion || "");
      if (header === "createdAt") return escapeCsvValue(row.createdAt ? new Date(row.createdAt).toISOString() : "");
      const value = flattenFeatures(row.features || {})[header];
      return escapeCsvValue(value === undefined || value === null ? "" : value);
    });

    csvRows.push(values.join(","));
  });

  await TrainingDataset.updateOne({ _id: dataset._id }, { $set: { status: "exported" } });

  return {
    contentType: "text/csv",
    filename: `${dataset.datasetVersion || "dataset"}.csv`,
    body: csvRows.join("\n"),
  };
};

module.exports = {
  generateDataset,
  getDatasets,
  getDatasetById,
  deleteDataset,
  exportDataset,
  buildDatasetVersion,
  buildPriorUserStats,
  deriveLabelFromOrders,
};
