const SellerModel = require('../models/seller-model')
const ProductModel = require('../models/product-model')
const OrderModel = require('../models/order-model');
const AddressModal = require('../models/address-model')
const bcrypt = require("bcrypt");
const cartModel = require('../models/cart-model');


const getSellerHomePage = async (req, res) => {
    //fetch all products and seller details 
    try {
        let { seller } = req.session;
        let products = await ProductModel.find({ sellerId: seller._id });
        res.render('seller/sellerHome', { products, seller });
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Error Occured. Please Retry !!!";
        res.redirect("/seller")
    }

}

const getSellerSignupPage = function (req, res, next) {
    res.render('seller/sellerRegister', { homepage: true })
}
const doSignup = async (req, res) => {
    console.log(req.body);
    try {
        console.log(req.body, req.body.password);
        let { password } = req.body;
        req.body.password = await bcrypt.hash(password, 10)
        const seller = await SellerModel.create(req.body);
        res.redirect('/seller')
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Couldn't perform signup Please Retry (with a new email) !!!";
        res.redirect("/seller/register")
    }

}

const getSellerLoginPage = (req, res) => {
    let { seller } = req.session;
    if (seller)
        res.redirect("/seller/sellerHome")
    else
        res.render('seller/sellerLogin', { homepage: true })
}
const doLogin = async (req, res) => {
    try {
        console.log(req.body, req.body.password);
        let { password } = req.body;
        const seller = await SellerModel.findOne({ email: req.body.email, status: "approved" });
        if (seller) {
            const exist = await bcrypt.compare(password, seller.password);
            if (exist) {
                req.session.seller = seller;
                return res.redirect("/seller/sellerHome");
            }
        } else {
            req.session.alertMessage = "Invalid seller Credentials";
            res.redirect("/seller/login");
        }
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Error Occured. Please Retry !!!";
        res.redirect("/seller/login")
    }
}
const logout = (req, res) => {
    req.session.seller = false;
    res.redirect('/')
}

const getAddProductPage = (req, res) => {
    res.render('seller/addProduct', { homepage: true })
}
const addNewProduct = async function (req, res) {
    try {
         console.log(req.body, "------------------------");
        let { userName, _id } = req.session.seller;
        req.body.sellerId = _id;
        req.body.sellerName = userName;
        let product = await ProductModel.create(req.body);
        let { image } = req.files;
        image.mv('./public/images/product/' + product._id + ".jpg").then((err) => {
            if (!err) {
                req.session.alertMessage = " successfully Added new Product"
                return res.redirect('/seller/sellerHome')
            }
            res.redirect('/seller/sellerHome')
        })
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Error Occured. Please Retry !!!";
        res.redirect("/seller")
    }
}

const getSellerOrders = async (req, res) => {
    try {
        let { seller } = req.session;
        // let orders = await OrderModel.find({ sellerId: seller._id})
        const orders = await cartModel.find({ status: "compleated" });   
        console.log(orders, "-------------------");
        orders.map((obj)=>{
            obj.products.map((product)=>{
                console.log(product, "------------------console-"); 
            })
        })
        res.render('seller/orders', { title: "All Orders", orders, seller, homepage: true, completed: "completed orders" })
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Couldn't perform request Please Retry!!!";
        res.redirect("/seller")
    }
}
const getAddress = async(req,res)=>{
        try {
            let id = req.params.id;
            console.log(id, "-------------------");
            let userAddess = await AddressModal.find({});
            console.log(userAddess, "-------------------");
            return res.json(userAddess);
        } catch (error) {
            console.log(error);
            req.session.alertMessage = "Couldn't perform request Please Retry!!!";
        }
}
const getShippedOrders = async (req, res) => {
    try {
        let { seller } = req.session;
        let orders = await OrderModel.find({ sellerId: seller._id, status: "order shipped" })
        res.render('seller/orders', { title: "Shipped Orders", orders, seller, homepage: true })
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Couldn't perform request Please Retry!!!";
        res.redirect("/seller")
    }
}

const shipOrder = async (req, res) => {
    try {
        let { id } = req.params
        let order = await OrderModel.findOneAndUpdate({ _id: id }, {
            $set: { status: "order shipped" }
        })
        res.redirect("/seller/orders")
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Couldn't perform request Please Retry!!!";
        res.redirect("/seller")
    }
}

const getApprovedProducts = async (req, res) => {
    try {
        let { seller } = req.session;
        let products = await ProductModel.find({ sellerId: seller._id, status: "approved" })
        res.render("seller/productList", { title: "Approved products", seller, products })
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Couldn't perform signup Please Retry (with a new email) !!!";
        res.redirect("/seller")
    }
}
const getRejectedProducts = async (req, res) => {
    try {
        let { seller } = req.session;
        let products = await ProductModel.find({ status: "rejected" })
        res.render("seller/productList", { title: "Rejected products", seller, products })
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Couldn't perform signup Please Retry (with a new email) !!!";
        res.redirect("/seller")
    }
}
const deleteProdcut = async (req, res) => {
    try {
        let { id } = req.params;
        console.log(id, "-------------------");
        await ProductModel.findByIdAndDelete(id);
        req.session.alertMessage = "Product Deleted Successfully";
        res.json({ status: true, message: "Product Deleted Successfully" });
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Couldn't perform request Please Retry!!!";
        res.json({ status: false, message: "Couldn't perform request Please Retry!!!" });
    }
}
const getUpdatedForm = async (req, res) => {
    try {
        let { id } = req.params;
        console.log(id, "-------------------");
        let product = await ProductModel.findById(id);
        console.log(product, "-------------------");
        res.render('seller/updateProduct', { product, homepage: true });
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Couldn't perform request Please Retry!!!";
        res.redirect("/seller")
    }
}
const updateProduct = async function (req, res) {
    try {
        console.log(req.body, "------------------------");
        let { id } = req.params;
        
        // Find the existing product first
        let existingProduct = await ProductModel.findById(id);
        if (!existingProduct) {
            req.session.alertMessage = "Product not found!";
            return res.redirect("/seller/sellerHome");
        }

        // Update the product with new data
        let updatedProduct = await ProductModel.findByIdAndUpdate(
            id, 
            req.body, 
            { new: true, runValidators: true }
        );

        // Handle image update if new image is provided
        if (req.files && req.files.image) {
            let { image } = req.files;
            
            // Save new image with product ID as filename
            image.mv('./public/images/product/' + id + ".jpg").then((err) => {
                if (!err) {
                    req.session.alertMessage = "Product updated successfully";
                    return res.redirect('/seller/sellerHome');
                } else {
                    console.log("Image upload error:", err);
                    req.session.alertMessage = "Product updated but image upload failed";
                    return res.redirect('/seller/sellerHome');
                }
            });
        } else {
            // No new image provided, just update text data
            req.session.alertMessage = "Product updated successfully";
            res.redirect('/seller/sellerHome');
        }
        
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Error Occurred. Please Retry !!!";
        res.redirect("/seller/sellerHome");
    }
}
module.exports = {
    getSellerLoginPage,
    getSellerSignupPage,
    doLogin,
    doSignup,
    logout,
    getSellerHomePage,
    getAddProductPage,
    addNewProduct,
    getSellerOrders,
    shipOrder,
    getShippedOrders,
    getApprovedProducts,
    getRejectedProducts,
    getAddress,
    deleteProdcut,
    getUpdatedForm,
    updateProduct
}