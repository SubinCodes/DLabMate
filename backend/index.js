const express = require("express");
const mongoose = require("mongoose");

const app = express()
app.listen(
    5000,
    ()=> console.log("Backend is running")
)

mongoose.connect(
    "mongodb+srv://subinpradhan2015:w07HNhPug4lQX4At@dlabmate.mdvg0cf.mongodb.net/"
)
.then(
    () => {
        console.log("DB Connected");
    }
).catch(
        () => {
            console.log("Failed");
        }

)