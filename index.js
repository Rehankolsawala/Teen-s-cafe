const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken")
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { error, log } = require("console");
const { Server } = require("http");
const { type } = require("os");
const { Number, String } = require("mongoose/lib/schema/index");
const { last, object } = require("mongoose/lib/utils");

app.use(express.json());
app.use(cors());

//Database connection with mongoDB
mongoose.connect("mongodb+srv://Rehan:Rehan786@cluster0.kh9taq9.mongodb.net/ecommerence")

//API Creation
app.get("/", (req, res) => {
    res.send("express App is Running")
})

// Image storage Engine

const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({ storage: storage })

//Creating upload endpoint for images
app.use('/images', express.static('upload/images'))
app.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http:/localhost:${port}/images/${req.file.filename}`
    })
})

//schema for creating products
const Product = mongoose.model("product", {
    id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    new_price: {
        type: Number,
        required: true,
    },
    old_price: {
        type: Number,
        required: true,
    },
    date: {
        type: String,
        default: Date.now,
    },
    avilable: {
        type: Boolean,
        default: true,
    },
    checkout: {
        type: Boolean,
        default: false
    }
});

app.post('/addproduct', async (req, res) => {
    let products = await Product.find({});
    let id;
    if (products.length > 0) {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id + 1;
    }
    else {
        id = 1;
    }
    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price,
    });
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success: true,
        name: req.body.name,
    })
})
//creating API for deleting Product

app.post('/removeproduct', async (req, res) => {
    await Product.findOneAndDelete({ id: req.body.id });
    console.log("Removed");
    res.json({
        success: true,
        name: req.body.name
    })
})
//creating API getting all product
app.get('/allproduct', async (req, res) => {
    let products = await Product.find({});
    console.log("all Products fetched");
    res.send(products)
})


//Creating user schema

const Users = mongoose.model('Users', {
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true
    },
    password: {
        type: String,
    },
    cartData: {
        type: Object,
    },
    date: {
        type: Date,
        default: Date.now,
    }
})

//Creating endpoint for registering new user
app.post('/signup', async (req, res) => {
    let check = await Users.findOne({ email: req.body.email });
    if (check) {
        return res.status(400).json({ success: false, error: "existing user found with same email address" })
    }
    let cart = {};
    for (let i = 0; i < 300; i++) {
        cart[i] = 0;
    }
    const user = new Users({
        name: req.body.username,
        email: req.body.email,
        password: req.body.password,
        cartData: cart,
    })

    await user.save();

    const data = {
        user: {
            id: user.id,
        }
    }

    const token = jwt.sign(data, 'secret_ecom');
    res.json({ success: true, token })
})
// Creating endPOint for user Login
app.post('/login', async (req, res) => {
    let user = await Users.findOne({ email: req.body.email });
    if (user) {
        const passCompare = req.body.password === user.password;
        if (passCompare) {
            const data = {
                user: {
                    id: user.id
                }
            }

            const token = jwt.sign(data, 'secret_ecom');
            res.json({ success: true, token })
        }
        else {
            res.json({ seccess: false, errors: "wrong Password" })
        }
    }
    else {
        res.json({ success: false, errors: "wrong Email.id" })
    }
})
// creating end for popular section
app.get('/popularsection', async (req, res) => {
    let products = await Product.find({ category: "Coffee" });
    let popular_section = products.slice(0, 4);
    console.log('Popular Section is fetched');
    res.send(popular_section);
})
//creating middleware to fetch user
const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        res.status(401).send({ errors: "Please authenticate using vaild token" })
    }
    else {
        try {
            const data = jwt.verify(token, 'secret_ecom');
            req.user = data.user;
            next();
        } catch (error) {
            res.status(401).send({ error: "Please authenticate using vaild token" })
        }
    }
}
//-
// creating cart product cartdata
app.post('/addtocart', fetchUser, async (req, res) => {
    console.log("Added", req.body.itemId);
    let UserData = await Users.findOne({ _id: req.user.id });
    UserData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: UserData.cartData });
    res.send("Added")
})

//Creating endpoint to remove product form carddata
app.post('/removeformcart', fetchUser, async (req, res) => {
    console.log("removed", req.body.itemId);
    let UserData = await Users.findOne({ _id: req.user.id });
    if (UserData.cartData[req.body.itemId] > 0)
        UserData.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: UserData.cartData });
    res.send("Removed")
})
//creating endpoint to get carData
app.post('/getcart', fetchUser, async (req, res) => {
    console.log("GetCart");
    let UserData = await Users.findOne({ _id: req.user.id });
    res.json(UserData.cartData);
});

/*app.post('/checkout', async (req, res) => {
    console.log('fetching product');
    const result = Product.findOne({ _id: req.product.id });
    console.log('products fetched sucessfully',result)
    res.status(200).json({ success: true, message: "Product fetch successfully",data:[result] });

})*/


app.listen(port, (error) => {
    if (!error) {
        console.log("server running on port" + port)
    }
    else {
        console.log("error" + error)
    }
})