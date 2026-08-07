const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { env } = require("../src/config/env");
const User = require("../src/models/User");
const Product = require("../src/models/Product");

async function seed() {
  await mongoose.connect(env.MONGODB_URI);

  await User.deleteMany({});
  await Product.deleteMany({});

  const adminPassword = await bcrypt.hash("admin123", 10);
  const customerPassword = await bcrypt.hash("customer123", 10);

  await User.create([
    { name: "Admin User", email: "admin@cartrescue.ai", password: adminPassword, role: "admin" },
    { name: "Customer User", email: "customer@cartrescue.ai", password: customerPassword, role: "customer" },
  ]);

  await Product.create([
    { name: "Smart Headphones", description: "Noise cancelling over-ear headphones", price: 129.99, stock: 25, category: "electronics" },
    { name: "Ergonomic Chair", description: "Comfortable office chair", price: 199.5, stock: 10, category: "furniture" },
    { name: "Running Shoes", description: "Lightweight athletic shoes", price: 89.99, stock: 40, category: "fashion" },
  ]);

  console.log("Seed data created successfully");
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
