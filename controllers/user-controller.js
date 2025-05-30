const UserModel = require("../models/user-model");
const ProductModel = require('../models/product-model')
const medBlogModel = require("../models/medicinal-blog-model");
const CartModel = require('../models/cart-model');
const OrderModel = require('../models/order-model');
const bcrypt = require("bcrypt");
const productModel = require("../models/product-model");
const Razorpay = require('../Payments/Payment')
const addressModel = require('../models/address-model')
const getUserHomePage = async function (req, res, next) {
    try {
        let products = await ProductModel.find();
        let TShirts = await ProductModel.find({ category:"dress", status: "approved" });
        let Shirts = await ProductModel.find({ category:"mens", status: "approved" });
        let Ladies = await ProductModel.find({ category:"ladies", status: "approved" });
            console.log(Shirts,"------------")

        let Ornaments = await ProductModel.find({ category:"Ornaments", status: "approved" });
        let medBlogs = await medBlogModel.find({ status: "approved" }).sort({ date: 1 }).limit(4)
        let { user } = req.session;
        let {dressFit} = user;
        console.log(dressFit,"dressFit")
        let SuggestedProducts = await ProductModel.find({ dressFit:dressFit });

     
        console.log(user, "user---------",SuggestedProducts,"SuggestedProducts");
        let CartTotal = 0;
        res.render('user/home', { product: products, user, CartTotal, medBlogs,TShirts,Ornaments,Shirts,Ladies,SuggestedProducts } );
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Error Occured. Please Retry !!!";
        res.redirect("/users/login")
    }
}

const getUserLoginPage = function (req, res, next) {
    res.render("user/userLogin", { homepage: true })
}


const getUserSignupPage = function (req, res, next) {
    res.render("user/userReg", { homepage: true })
}

const doLogin = async (req, res) => {
    console.log(req.body);
    try {
        console.log(req.body, req.body.password);
        let { password } = req.body;
        const user = await UserModel.findOne({ email: req.body.email });
        if (user) {
            const exist = await bcrypt.compare(password, user.password);
            if (exist) {
                req.session.user = user;
                return res.redirect("/users/home");
            }
        }
        req.session.alertMessage = "Invalid user Credentials";
        res.redirect("/users/login");
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Error Occured. Please Retry !!!";
        res.redirect("/users/login")
    }
}

const doSignup = async (req, res) => {
    console.log(req.body);
    try {
        console.log(req.body, req.body.password);
        let { password } = req.body;
        req.body.password = await bcrypt.hash(password, 10)
        const user = await UserModel.create(req.body);
        res.redirect('/users/login')
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Couldn't perform signup Please Retry (with a new email) !!!";
        res.redirect("/users/signup")
    }
}

const logout = (req, res) => {
    req.session.destroy()
    res.redirect('/')
}

const getAllMedBlogs = async (req, res) => {
    try {
        let { user } = req.session;
        let medBlogs = await medBlogModel.find({ status: "approved" }).sort({ date: 1 })
        res.render("user/blogsList", { user, medBlogs })
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Couldn't perform signup Please Retry (with a new email) !!!";
        res.redirect("/users/signup")
    }
}

const getAllProducts = async (req, res) => {
    try {
        let { user } = req.session;
        let products = await ProductModel.find({ status: "approved" })
        res.render("user/productList", { user, products })
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Couldn't perform signup Please Retry (with a new email) !!!";
        res.redirect("/users/login")
    }
}

