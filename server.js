const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// 1. Cloudinary Configuration
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

// 2. MongoDB Connection
const MONGO_URI = "mongodb+srv://Ram_Jadhav:Ram%401234@cluster0.5ii6lfb.mongodb.net/rjsports?retryWrites=true&w=majority"; 
mongoose.connect(MONGO_URI).then(() => console.log("✅ MongoDB Connected!"));

// 3. Models
const Product = mongoose.model('Product', new mongoose.Schema({
    productId: { type: String, unique: true, required: true },
    name: String, price: Number, category: String, images: [String], isOutOfStock: Boolean
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    orderId: String, customer: String, phone: String, total: Number, status: String, date: { type: Date, default: Date.now }
}));

// 4. API Routes
app.post('/api/products/add', upload.array('productImages', 3), async (req, res) => {
    try {
        const imagePaths = req.files.map(file => file.path);
        // UPSERT LOGIC: Update if exists, Create if new
        await Product.findOneAndUpdate(
            { productId: req.body.productId },
            { 
                $set: {
                    name: req.body.name,
                    price: req.body.price,
                    category: req.body.category,
                    images: imagePaths.length > 0 ? imagePaths : undefined,
                    isOutOfStock: false
                }
            },
            { upsert: true, new: true }
        );
        res.json({ success: true, message: "Product saved!" });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/orders', async (req, res) => {
    const orders = await Order.find().sort({ date: -1 });
    res.json({ success: true, orders });
});

app.post('/api/orders/update-status', async (req, res) => {
    await Order.findOneAndUpdate({ orderId: req.body.orderId }, { status: req.body.status });
    res.json({ success: true });
});

app.get('/api/products', async (req, res) => {
    const products = await Product.find();
    res.json({ success: true, products });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));