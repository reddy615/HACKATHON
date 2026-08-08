const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const isValidMongoIdValue = (value) => {
  if (!value) return false;
  if (value instanceof mongoose.Types.ObjectId) return true;
  if (typeof value === 'string') return mongoose.Types.ObjectId.isValid(value.trim());
  return false;
};
const validator = [body('productId').custom((value) => isValidMongoIdValue(value)).withMessage('Valid product id is required')];
(async () => {
  const req = { body: { productId: new mongoose.Types.ObjectId().toString() } };
  const res = {};
  const next = () => {};
  await validator[0](req, res, next);
  console.log(validationResult(req).array());
})();
