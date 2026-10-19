import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDb from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import analysisRouter from "./routes/analysisRoutes.js";
import rankRouter from "./routes/rankRoutes.js";

connectDb();
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send("server is running"));
app.use('/api/auth', authRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/rank', rankRouter);

const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`server started on port ${port}`)
});
