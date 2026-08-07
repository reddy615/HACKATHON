const { apiSuccess, apiError } = require('../../utils/apiResponse');
const { getRecommendation } = require('../services/recommendationService');

exports.recommend = async (req, res, next) => {
  try {
    const payload = {
      riskScore: req.body?.riskScore,
      paymentStatus: req.body?.paymentStatus,
      cartValue: req.body?.cartValue,
      deliveryEstimate: req.body?.deliveryEstimate,
      customerHistory: req.body?.customerHistory || {},
      sessionActivity: req.body?.sessionActivity || {},
    };

    const recommendation = getRecommendation(payload);

    res.status(200).json(apiSuccess('Recommendation generated', { recommendation }));
  } catch (error) {
    next(error);
  }
};
