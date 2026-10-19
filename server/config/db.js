import mongoose from "mongoose";

const connectDb = async () => {
    mongoose.connection.on("connected", () => console.log("mongodb connected successfully"));
    mongoose.connection.on("error", (err) => console.error("mongodb connection error:", err.message));

    const uri = process.env.mongodb_uri || process.env.MONGODB_URI;

    if (uri) {
        try {
            console.log("Connecting to primary MongoDB URI...");
            await mongoose.connect(uri);
            return;
        } catch (err) {
            console.warn(`Primary MongoDB connection failed (${err.message}). Attempting fallback to local MongoDB...`);
        }
    }

    try {
        console.log("Connecting to local MongoDB (mongodb://127.0.0.1:27017/seo)...");
        await mongoose.connect("mongodb://127.0.0.1:27017/seo");
    } catch (fallbackErr) {
        console.error("Failed to connect to both primary and local MongoDB:", fallbackErr.message);
    }
};

export default connectDb;