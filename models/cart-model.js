const mongoose = require("mongoose");



const CartSchema = new mongoose.Schema({
    userId: String,
    products: Array,
    status: {
        type: String,
        default: "Cart",    
    },
    
}, { timestamps: true });



module.exports = mongoose.model("cart", CartSchema);