const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cors = require('cors');

const app = express();
// Change these lines at the top of server.js
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Replace the "Production Bridge" in server.js with this:
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// ------------------------------
// 1. Cloudinary Setup
// ------------------------------
cloudinary.config({
    cloud_name: 'dcxsebtas',
    api_key: '872585929966168',
    api_secret: 't490x7y5jzQhZrJ8juEhNmjmLwI'
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'rj_sports_products',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});
const upload = multer({ storage: storage });

// ------------------------------
// 2. MongoDB Connection
// ------------------------------
const MONGO_URI = "mongodb+srv://Ram_Jadhav:Ram%401234@cluster0.5ii6lfb.mongodb.net/rjsports?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected!"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// ------------------------------
// 3. Database Schemas
// ------------------------------
const productSchema = new mongoose.Schema({
    productId: { type: String, unique: true, required: true },
    name: String,
    price: Number,
    category: String,
    images: [String],
    isOutOfStock: { type: Boolean, default: false },
    availableSizes: [String],     // added for size support
    stockStatus: String            // added to match frontend expectations
});

const Product = mongoose.model('Product', productSchema);

const orderSchema = new mongoose.Schema({
    orderId: String,
    customer: String,
    phone: String,
    total: Number,
    status: { type: String, default: 'Processing' },
    date: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// ------------------------------
// 4. API ROUTES
// ------------------------------

// ---- PRODUCT ROUTES ----

// GET all products
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
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

app.post('/api/products/add', upload.array('productImages', 3), async (req, res) => {
    try {
        const { productId, name, price, category, availableSizes, stockStatus } = req.body;

        if (!productId || !name || !price) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // 1. Parse existing images sent from frontend (JSON string)
        let existingImages = [];
        if (req.body.images) {
            try {
                existingImages = JSON.parse(req.body.images);
                if (!Array.isArray(existingImages)) existingImages = [];
            } catch(e) { existingImages = []; }
        }

        // 2. Get newly uploaded image paths
        const newImagePaths = req.files ? req.files.map(file => file.path) : [];

        // 3. Merge: existing (which already includes deletions) + new uploads
        const finalImages = [...existingImages, ...newImagePaths];

        // 4. Build update data
        const updateData = {
            name,
            price: parseFloat(price),
            category: category || 'Uncategorized',
            isOutOfStock: stockStatus === 'out-of-stock',
            availableSizes: availableSizes ? availableSizes.split(',') : [],
            stockStatus: stockStatus || 'in-stock',
            images: finalImages   // ← key change
        };

        const updatedProduct = await Product.findOneAndUpdate(
            { productId },
            { $set: updateData },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: "✅ Product saved/updated", product: updatedProduct });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});
// UPDATE product stock/sizes (alternative endpoint)
app.post('/api/products/update', async (req, res) => {
    try {
        const { productId, availableSizes, stockStatus } = req.body;  // use productId, not name
        if (!productId) {
            return res.status(400).json({ success: false, message: "productId required" });
        }
        const updateFields = {};
        if (availableSizes) updateFields.availableSizes = availableSizes;
        if (stockStatus) {
            updateFields.stockStatus = stockStatus;
            updateFields.isOutOfStock = (stockStatus === 'out-of-stock');
        }
        const updated = await Product.findOneAndUpdate(
            { productId },
            { $set: updateFields },
            { new: true }
        );
        if (!updated) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        res.json({ success: true, product: updated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
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

// GET all orders (sorted newest first)
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ date: -1 });
        res.json({ success: true, orders });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Failed to fetch orders" });
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

// (Optional) POST new order – add if your frontend creates orders
app.post('/api/orders', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        await newOrder.save();
        res.status(201).json({ success: true, order: newOrder });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ------------------------------
// 5. Start Server
// ------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));