const addToCart = async (req, res) => {
    //check if cart exist 
    let { user } = req.session;
    let { id } = req.params;
    try {
        let product = await ProductModel.findOne({ _id: id });
        product.id = id;
        let obj = {
            item: product,
            quantity: 1
        }
        let cart = await CartModel.findOne({ userId: user._id })
        if (cart) {
            console.log("cart already exist");
            let proExist = cart.products.findIndex(product => product.item._id == id)
            console.log(proExist);
            if (proExist != -1) {
                await CartModel.findOneAndUpdate({
                    "products.item._id": product._id
                },
                    {
                        $inc: { 'products.$.quantity': 1 }
                    }
                )
                res.redirect("/users/cart")
            } else {
                await CartModel.findOneAndUpdate({ userId: user._id },
                    {
                        $push: {
                            products: obj
                        }
                    }
                )
                res.redirect("/users/cart")
            }
        } else {
            let cartObj = {
                userId: user._id,
                products: [obj]
            }
            console.log("cart", cartObj)
            await CartModel.create(cartObj);
            res.redirect("/users/cart")
        }
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Couldn't perform operation Please Retry!!!";
        res.redirect("/users/home")
    }
}
const getCartProducts = async (req, res) => {
    try {
        let { user } = req.session
        let { _id } = req.session.user
        let myCart = await CartModel.findOne({ userId: _id })
        let relatedProducts = new Set() // Using a Set to avoid duplicates
        
        if (myCart) {
            console.log(myCart.products)
            let total = 0;
            let totalMRP = 0
          
            // Collect all related products from each cart item
            for (let p of myCart.products) {
                console.log(p.item.relatedTo, "0------")
                
                // Add each related product to the Set
                if (Array.isArray(p.item.relatedTo)) {
                    // If relatedTo is already an array
                    p.item.relatedTo.forEach(id => relatedProducts.add(id))
                } else if (typeof p.item.relatedTo === 'string') {
                    // If relatedTo is a comma-separated string
                    p.item.relatedTo.split(',').forEach(id => relatedProducts.add(id.trim()))
                }
                
                total += (parseInt(p.item.price) * parseInt(p.quantity))
                totalMRP += (parseInt(p.item.mrp) * parseInt(p.quantity))
            }
            
            // Convert Set back to Array for passing to the view
            const relatedProductsArray = Array.from(relatedProducts)
            console.log(relatedProductsArray, "All related products collected")
            
            // Find the actual related product documents from your database
            // Assuming you have a ProductModel that stores your products
            const recommendedProducts = await ProductModel.find({
                _id: { $in: relatedProductsArray },
                _id: { $nin: myCart.products.map(p => p.item._id) } // Exclude products already in cart
            }).limit(3) // Limit to 3 recommended products
                console.log(recommendedProducts,"recommendedProducts")
            let saved = totalMRP - total;
            let allProducts = await productModel.find({})
            console.log(allProducts,"allproducts....")
            let newProducts = allProducts.filter(product => 
                relatedProductsArray.includes(product.relatedTo)
            );
            
            console.log(newProducts, "Filtered related products....");
            res.render("user/cart", { 
                products: myCart.products, 
                user, 
                total, 
                totalMRP, 
                saved,
                newProducts // Pass the recommended products to the view
            })
        } else {
            res.render("user/cart", { products: false, user })
        }
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Couldn't perform signup Please Retry!!!";
        res.redirect("/users/home")
    }
}
const mongoose = require("mongoose");

const removeCartProduct = async (req, res) => {
  try {
    const { _id } = req.session.user;
    const { id } = req.params;

    const cart = await CartModel.findOne({ userId: _id });

    if (!cart) {
      req.session.alertMessage = "Cart not found!";
      return res.redirect("/users/cart");
    }

    // Log before removal
    console.log("Cart before removal:", cart.products.map(p => p.item._id.toString()));

    // Remove the product manually
    cart.products = cart.products.filter(
      (product) => product.item._id.toString() !== id
    );

    // Save the updated cart
    await cart.save();

    // Log after removal
    console.log("Cart after removal:", cart.products.map(p => p.item._id.toString()));

    res.redirect("/users/cart");
  } catch (error) {
    console.error(error);
    req.session.alertMessage = "Couldn't remove item from cart. Please retry!";
    res.redirect("/users/home");
  }
};


