const { apiSuccess, apiError } = require("../../utils/apiResponse");
const { loadDataset } = require("../services/datasetLoaderService");
const { trainModels } = require("../services/modelTrainingService");
const { getLatestModel, predictFromFeatures } = require("../services/predictionService");
const { createIntervention } = require("../services/interventionDecisionService");
const TrainedModel = require("../models/TrainedModel");
const PredictionHistory = require("../models/PredictionHistory");
const { buildRiskLevel, roundMetric } = require("../utils/mlUtils");

exports.trainModel = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json(apiError("Only admin users may train models", 403));
    }

    const dataset = await loadDataset({ datasetId: req.body?.datasetId, datasetVersion: req.body?.datasetVersion, latest: true });
    if (!dataset) {
      return res.status(404).json(apiError("No dataset available for training", 404));
    }

    const version = req.body?.modelVersion || `model-${Date.now()}`;
    const trainingResult = await trainModels({ dataset, datasetVersion: dataset.datasetVersion, version, createdBy: req.user._id });
    const bestModel = trainingResult.bestModel;

    const savedModel = await TrainedModel.create({
      modelName: bestModel.modelType,
      modelType: bestModel.modelType,
      datasetVersion: dataset.datasetVersion,
      datasetId: dataset._id,
      version,
      trainingConfig: { trainSize: trainingResult.evaluation.trainSize, testSize: trainingResult.evaluation.testSize },
      metrics: bestModel.metrics,
      featureNames: bestModel.featureNames,
      modelArtifacts: bestModel.modelArtifacts || {},
      trainingRecordCount: trainingResult.evaluation.trainSize + trainingResult.evaluation.testSize,
      testRecordCount: trainingResult.evaluation.testSize,
      selectionMetric: bestModel.selectionMetric || null,
      selectionValue: bestModel.selectionValue ?? null,
      selectionReason: bestModel.selectionReason || null,
      createdBy: req.user._id,
      isActive: true,
    });

    await TrainedModel.updateMany({ _id: { $ne: savedModel._id } }, { $set: { isActive: false } });

    res.status(201).json(apiSuccess("Model trained successfully", { model: savedModel, evaluation: trainingResult.evaluation, models: trainingResult.models }));
  } catch (error) {
    next(error);
  }
};

exports.listModels = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json(apiError("Only admin users may view models", 403));
    }

    const models = await TrainedModel.find({}).sort({ trainedAt: -1 }).lean();
    res.status(200).json(apiSuccess("Models fetched", { models }));
  } catch (error) {
    next(error);
  }
};

exports.getLatestModel = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json(apiError("Only admin users may view models", 403));
    }

    const model = await getLatestModel();
    if (!model) return res.status(404).json(apiError("No trained model found", 404));

    res.status(200).json(apiSuccess("Latest model fetched", { model }));
  } catch (error) {
    next(error);
  }
};

exports.predict = async (req, res, next) => {
  try {
    const prediction = await predictFromFeatures({
      features: req.body?.features || {},
      modelVersion: req.body?.modelVersion,
      datasetVersion: req.body?.datasetVersion,
      sessionId: req.body?.sessionId,
      userId: req.user?._id,
    });

    res.status(200).json(apiSuccess("Prediction generated", { prediction }));
  } catch (error) {
    next(error);
  }
};

exports.predictFromSession = async (req, res, next) => {
  try {
    const sessionId = req.params.sessionId;
    const Session = require("../../models/Session");
    const session = await Session.findOne({ sessionId }).lean();
    if (!session) return res.status(404).json(apiError("Session not found", 404));

    if (req.user && String(session.user) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json(apiError("Forbidden", 403));
    }

    const prediction = await predictFromFeatures({
      features: {
        sessionDuration: session.totalSessionSeconds || 0,
        totalEvents: Array.isArray(session.events) ? session.events.length : 0,
        pageViewCount: Array.isArray(session.pageViews) ? session.pageViews.length : 0,
        cartItemCount: Array.isArray(session.cartUpdates) ? session.cartUpdates.length : 0,
        checkoutStarted: Array.isArray(session.checkoutSteps) && session.checkoutSteps.length > 0 ? 1 : 0,
        paymentAttempts: Array.isArray(session.paymentAttempts) ? session.paymentAttempts.length : 0,
      },
      sessionId,
      userId: session.user,
    });

    const interventionResult = await createIntervention({
      prediction,
      sessionId,
      userId: session.user,
    });

    res.status(200).json(apiSuccess("Prediction generated from session", {
      prediction,
      intervention: interventionResult.intervention || null,
      decision: interventionResult.decision || null,
      createdIntervention: interventionResult.shouldIntervene || false,
    }));
  } catch (error) {
    next(error);
  }
};

exports.getEvaluation = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json(apiError("Only admin users may view evaluation metrics", 403));
    }

    const latestModel = await getLatestModel();
    if (!latestModel) return res.status(404).json(apiError("No model evaluation available", 404));

    res.status(200).json(apiSuccess("Evaluation fetched", { evaluation: latestModel.metrics }));
  } catch (error) {
    next(error);
  }
};

exports.getPredictionHistory = async (req, res, next) => {
  try {
    const query = req.user?.role === "admin" ? {} : { userId: req.user?._id };
    const history = await PredictionHistory.find(query).sort({ timestamp: -1 }).limit(50).lean();
    res.status(200).json(apiSuccess("Prediction history fetched", { history }));
  } catch (error) {
    next(error);
  }
};
