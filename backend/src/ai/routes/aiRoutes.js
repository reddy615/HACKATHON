const express = require("express");
const { generateDataset, listDatasets, getDatasetById, deleteDataset, exportDataset } = require("../controllers/datasetController");
const { protect, authorize } = require("../../middleware");

const router = express.Router();

/**
 * @openapi
 * /api/ai/generate-dataset:
 *   post:
 *     summary: Generate a machine-learning-ready dataset from processed sessions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               datasetVersion:
 *                 type: string
 *               maxSessions:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Dataset generated
 */
router.post("/generate-dataset", protect, authorize("admin"), generateDataset);

/**
 * @openapi
 * /api/ai/datasets:
 *   get:
 *     summary: List all generated datasets
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dataset list returned
 */
router.get("/datasets", protect, authorize("admin"), listDatasets);

/**
 * @openapi
 * /api/ai/dataset/{id}:
 *   get:
 *     summary: Fetch a dataset by ID
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dataset details returned
 */
router.get("/dataset/:id", protect, authorize("admin"), getDatasetById);

/**
 * @openapi
 * /api/ai/dataset/{id}:
 *   delete:
 *     summary: Delete a dataset version
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dataset deleted
 */
router.delete("/dataset/:id", protect, authorize("admin"), deleteDataset);

/**
 * @openapi
 * /api/ai/export:
 *   post:
 *     summary: Export a dataset as CSV or JSON
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               datasetId:
 *                 type: string
 *               datasetVersion:
 *                 type: string
 *               format:
 *                 type: string
 *                 enum: [json, csv]
 *     responses:
 *       200:
 *         description: Export file returned
 */
router.post("/export", protect, authorize("admin"), exportDataset);

module.exports = router;
