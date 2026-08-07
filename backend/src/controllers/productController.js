const Product = require("../models/Product");
const { apiSuccess, apiError } = require("../utils/apiResponse");
const logger = require("../utils/logger");

exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    logger.info(`Product created: ${product.name}`);
    res.status(201).json(apiSuccess("Product created successfully", { product }));
  } catch (error) {
    next(error);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const { search, category, minPrice, maxPrice, sort = "featured" } = req.query;
    const filter = { isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    if (category && category !== "all") {
      filter.category = category;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const sortMap = {
      featured: { createdAt: -1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      name_asc: { name: 1 },
    };

    const products = await Product.find(filter).sort(sortMap[sort] || sortMap.featured);

    res.status(200).json(
      apiSuccess("Products fetched", {
        products,
        filters: {
          search: search || "",
          category: category || "all",
          minPrice: minPrice || "",
          maxPrice: maxPrice || "",
          sort,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json(apiError("Product not found", 404));
    res.status(200).json(apiSuccess("Product fetched", { product }));
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json(apiError("Product not found", 404));
    res.status(200).json(apiSuccess("Product updated", { product }));
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json(apiError("Product not found", 404));
    res.status(200).json(apiSuccess("Product deleted", {}));
  } catch (error) {
    next(error);
  }
};
