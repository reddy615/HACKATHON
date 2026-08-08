const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { env } = require("../src/config/env");
const User = require("../src/models/User");
const Product = require("../src/models/Product");

async function seed() {
  await mongoose.connect(env.MONGODB_URI);

  // Do NOT delete or modify existing users. Upsert demo users only if missing.
  // NOTE: do not delete existing products to avoid removing production data.
  // Instead, upsert new products so existing entries remain unchanged.

  const adminPassword = await bcrypt.hash("admin123", 10);
  const customerPassword = await bcrypt.hash("customer123", 10);

  // Upsert demo users without modifying existing accounts.
  await User.findOneAndUpdate(
    { email: 'admin@cartrescue.ai' },
    { $setOnInsert: { name: 'Admin User', email: 'admin@cartrescue.ai', password: adminPassword, role: 'admin' } },
    { upsert: true }
  );
  await User.findOneAndUpdate(
    { email: 'customer@cartrescue.ai' },
    { $setOnInsert: { name: 'Customer User', email: 'customer@cartrescue.ai', password: customerPassword, role: 'customer' } },
    { upsert: true }
  );

  // Upsert a small set of base products (use $setOnInsert to avoid modifying existing records)
  const baseProducts = [
    { name: "Smart Headphones", description: "Noise cancelling over-ear headphones", price: 129.99, stock: 25, category: "electronics" },
    { name: "Ergonomic Chair", description: "Comfortable office chair", price: 199.5, stock: 10, category: "furniture" },
    { name: "Running Shoes", description: "Lightweight athletic shoes", price: 89.99, stock: 40, category: "fashion" },
  ];

  for (const p of baseProducts) {
    await Product.findOneAndUpdate({ name: p.name }, { $setOnInsert: p }, { upsert: true });
  }

  // Additional realistic products to expand catalog. We'll upsert each by name.
  const additional = [
    { name: 'Sony WH-CH520 Wireless Headphones', description: 'Lightweight wireless on-ear headphones with long battery life.', price: 2999, stock: 50, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1585386959984-a415522c5d88?auto=format&fit=crop&w=800&q=80' },
    { name: 'JBL Tune 770NC', description: 'Active noise cancelling over-ear headphones with JBL Pure Bass.', price: 6999, stock: 30, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80' },
    { name: 'boAt Rockerz 450', description: 'Deep bass on-ear wireless headphones.', price: 2499, stock: 60, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1516728778615-2d590ea1856f?auto=format&fit=crop&w=800&q=80' },
    { name: 'Samsung Galaxy Buds FE', description: 'True wireless earbuds with comfortable fit and clear calls.', price: 3999, stock: 45, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1585386959985-8b8b6a0f1f1b?auto=format&fit=crop&w=800&q=80' },
    { name: 'JBL Go 4 Portable Speaker', description: 'Compact Bluetooth speaker with vibrant sound.', price: 1499, stock: 80, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1518444021688-5f8c8b1b5a6b?auto=format&fit=crop&w=800&q=80' },

    { name: 'Logitech MX Master 3S Mouse', description: 'Advanced wireless mouse for creators with ergonomic design.', price: 9999, stock: 25, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1587825140708-3d7f1d6b7f8a?auto=format&fit=crop&w=800&q=80' },
    { name: 'Logitech K380 Wireless Keyboard', description: 'Compact multi-device Bluetooth keyboard.', price: 2299, stock: 40, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1581349481981-0635c2a6a3d8?auto=format&fit=crop&w=800&q=80' },
    { name: 'HP Wireless Keyboard and Mouse Combo', description: 'Reliable wireless keyboard and mouse set for home and office.', price: 1799, stock: 35, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1587825140709-3e6b6c1b7f7a?auto=format&fit=crop&w=800&q=80' },
    { name: 'Dell Premier Webcam', description: 'Full HD webcam for crisp video calls.', price: 4499, stock: 20, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1588694894510-6e545b5f7d6a?auto=format&fit=crop&w=800&q=80' },
    { name: 'TP-Link USB Wi-Fi Adapter', description: 'USB adapter to add Wi-Fi 802.11ac support to laptops.', price: 1299, stock: 70, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b82b0d4?auto=format&fit=crop&w=800&q=80' },

    { name: 'Anker 20W USB-C Charger', description: 'Fast-charging 20W wall charger with compact design.', price: 999, stock: 120, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1617726920956-a3a9f3c6e3f9?auto=format&fit=crop&w=800&q=80' },
    { name: 'boAt Type-C Fast Charger', description: 'High-speed USB-C charger for modern smartphones.', price: 799, stock: 110, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1597932920729-0c9b973b0f0a?auto=format&fit=crop&w=800&q=80' },
    { name: 'Samsung 25W Fast Charger', description: 'Official Samsung fast charger for Galaxy devices.', price: 1299, stock: 90, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1597932920730-1a7a4d3b0f0b?auto=format&fit=crop&w=800&q=80' },
    { name: 'Anker PowerCore Power Bank 10000mAh', description: 'Portable power bank with high-speed charging.', price: 1999, stock: 85, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1580910051071-31c9a4b4b8f7?auto=format&fit=crop&w=800&q=80' },
    { name: 'Spigen Tough Armor Case', description: 'Durable smartphone protective case with raised bezels.', price: 799, stock: 200, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1580910051072-41c9a4b4b8f8?auto=format&fit=crop&w=800&q=80' },

    { name: 'Acer 24-inch Full HD Monitor', description: '24" FHD IPS monitor with slim bezels and vibrant colors.', price: 8999, stock: 18, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80' },
    { name: 'LG 27-inch Full HD Monitor', description: '27" monitor ideal for productivity and light gaming.', price: 12999, stock: 12, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80' },
    { name: 'Lenovo Tab M11', description: '11-inch tablet for media consumption and productivity.', price: 10999, stock: 22, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80' },
    { name: 'Samsung Galaxy Tab A9', description: 'Compact tablet with smooth display and battery life.', price: 9999, stock: 20, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1517336714732-489689fd1ca9?auto=format&fit=crop&w=800&q=80' },
    { name: 'Amazon Fire TV Stick', description: 'Streaming media player with voice remote.', price: 3999, stock: 60, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1581579189221-1d8b6b6d9f8a?auto=format&fit=crop&w=800&q=80' },

    { name: 'Sony DualSense Wireless Controller', description: 'PlayStation 5 controller with haptic feedback.', price: 5999, stock: 30, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1606813902845-7b9d4a0e3a1b?auto=format&fit=crop&w=800&q=80' },
    { name: 'Xbox Wireless Controller', description: 'Official Xbox controller with ergonomic design.', price: 5499, stock: 28, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1606813902846-7b9d4a0e3a1c?auto=format&fit=crop&w=800&q=80' },
    { name: 'Logitech G102 Gaming Mouse', description: 'Wired gaming mouse with adjustable DPI.', price: 1299, stock: 75, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1584270354949-0b0f4a9e3aef?auto=format&fit=crop&w=800&q=80' },
    { name: 'Redragon Mechanical Gaming Keyboard', description: 'RGB backlit mechanical keyboard popular with gamers.', price: 2999, stock: 40, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1517336714733-489689fd1cab?auto=format&fit=crop&w=800&q=80' },
    { name: 'HyperX Cloud Gaming Headset', description: 'Comfortable headset with clear mic and soundstage.', price: 3999, stock: 35, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1585386959986-a5a9f3c6e3fa?auto=format&fit=crop&w=800&q=80' },

    { name: 'Philips Smart LED Bulb', description: 'Color-changing smart bulb compatible with major assistants.', price: 1499, stock: 120, category: 'home', imageUrl: 'https://images.unsplash.com/photo-1505692794404-79b6e77a1f3a?auto=format&fit=crop&w=800&q=80' },
    { name: 'TP-Link Smart Wi-Fi Plug', description: 'Control appliances remotely via app or voice assistant.', price: 999, stock: 150, category: 'home', imageUrl: 'https://images.unsplash.com/photo-1581093588401-7a0eeb3b9f2e?auto=format&fit=crop&w=800&q=80' },
    { name: 'Xiaomi Smart Camera', description: 'Home security camera with night vision and motion detection.', price: 2499, stock: 70, category: 'home', imageUrl: 'https://images.unsplash.com/photo-1582719478178-5c6d8b1f1f6a?auto=format&fit=crop&w=800&q=80' },
    { name: 'Amazon Echo Dot (4th Gen)', description: 'Compact smart speaker with Alexa.', price: 3499, stock: 90, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1582719478179-5c6d8b1f1f6b?auto=format&fit=crop&w=800&q=80' },
    { name: 'Smart LED Light Strip', description: 'Multi-color LED strip with remote and app control.', price: 1199, stock: 140, category: 'home', imageUrl: 'https://images.unsplash.com/photo-1582719478180-5c6d8b1f1f6c?auto=format&fit=crop&w=800&q=80' },

    { name: 'Logitech Laptop Stand', description: 'Adjustable stand to elevate and cool laptops.', price: 1499, stock: 60, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1587825140710-3d6b6c1b7f7b?auto=format&fit=crop&w=800&q=80' },
    { name: 'USB-C 7-in-1 Hub', description: 'Multiport hub with HDMI, USB-A, Ethernet and card readers.', price: 2499, stock: 80, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1587829741299-1c7b9b1b7f7c?auto=format&fit=crop&w=800&q=80' },
    { name: 'Portronics Laptop Cooling Pad', description: 'Cooling pad with adjustable fan speeds for laptops.', price: 1299, stock: 50, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1587829741300-1d7b9b1b7f7d?auto=format&fit=crop&w=800&q=80' },
    { name: 'Lenovo Wireless Mouse', description: 'Compact wireless mouse for everyday use.', price: 799, stock: 140, category: 'electronics', imageUrl: 'https://images.unsplash.com/photo-1587829741302-1e7b9b1b7f7e?auto=format&fit=crop&w=800&q=80' },
    { name: 'HP Laptop Backpack', description: 'Durable backpack with laptop compartment and multiple pockets.', price: 1999, stock: 65, category: 'fashion', imageUrl: 'https://images.unsplash.com/photo-1519744792095-2f2205e87b6f?auto=format&fit=crop&w=800&q=80' },
  ];

  for (const p of additional) {
    await Product.findOneAndUpdate({ name: p.name }, { $setOnInsert: p }, { upsert: true });
  }

  console.log("Seed data created successfully");
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
