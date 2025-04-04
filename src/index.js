import dotenv from "dotenv";
import express from "express";
import connectDB from "./DB/index.js";
import app  from "./app.js";

dotenv.config({
    path: "./.env"
});

connectDB()
    .then(() => {

        // const app = express();
        const PORT = process.env.PORT || 8000;

        app.on("error", (err) => {
            console.log("Server error express error currently at src/index.js", err);
        });

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((err) => console.log("MONGODB connection error currently at src/index.js",err));
