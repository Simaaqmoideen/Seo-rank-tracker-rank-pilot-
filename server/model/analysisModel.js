import mongoose from "mongoose";

const analysisSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        url: { type: String, required: true },
        status: { type: String, enum: ["processing", "completed", "failed"], default: "processing" },
        error: { type: String, default: "" },
        overallScore: { type: Number, default: 0 },
        categories: {
            seo: { type: Number, default: 0 },
            performance: { type: Number, default: 0 },
            accessibility: { type: Number, default: 0 },
            bestPractices: { type: Number, default: 0 },
        },
        metaData: {
            title: { type: String, default: "" },
            description: { type: String, default: "" },
            canonical: { type: String, default: "" },
            robots: { type: String, default: "" },
            ogTitle: { type: String, default: "" },
            ogDescription: { type: String, default: "" },
            ogImage: { type: String, default: "" },
            twitterCard: { type: String, default: "" },
            viewport: { type: String, default: "" },
            charset: { type: String, default: "" },
        },
        headings: {
            h1: { type: Number, default: 0 },
            h2: { type: Number, default: 0 },
            h3: { type: Number, default: 0 },
            h4: { type: Number, default: 0 },
            h5: { type: Number, default: 0 },
            h6: { type: Number, default: 0 },
            h1Texts: [{ type: String }],
        },
        links: {
            internal: { type: Number, default: 0 },
            external: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
        },
        images: {
            total: { type: Number, default: 0 },
            missingAlt: { type: Number, default: 0 },
            withAlt: { type: Number, default: 0 },
        },
        loadTime: { type: Number, default: 0 },
        pageSize: { type: Number, default: 0 },
        wordCount: { type: Number, default: 0 },
        keywords: [{ word: String, count: Number, density: Number }],
        issues: [{ severity: String, category: String, message: String, recommendation: String }],
    },
    { timestamps: true }
);

const Analysis = mongoose.model("Analysis", analysisSchema);
export default Analysis;