const goToPayment = async (req, res) => {
    try {
        let { id, qty } = req.params;
        let { _id, userName, email, mobile } = req.session.user
        let product = await ProductModel.findOne({ _id: id })
        let orderObj = {
            productId: product._id,
            productName: product.productName,
            sellerId: product.sellerId,
            sellerName: product.sellerName,
            buyerId: _id,
            buyerName: userName,
            buyerPhone: mobile,
            buyerEmail: email,
            date: new Date().toLocaleDateString(),
            quantity: qty,
            totalPrice: parseFloat(product.price) * parseFloat(qty),
            status: "pending"
        }
        let order = await OrderModel.create(orderObj)
        console.log(order._id)
        res.render('user/payment', { homepage: true, total: orderObj.totalPrice, orderId: order._id })
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Couldn't perform signup Please Retry!!!";
        res.redirect("/users/home")
    }
}

const confirmPayment = async (req, res) => {
    try {
        let { orderId } = req.body
        let order = await OrderModel.findOneAndUpdate({ _id: orderId }, {
            $set: { status: "Order Placed" }
        })
        await CartModel.findOneAndUpdate({ userId: req.session.user._id }, { $set: { products: [] } })
        res.redirect("/users/home")
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Couldn't perform request Please Retry!!!";
        res.redirect("/users/home")
    }
}

const getMyOrders = async (req, res) => {
    try {
        let { user } = req.session;
        let orders = await OrderModel.find({ buyerId: user._id})
        res.render('user/myorders', { product: orders, user, homepage: true })
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Couldn't perform request Please Retry!!!";
        res.redirect("/users/home")
    }
}

const addLike = async (req, res) => {
    try {
        let { user } = req.session
        let { id } = req.params;
        let blog = await medBlogModel.findOne({ _id: id });
        if (blog.likes.length != 0) {
            let likedAlready = blog.likes.findIndex(singleUser => singleUser == user._id)
            if (likedAlready <= -1) {
                await medBlogModel.findOneAndUpdate({ _id: id },
                    {
                        $push: {
                            likes: user._id
                        }
                    })
                res.redirect("/users/all-med-blogs")
            } else {
                res.redirect("/users/all-med-blogs")
            }
        } else {
            console.log("no likes here");
            await medBlogModel.findOneAndUpdate({ _id: id },
                {
                    $push: {
                        likes: user._id
                    }
                })
            res.redirect("/users/all-med-blogs")
        }
    } catch (error) {

    }
}

