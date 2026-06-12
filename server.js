const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cors = require('cors');
const path = require('path'); // Correctly imported

const app = express();

// Increase limit to prevent 413 Payload Too Large
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------
// 1. Cloudinary & DB Setup
// ------------------------------
cloudinary.config({
    cloud_name: 'dcxsebtas',
    api_key: '872585929966168',
    api_secret: 't490x7y5jzQhZrJ8juEhNmjmLwI'
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: { folder: 'rj_sports_products', allowed_formats: ['jpg', 'png', 'jpeg', 'webp'] },
});
const upload = multer({ storage: storage });

const MONGO_URI = "mongodb+srv://Ram_Jadhav:Ram%401234@cluster0.5ii6lfb.mongodb.net/rjsports?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected!"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// ------------------------------
// 2. Schemas
// ------------------------------
const productSchema = new mongoose.Schema({
    productId: { type: String, unique: true, required: true },
    name: String,
    price: Number,
    category: String,
    images: [String],
    isOutOfStock: { type: Boolean, default: false },
    availableSizes: [String],
    stockStatus: String
});
const Product = mongoose.model('Product', productSchema);

const orderSchema = new mongoose.Schema({
    orderId: String,
    customer: String,
    phone: String,
    email: String,
    total: Number,
    status: { type: String, default: 'Processing' },
    date: { type: Date, default: Date.now },
    items: [{
        name: String,
        price: Number,
        quantity: Number,
        size: String,
        image: String
    }]
});
// Declared ONLY ONCE
const Order = mongoose.model('Order', orderSchema); 

// ------------------------------
// 3. API ROUTES
// ------------------------------
app.get('/api/products', async (req, res) => {
    try { const products = await Product.find(); res.json({ success: true, products }); }
    catch (err) { res.status(500).json({ success: false, message: "Failed to fetch products" }); }
});

app.post('/api/products/add', upload.array('productImages', 3), async (req, res) => {
    try {
        const { productId, name, price, category, availableSizes, stockStatus, images } = req.body;
        let existingImages = [];
        try { existingImages = images ? JSON.parse(images) : []; } catch(e) {}
        const newImagePaths = req.files ? req.files.map(file => file.path) : [];
        const finalImages = [...existingImages, ...newImagePaths];

        const updatedProduct = await Product.findOneAndUpdate(
            { productId },
            { 
                name, 
                price: parseFloat(price), 
                category: category || 'Uncategorized',
                isOutOfStock: stockStatus === 'out-of-stock',
                availableSizes: availableSizes ? availableSizes.split(',') : [],
                stockStatus: stockStatus || 'in-stock',
                images: finalImages
            },
            { upsert: true, new: true }
        );
        res.json({ success: true, product: updatedProduct });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cors = require('cors');
const path = require('path'); // Correctly imported

const app = express();

// Increase limit to prevent 413 Payload Too Large
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------
// 1. Cloudinary & DB Setup
// ------------------------------
cloudinary.config({
    cloud_name: 'dcxsebtas',
    api_key: '872585929966168',
    api_secret: 't490x7y5jzQhZrJ8juEhNmjmLwI'
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: { folder: 'rj_sports_products', allowed_formats: ['jpg', 'png', 'jpeg', 'webp'] },
});
const upload = multer({ storage: storage });

const MONGO_URI = "mongodb+srv://Ram_Jadhav:Ram%401234@cluster0.5ii6lfb.mongodb.net/rjsports?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected!"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// ------------------------------
// 2. Schemas
// ------------------------------
const productSchema = new mongoose.Schema({
    productId: { type: String, unique: true, required: true },
    name: String,
    price: Number,
    category: String,
    images: [String],
    isOutOfStock: { type: Boolean, default: false },
    availableSizes: [String],
    stockStatus: String
});
const Product = mongoose.model('Product', productSchema);

const orderSchema = new mongoose.Schema({
    orderId: String,
    customer: String,
    phone: String,
    email: String,
    total: Number,
    status: { type: String, default: 'Processing' },
    date: { type: Date, default: Date.now },
    items: [{
        name: String,
        price: Number,
        quantity: Number,
        size: String,
        image: String
    }]
});
// Declared ONLY ONCE
const Order = mongoose.model('Order', orderSchema); 

// ------------------------------
// 3. API ROUTES
// ------------------------------
app.get('/api/products', async (req, res) => {
    try { const products = await Product.find(); res.json({ success: true, products }); }
    catch (err) { res.status(500).json({ success: false, message: "Failed to fetch products" }); }
});

app.post('/api/products/add', upload.array('productImages', 3), async (req, res) => {
    try {
        const { productId, name, price, category, availableSizes, stockStatus, images } = req.body;
        let existingImages = [];
        try { existingImages = images ? JSON.parse(images) : []; } catch(e) {}
        const newImagePaths = req.files ? req.files.map(file => file.path) : [];
        const finalImages = [...existingImages, ...newImagePaths];

        const updatedProduct = await Product.findOneAndUpdate(
            { productId },
            { 
                name, 
                price: parseFloat(price), 
                category: category || 'Uncategorized',
                isOutOfStock: stockStatus === 'out-of-stock',
                availableSizes: availableSizes ? availableSizes.split(',') : [],
                stockStatus: stockStatus || 'in-stock',
                images: finalImages
            },
            { upsert: true, new: true }
        );
        res.json({ success: true, product: updatedProduct });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/orders', async (req, res) => {
    try { const orders = await Order.find().sort({ date: -1 }); res.json({ success: true, orders }); }
    catch (err) { res.status(500).json({ success: false, message: "Failed to fetch orders" }); }
});

app.post('/api/orders', async (req, res) => {
    try { const newOrder = new Order(req.body); await newOrder.save(); res.status(201).json({ success: true, order: newOrder }); }
    catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Production Catch-all
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
app.get('/api/orders', async (req, res) => {
    try { const orders = await Order.find().sort({ date: -1 }); res.json({ success: true, orders }); }
    catch (err) { res.status(500).json({ success: false, message: "Failed to fetch orders" }); }
});

app.post('/api/orders', async (req, res) => {
    try { const newOrder = new Order(req.body); await newOrder.save(); res.status(201).json({ success: true, order: newOrder }); }
    catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Production Catch-all
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));