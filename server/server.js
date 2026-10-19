import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDb from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import analysisRouter from "./routes/analysisRoutes.js";
import rankRouter from "./routes/rankRoutes.js";

connectDb();
const app = express();

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g., mobile apps, Postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
}));

app.use(express.json());

app.get('/', (req, res) => res.send("Rank Pilot API is running ✅"));
app.use('/api/auth', authRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/rank', rankRouter);

const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`server started on port ${port}`)
});
