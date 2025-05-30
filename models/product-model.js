const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true
    },
    mrp: {
        type: String,
        required: true
    },
    price: {
        type: String,
        required: true
    },
    size: {
        type: String
    },
    sellerId: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true  
    },
    sellerName: {
        type: String,
        required: true
    },
    relatedTo: {
        type: String,
        required: true
    }, 
    category: {
        type: String,
        required: true
    }, 
    status: {
        type: String,
        default: "approved"
    },
    // New fields added
    dressStyles: {
        type: [String],
        enum: ['casual', 'formal', 'party', 'work'],
        default: []
    },
    dressFit: {
        type: String,
        enum: ['slim', 'regular', 'loose', 'oversized'],
        default: null
    },
    colorPreferences: {
        type: [String],
        enum: ['pastel', 'bright', 'neutral', 'dark'],
        default: []
    },
    // Optional image field
    image: {
        type: String,
        default: null
    }
});

module.exports = mongoose.model("product", ProductSchema);