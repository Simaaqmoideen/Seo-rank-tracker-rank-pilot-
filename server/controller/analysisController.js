import axios from "axios";
import * as cheerio from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Analysis from "../model/analysisModel.js";
import User from "../model/model.js";

const normalizeUrl = (url) => {
    url = url.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
    }
    return url;
};

const scrapeWebsite = async (url) => {
    const startTime = Date.now();

    const response = await axios.get(url, {
        timeout: 20000,
        maxContentLength: 5 * 1024 * 1024,
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        },
        maxRedirects: 5,
    });

    const loadTime = Date.now() - startTime;
    const html = response.data;
    const pageSize = Buffer.byteLength(html, "utf8");
    const $ = cheerio.load(html);

    // Meta data extraction
    const metaData = {
        title: $("title").first().text().trim() || "",
        description:
            $('meta[name="description"]').attr("content") ||
            $('meta[property="og:description"]').attr("content") ||
            "",
        canonical: $('link[rel="canonical"]').attr("href") || "",
        robots: $('meta[name="robots"]').attr("content") || "",
        ogTitle: $('meta[property="og:title"]').attr("content") || "",
        ogDescription: $('meta[property="og:description"]').attr("content") || "",
        ogImage: $('meta[property="og:image"]').attr("content") || "",
        twitterCard: $('meta[name="twitter:card"]').attr("content") || "",
        viewport: $('meta[name="viewport"]').attr("content") || "",
        charset:
            $("meta[charset]").attr("charset") ||
            $('meta[http-equiv="Content-Type"]').attr("content") ||
            "",
    };

    // Headings
    const h1Texts = [];
    $("h1").each((_, el) => h1Texts.push($(el).text().trim().slice(0, 100)));
    const headings = {
        h1: $("h1").length,
        h2: $("h2").length,
        h3: $("h3").length,
        h4: $("h4").length,
        h5: $("h5").length,
        h6: $("h6").length,
        h1Texts: h1Texts.slice(0, 5),
    };

    // Links
    let baseHost;
    try {
        baseHost = new URL(url).hostname;
    } catch {
        baseHost = url;
    }
    let internal = 0,
        external = 0;
    $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
        try {
            const linkUrl = new URL(href, url);
            if (linkUrl.hostname === baseHost) internal++;
            else external++;
        } catch {
            if (href.startsWith("/")) internal++;
        }
    });
    const links = { internal, external, total: internal + external };

    // Images
    let withAlt = 0,
        missingAlt = 0;
    $("img").each((_, el) => {
        const alt = $(el).attr("alt");
        if (alt !== undefined && alt !== "") withAlt++;
        else missingAlt++;
    });
    const images = { total: $("img").length, withAlt, missingAlt };

    // Text content
    $("script, style, noscript, nav, footer, header").remove();
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();
    const words = bodyText.split(/\s+/).filter((w) => w.length > 1);
    const wordCount = words.length;

    return {
        url,
        statusCode: response.status,
        loadTime,
        pageSize,
        metaData,
        headings,
        links,
        images,
        wordCount,
        bodyText: bodyText.slice(0, 3000),
    };
};

