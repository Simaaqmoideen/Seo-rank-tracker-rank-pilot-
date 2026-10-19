import mongoose from "mongoose";

const rankHistorySchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    position: { type: Number, default: null },
    page: { type: Number, default: null },
    title: { type: String, default: "" },
    snippet: { type: String, default: "" },
});

const competitorSchema = new mongoose.Schema({
    position: Number,
    url: String,
    domain: String,
    title: String,
    snippet: String,
});

const rankSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        keyword: { type: String, required: true },
        url: { type: String, required: true },
        domain: { type: String, required: true },
        currentPosition: { type: Number, default: null },
        currentPage: { type: Number, default: null },
        bestPosition: { type: Number, default: null },
        positionChange: { type: Number, default: 0 },
        active: { type: Boolean, default: true },
        lastChecked: { type: Date, default: null },
        status: { type: String, enum: ["pending", "checking", "completed", "failed"], default: "pending" },
        rankHistory: [rankHistorySchema],
        competitors: [competitorSchema],
    },
    { timestamps: true }
);

const Rank = mongoose.model("Rank", rankSchema);
export default Rank;
