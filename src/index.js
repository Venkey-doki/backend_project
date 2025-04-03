import dotenv from "dotenv";
import express from "express";
import connectDB from "./DB/index.js";

dotenv.config({
    path: "./env"
});

connectDB()