const analyzeWithGemini = async (scrapedData) => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY not configured");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const candidateModels = [
        process.env.GEMINI_MODEL,
        "gemini-2.5-flash",
        "gemini-flash-latest",
        "gemini-2.5-flash-lite",
        "gemini-1.5-flash",
    ].filter(Boolean);

    const prompt = `You are an expert SEO analyst. Analyze the following website data and return ONLY a valid JSON object.

Website URL: ${scrapedData.url}
Load Time: ${scrapedData.loadTime}ms
Status Code: ${scrapedData.statusCode}
Page Size: ${Math.round(scrapedData.pageSize / 1024)}KB
Word Count: ${scrapedData.wordCount}

META DATA:
- Title: "${scrapedData.metaData.title}" (${scrapedData.metaData.title.length} chars)
- Description: "${scrapedData.metaData.description}" (${scrapedData.metaData.description.length} chars)
- Canonical: "${scrapedData.metaData.canonical}"
- Robots: "${scrapedData.metaData.robots}"
- OG Title: "${scrapedData.metaData.ogTitle}"
- OG Image: "${scrapedData.metaData.ogImage}"
- Twitter Card: "${scrapedData.metaData.twitterCard}"
- Viewport: "${scrapedData.metaData.viewport}"
- Charset: "${scrapedData.metaData.charset}"

HEADINGS:
- H1: ${scrapedData.headings.h1} (texts: ${JSON.stringify(scrapedData.headings.h1Texts)})
- H2: ${scrapedData.headings.h2}, H3: ${scrapedData.headings.h3}

LINKS: Internal: ${scrapedData.links.internal}, External: ${scrapedData.links.external}
IMAGES: Total: ${scrapedData.images.total}, Missing Alt: ${scrapedData.images.missingAlt}

PAGE CONTENT (first 3000 chars):
${scrapedData.bodyText}

Scoring rules:
- Title: 50-60 chars = good, must exist
- Description: 150-160 chars = good, must exist
- H1: exactly 1 = ideal
- Images: all should have alt text
- Load time: <3s=good, <5s=ok, >5s=poor
- Page size: <3MB=good
- Must have viewport, charset, canonical, OG tags, twitter card

Return ONLY this JSON (no markdown, no explanation):
{
  "overallScore": <0-100>,
  "categories": {"seo": <0-100>, "performance": <0-100>, "accessibility": <0-100>, "bestPractices": <0-100>},
  "keywords": [{"word": string, "count": number, "density": number}],
  "issues": [{"severity": "critical"|"warning"|"info", "category": string, "message": string, "recommendation": string}]
}

Provide 5-15 issues sorted by severity (critical first). Extract top 10 keywords by frequency.`;

    let lastError = null;
    for (const modelName of candidateModels) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: { responseMimeType: "application/json" },
            });

            const result = await model.generateContent(prompt);
            const text = result.response.text();

            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("Invalid AI response format");
            return JSON.parse(jsonMatch[0]);
        } catch (err) {
            console.warn(`Gemini analysis with ${modelName} failed:`, err.message);
            lastError = err;
        }
    }

    throw lastError || new Error("All Gemini models failed");
};

// POST /api/analysis
export const createAnalysis = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ success: false, message: "URL is required" });

        const normalizedUrl = normalizeUrl(url);

        // Check user plan limits
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (user.plan === "free") {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const lastDate = user.lastAnalysisDate ? new Date(user.lastAnalysisDate) : null;
            const isToday = lastDate && lastDate >= today;

            if (isToday && user.analysisCount >= 5) {
                return res.status(429).json({
                    success: false,
                    message: "Daily limit reached (5/day on free plan). Upgrade to Pro for unlimited analyses.",
                });
            }

            if (!isToday) {
                user.analysisCount = 0;
            }
        }

        // Create analysis record
        const analysis = await Analysis.create({
            userId: req.userId,
            url: normalizedUrl,
            status: "processing",
        });

        // Update user count
        user.analysisCount = (user.analysisCount || 0) + 1;
        user.lastAnalysisDate = new Date();
        await user.save();

        // Return analysis ID immediately — frontend will poll
        res.status(201).json({ success: true, analysisId: analysis._id });

        // Run in background
        (async () => {
            try {
                const scrapedData = await scrapeWebsite(normalizedUrl);
                const aiData = await analyzeWithGemini(scrapedData);

                await Analysis.findByIdAndUpdate(analysis._id, {
                    status: "completed",
                    overallScore: aiData.overallScore || 0,
                    categories: aiData.categories || {},
                    keywords: aiData.keywords || [],
                    issues: aiData.issues || [],
                    metaData: scrapedData.metaData,
                    headings: scrapedData.headings,
                    links: scrapedData.links,
                    images: scrapedData.images,
                    loadTime: scrapedData.loadTime,
                    pageSize: scrapedData.pageSize,
                    wordCount: scrapedData.wordCount,
                });
            } catch (err) {
                console.error("Background analysis failed:", err.message);
                await Analysis.findByIdAndUpdate(analysis._id, {
                    status: "failed",
                    error: err.message || "Failed to analyze website",
                });
            }
        })();
    } catch (error) {
        console.error("Create analysis error:", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/analysis
export const getAnalyses = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const total = await Analysis.countDocuments({ userId: req.userId });
        const analyses = await Analysis.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select("-keywords -issues");

        res.json({
            success: true,
            analyses,
            total,
            totalPages: Math.ceil(total / limit),
            page,
        });
    } catch (error) {
        console.error("Get analyses error:", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/analysis/:id
export const getAnalysis = async (req, res) => {
    try {
        const analysis = await Analysis.findOne({ _id: req.params.id, userId: req.userId });
        if (!analysis) return res.status(404).json({ success: false, message: "Analysis not found" });

        res.json({ success: true, analysis });
    } catch (error) {
        console.error("Get analysis error:", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// DELETE /api/analysis/:id
export const deleteAnalysis = async (req, res) => {
    try {
        const analysis = await Analysis.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!analysis) return res.status(404).json({ success: false, message: "Analysis not found" });

        res.json({ success: true, message: "Analysis deleted" });
    } catch (error) {
        console.error("Delete analysis error:", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