const searchProduct = async (req, res) => {
    try {
        let { search } = req.body;
        let { user } = req.session
        let products = await ProductModel.find({ productName: { $regex: search }, status: "approved" })
        res.render("user/productList", { user, products })
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Couldn't perform signup Please Retry (with a new email) !!!";
        res.redirect("/users/home")
    }
}
const getFestivalItems = async (req, res) => {
    try {
        console.log("--- Festival API Called ---");

        let festival = req.params.festival?.toLowerCase(); // Normalize input
        console.log("Requested Festival:", festival);

        if (!festival) {
            return res.status(400).json({ message: "Festival name is required" });
        }

        let productList = await productModel.find({}); // Fetch all products
        console.log("Total Products Fetched:", productList.length);

        let festivalProducts = {
            onam: ['saree', 'dhoti', 'mund','Black Shirt'],
            christmas: ['red shirt', 'white shirt'],
            ramadan: ['kurti', 'churidar'],
            marriage : ['Saree','dhoti','mund','Over Coat']
        };

        if (!festivalProducts[festival]) {
            return res.status(400).json({ message: "Invalid festival name" });
        }

        let selectedProducts = productList.filter(pro =>
            festivalProducts[festival].some(festItem =>
                pro.productName.toLowerCase().includes(festItem.toLowerCase())
            )
        );

        console.log("Filtered Products:", selectedProducts.length);
        return res.json(selectedProducts); // Send response

    } catch (error) {
        console.error("Error fetching festival items:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};
const getOneProduct = async (req, res) => {
    try {
      console.log(req.params.id);
      const oneproduct = await productModel.findById(req.params.id);
    
      if (!oneproduct) {
        return res.status(404).send("Product not found");
      }
  
      let relatedProducts = [];
      console.log(oneproduct.productName, "category:", oneproduct.category);
      
      // Function to normalize category and product name for more flexible matching
      const normalize = (str) => str.toLowerCase().trim();
      
      // Combined check for product name and category
      const matchCategory = (productName, category) => {
        const normalizedName = normalize(productName);
        const normalizedCategory = normalize(category);
        
        const categoryMatches = [
          'ladies', 'mens', 'shoes', 'ornaments'
        ].some(cat => normalizedCategory.includes(normalize(cat)));
        
        const nameMatches = [
          { names: ['saree','churidar'], fetch: 'beauty' },
          { names: ['shoes', 'shoe'], fetch: 'mens-shoes' },
          { names: ['shirts', 'shirt','white shirt','Over Coat','mens'], fetch: 'mens-shirts' },
          { names: ['earings', 'earing', 'earrings'], fetch: 'womens-jewellery' }
        ].find(group => group.names.includes(normalizedName));
        
        return { categoryMatches, nameMatches };
      };
      
      const { categoryMatches, nameMatches } = matchCategory(
        oneproduct.productName, 
        oneproduct.category
      );
      
      // Fetch related products based on matches
      if (categoryMatches && nameMatches) {
        try {
          const response = await fetch(`https://dummyjson.com/products/category/${nameMatches.fetch}`);
          relatedProducts = await response.json();
        } catch (fetchError) {
          console.error("Error fetching related products:", fetchError);
          relatedProducts = { products: [] };
        }
      } else {
        relatedProducts = { products: [] };
      }
      
      console.log("Related Products:", relatedProducts);
      res.render("user/singleProducts", { 
        product: oneproduct, 
        relatedProducts 
      });
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).send("Internal Server Error");
    }
  };
// const getOneProduct = async (req, res) => {
//     try {
//       console.log(req.params.id);
//       const oneproduct = await productModel.findById(req.params.id);
//     //   category
    
//       if (!oneproduct) {
//         return res.status(404).send("Product not found");
//       }
  
//       let relatedProducts = [];
//       console.log(oneproduct.productName, "category");
//       const cate = oneproduct.category;
//       // Using switch statement for cleaner condition handling
//       switch (oneproduct.productName) {
//         case "Saree":
//         case "Saree":
//           const beautyResponse = await fetch('https://dummyjson.com/products/category/beauty');
//           relatedProducts = await beautyResponse.json();
//           break;
          
//         case "Shoes":
//         case "Shoe":
//           const shoesResponse = await fetch('https://dummyjson.com/products/category/mens-shoes');
//           relatedProducts = await shoesResponse.json();
//           break;
          
//         case "Shirts":
//         case "Shirt":
//           const shirtsResponse = await fetch('https://dummyjson.com/products/category/mens-shirts');
//           relatedProducts = await shirtsResponse.json();
//           break;
//         case "Earings":
//         case "Earing":
//             case "Earrings":
//               const jewelleryResponse = await fetch('https://dummyjson.com/products/category/womens-jewellery');
//               relatedProducts = await jewelleryResponse.json();
//               break;
          
//         default:
//           // Default case if none of the above match
//           relatedProducts = { products: [] };
//       }
      
//       console.log(relatedProducts);
//       res.render("user/singleProducts", { product: oneproduct, relatedProducts });
//     } catch (error) {
//       console.error("Error fetching product:", error);
//       res.status(500).send("Internal Server Error");
//     }
//   };
const getSizeDress = async (req,res)=>{
    try {
        let size = req.params.size;
        console.log(size,"size");
        console.log(size,"size");
        let sizeChart ;
        if(size == "S"){
            sizeChart = 36;
        }
        if(size == "M"){
            sizeChart = 38;
        }
        if(size == "L"){
            sizeChart = 40;
        }
        if(size == "XL"){
            sizeChart = 42;
        }
        let products = await ProductModel.find({ 
            category: { $in: ["mens", "ladies"] }, 
            status: "approved" 
          })
        console.log(products,"products")
        let filteredProducts = products.filter(product => product.size == sizeChart)
        console.log(filteredProducts,"filteredProducts")
        res.json(filteredProducts)
        // res.render("user/productList", { user, products })
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Couldn't perform signup Please Retry (with a new email) !!!";
        res.redirect("/users/home")
    }
}
const relatedView = async (req, res) => {
    try {
        let id = req.params.id;
        console.log(id, "id----------");
        let product = await fetch(`https://dummyjson.com/products/${id}`);
        let relatedProducts = await product.json();
        console.log(relatedProducts, "relatedProducts");
        res.render("user/relatedView", { product: relatedProducts });
    } catch (error) {
       console.log(error);
        req.session.alertMessage = "Couldn't perform signup Please Retry (with a new email) !!!";
        res.redirect("/users/home") 
    }
}
const checkout = async (req, res) => {
    try {
        let { user } = req.session
        let { _id } = req.session.user
        let product = await CartModel.findOne({ userId: _id })
        let total = 0;
       
        if (product) {
            for (let p of product.products) {
                total += (parseInt(p.item.price) * parseInt(p.quantity))
            }
        } else {
            return res.redirect("/users/cart")
        }
        const options = {
        amount: total, // amount in the smallest currency unit
        currency: "INR",
        receipt: "any unique id for every order",
        payment_capture: 1
    };
    const response = await Razorpay.orders.create(options)
    console.log(response, product,"response");
    let products = product.products
    console.log(products, "products");
    res.render("user/Confirmation", { user, response,products, homepage: true });
    } catch (error) {
       console.log(error); 
    }
}
const addDeliveryAddress = async (req, res) => {
    try {
        console.log(req.body, "req.body");
        let { user } = req.session;
        let { _id } = req.session.user;
        req.body.userId = _id;
        let address = await addressModel.create(req.body);
        console.log(address, "address");
        res.json({ message: "Address added successfully", address });
    } catch (error) {
        console.log(error);
    
    }
}
const crypto = require('crypto');

const verifypayment = async (req, res) => {
    try {
        console.log(req.body, "req.body");
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Generate expected signature
        const generated_signature = crypto
            .createHmac('sha256', "Qtsm0Mlbo8tuhRk3ZMIr6oAK")
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generated_signature === razorpay_signature) {
            console.log("Payment is successful");
            return res.json({ message: "Payment is successful", success: true });
        } else {
            console.log("Payment verification failed");
            return res.json({ message: "Payment verification failed", success: false });
        }
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const successPay = async(req,res)=>{
    try {
        res.render("user/CorderConfiramtion", { homepage: true, user: req.session.user });
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Couldn't perform signup Please Retry (with a new email) !!!";
        res.redirect("/users/home")
    }
}
const failed = async(req,res)=>{
    try {
        res.render("user/Failed", { homepage: true, user: req.session.user });
    } catch (error) {
        console.log(error);
        req.session.alertMessage = "Couldn't perform signup Please Retry (with a new email) !!!";
        res.redirect("/users/home")
    }
}
module.exports = {
    failed,
    successPay,
    getUserHomePage,
    getUserLoginPage,
    getUserSignupPage,
    doLogin,
    doSignup,
    logout,
    getAllProducts,
    getAllMedBlogs,
    addToCart,
    getCartProducts,
    removeCartProduct,
    goToPayment,
    confirmPayment,
    getMyOrders,
    addLike,
    searchProduct,
    getFestivalItems,
    getOneProduct,
    getSizeDress,
    relatedView,
    checkout,
    addDeliveryAddress,
    verifypayment
}