const { apiSuccess, apiError } = require("../../utils/apiResponse");
const { generateDataset, getDatasets, getDatasetById, deleteDataset, exportDataset } = require("../services/datasetBuilderService");

exports.generateDataset = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json(apiError("Only admin users may generate datasets", 403));
    }

    const rawMaxSessions = Number(req.body?.maxSessions ?? 5000);
    if (!Number.isInteger(rawMaxSessions) || rawMaxSessions <= 0 || rawMaxSessions > 10000) {
      return res.status(400).json(apiError("maxSessions must be a positive integer up to 10000", 400));
    }

    const datasetVersion = typeof req.body?.datasetVersion === "string" && req.body.datasetVersion.trim()
      ? req.body.datasetVersion.trim()
      : undefined;

    const dataset = await generateDataset({
      createdBy: req.user._id,
      datasetVersion,
      maxSessions: rawMaxSessions,
    });

    res.status(201).json(apiSuccess("Dataset generated successfully", { dataset }));
  } catch (error) {
    next(error);
  }
};

exports.listDatasets = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json(apiError("Only admin users may view datasets", 403));
    }

    const datasets = await getDatasets({}, { page: req.query.page, limit: req.query.limit });
    res.status(200).json(apiSuccess("Datasets fetched", { datasets }));
  } catch (error) {
    next(error);
  }
};

exports.getDatasetById = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json(apiError("Only admin users may view datasets", 403));
    }

    const dataset = await getDatasetById(req.params.id);
    if (!dataset) return res.status(404).json(apiError("Dataset not found", 404));

    res.status(200).json(apiSuccess("Dataset fetched", { dataset }));
  } catch (error) {
    next(error);
  }
};

exports.deleteDataset = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json(apiError("Only admin users may delete datasets", 403));
    }

    const dataset = await deleteDataset(req.params.id);
    if (!dataset) return res.status(404).json(apiError("Dataset not found", 404));

    res.status(200).json(apiSuccess("Dataset deleted", { datasetId: req.params.id }));
  } catch (error) {
    next(error);
  }
};

exports.exportDataset = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json(apiError("Only admin users may export datasets", 403));
    }

    const format = (req.body?.format || "json").toLowerCase();
    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json(apiError("format must be either json or csv", 400));
    }

    if (!req.body?.datasetId && !req.body?.datasetVersion) {
      return res.status(400).json(apiError("datasetId or datasetVersion is required", 400));
    }

    const exportPayload = await exportDataset({ datasetId: req.body?.datasetId, datasetVersion: req.body?.datasetVersion, format });

    res.setHeader("Content-Type", exportPayload.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${exportPayload.filename}"`);
    res.status(200).send(exportPayload.body);
  } catch (error) {
    next(error);
  }
};
