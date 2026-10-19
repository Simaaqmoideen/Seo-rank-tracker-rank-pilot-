import mongoose from "mongoose";

const connectDb = async () => {
    mongoose.connection.on("connected", () => console.log("mongodb connected successfully"));
    mongoose.connection.on("error", (err) => console.error("mongodb connection error:", err.message));

    const uri = process.env.mongodb_uri || process.env.MONGODB_URI;

    if (uri) {
        try {
            console.log("Connecting to MongoDB...");
            await mongoose.connect(uri);
            return;
        } catch (err) {
            console.error(`MongoDB connection failed: ${err.message}`);
            process.exit(1); // Crash loudly so Render marks the deploy as failed
        }
    }

    // Only attempt local fallback in development
    if (process.env.NODE_ENV !== "production") {
        try {
            console.log("No URI set. Connecting to local MongoDB (mongodb://127.0.0.1:27017/seo)...");
            await mongoose.connect("mongodb://127.0.0.1:27017/seo");
        } catch (fallbackErr) {
            console.error("Failed to connect to local MongoDB:", fallbackErr.message);
            process.exit(1);
        }
    } else {
        console.error("FATAL: mongodb_uri environment variable is not set. Cannot start server.");
        process.exit(1);
    }
};

export default connectDb;