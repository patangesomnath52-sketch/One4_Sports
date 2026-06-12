const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// CRITICAL FIX: Increased limit to 10mb so Base64 images don't crash the server
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());
app.use(express.static(__dirname));

// ------------------------------
// 1. MongoDB Connection
// ------------------------------
const MONGO_URI = "mongodb+srv://Ram_Jadhav:Ram%401234@cluster0.5ii6lfb.mongodb.net/rjsports?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected!"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// ------------------------------
// 2. Database Schemas
// ------------------------------
const productSchema = new mongoose.Schema({
    productId: { type: String, unique: true, required: true },
    name: String,
    price: Number,
    category: String,
    description: String,
    images: [String],
    isOutOfStock: { type: Boolean, default: false },
    availableSizes: [String], 
    sizes: [{ size: String, status: String }], // To store exact size data from your dashboard
    stockStatus: String 
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
const orderSchema = new mongoose.Schema({
    orderId: String,
    customer: String,
    total: Number,
    status: { type: String, default: 'Processing' },
    date: { type: Date, default: Date.now },
    items: [{ // <--- NEW: Store the actual products
        name: String,
        price: Number,
        quantity: Number,
        size: String,
        image: String
    }],
    address: String // Add shipping details
});

const Order = mongoose.model('Order', orderSchema);

// ------------------------------
// 3. API ROUTES
// ------------------------------

// ---- PRODUCT ROUTES ----

// GET all products
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json({ success: true, products });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Failed to fetch products" });
    }
});

// GET single product by productId
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findOne({ productId: req.params.id });
        if (product) {
            res.json({ success: true, product });
        } else {
            res.status(404).json({ success: false, message: "Product not found" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// POST (Add) new product - FIXED FOR JSON BASE64 UPLOADS
app.post('/api/products/add', async (req, res) => {
    try {
        console.log("Received product payload:", req.body.productId);
        
        const { productId, name, price, category, description, images, sizes, stockStatus } = req.body;

        if (!productId || !name || !price) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Map sizes array for simple availableSizes list
        const availableSizes = sizes ? sizes.filter(s => s.status !== 'Sold Out').map(s => s.size) : [];

        const updateData = {
            name,
            price: parseFloat(price),
            category: category || 'Uncategorized',
            description: description || '',
            isOutOfStock: stockStatus === 'out-of-stock',
            sizes: sizes || [],
            availableSizes: availableSizes,
            stockStatus: stockStatus || 'in-stock',
            images: images || [] 
        };

        const updatedProduct = await Product.findOneAndUpdate(
            { productId },
            { $set: updateData },
            { upsert: true, new: true }
        );

        res.status(201).json({ success: true, message: "✅ Product deployed successfully", product: updatedProduct });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE product
app.delete('/api/products/:id', async (req, res) => {
    try {
        const deleted = await Product.findOneAndDelete({ productId: req.params.id });
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        res.json({ success: true, message: "Product deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Failed to delete" });
    }
});

// ---- ORDER ROUTES ----

// CRITICAL FIX: Changed from app.post to app.get
// GET all orders for the dashboard
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ date: -1 });
        res.status(200).json({ success: true, orders });
    } catch (err) {
        console.error("Error fetching orders:", err);
        res.status(500).json({ success: false, message: "Server error fetching orders" });
    }
});

// POST new order (with stock verification)
app.post('/api/orders', async (req, res) => {
    try {
        const { productId } = req.body;
        
        // 1. Verify stock if productId is provided
        if (productId) {
            const product = await Product.findOne({ productId: productId });
            if (product && product.stockStatus === 'out-of-stock') {
                return res.status(400).json({ 
                    success: false, 
                    message: "This product is currently unavailable." 
                });
            }
        }

        // 2. Save order
        const newOrder = new Order(req.body);
        await newOrder.save();
        res.status(201).json({ success: true, order: newOrder });
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Order failed" });
    }
});

// UPDATE order status (used by dashboard dropdown)
app.patch('/api/orders/:orderId/status', async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }
        
        const order = await Order.findOneAndUpdate(
            { orderId: req.params.orderId },
            { status },
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        
        res.json({ success: true, order });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ------------------------------
// 4. Start Server
// ------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));