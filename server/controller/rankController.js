import axios from "axios";
import * as cheerio from "cheerio";
import Rank from "../model/rankModel.js";

const normalizeUrl = (url) => {
    url = url.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
    }
    return url;
};

const extractDomain = (url) => {
    try {
        return new URL(normalizeUrl(url)).hostname.replace("www.", "");
    } catch {
        return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    }
};

// Scrape Google search results to find keyword ranking
const checkGoogleRanking = async (keyword, targetUrl) => {
    const targetDomain = extractDomain(targetUrl);
    const competitors = [];
    let targetPosition = null;
    let targetPage = null;

    const headers = {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
    };

    for (let page = 0; page < 5; page++) {
        const start = page * 10;
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&start=${start}&num=10&hl=en&gl=us`;

        try {
            const response = await axios.get(searchUrl, {
                headers,
                timeout: 15000,
                maxRedirects: 3,
            });

            const $ = cheerio.load(response.data);
            let resultsFound = 0;

            // Parse search result items
            $("div.g, div[data-sokoban-container], div[data-hveid]").each((i, el) => {
                const linkEl = $(el).find("a[href]").first();
                const href = linkEl.attr("href");
                if (!href || !href.startsWith("http")) return;

                const title = $(el).find("h3").first().text().trim();
                if (!title) return;

                const snippet =
                    $(el).find("div[data-sncf], .VwiC3b, .yXK7lf, .s3v9rd, .aCOpRe, .hgKElc").first().text().trim() ||
                    "";

                const position = start + resultsFound + 1;
                resultsFound++;

                let resultDomain = "";
                try {
                    resultDomain = new URL(href).hostname.replace("www.", "");
                } catch {
                    return;
                }

                // Collect top 10 competitors
                if (position <= 10) {
                    competitors.push({
                        position,
                        url: href,
                        domain: resultDomain,
                        title,
                        snippet: snippet.slice(0, 200),
                    });
                }

                // Check if this result matches our target
                if (
                    !targetPosition &&
                    (resultDomain === targetDomain ||
                        resultDomain.includes(targetDomain) ||
                        targetDomain.includes(resultDomain))
                ) {
                    targetPosition = position;
                    targetPage = page + 1;
                }
            });

            if (targetPosition) break;
            if (resultsFound === 0) break; // No more results

            // Polite delay between pages
            if (page < 4) await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
        } catch (err) {
            console.error(`Rank check page ${page + 1} error:`, err.message);
            break;
        }
    }

    return {
        position: targetPosition,
        page: targetPage,
        competitors: competitors.slice(0, 10),
    };
};

// POST /api/rank
export const addKeyword = async (req, res) => {
    try {
        const { keyword, url } = req.body;
        if (!keyword || !url) {
            return res.status(400).json({ success: false, message: "Keyword and URL are required" });
        }

        const normalizedUrl = normalizeUrl(url);
        const domain = extractDomain(url);

        const rank = await Rank.create({
            userId: req.userId,
            keyword: keyword.trim(),
            url: normalizedUrl,
            domain,
            status: "checking",
        });

        res.status(201).json({ success: true, rank });

        // Check ranking in background
        (async () => {
            try {
                const { position, page, competitors } = await checkGoogleRanking(keyword, normalizedUrl);

                const update = {
                    status: "completed",
                    currentPosition: position,
                    currentPage: page,
                    lastChecked: new Date(),
                    competitors,
                };

                if (position) {
                    update.bestPosition = position;
                    update.$push = {
                        rankHistory: {
                            date: new Date(),
                            position,
                            page,
                            title: competitors.find((c) => extractDomain(c.url) === domain)?.title || "",
                            snippet: competitors.find((c) => extractDomain(c.url) === domain)?.snippet || "",
                        },
                    };
                }

                await Rank.findByIdAndUpdate(rank._id, update);
            } catch (err) {
                console.error("Rank check failed:", err.message);
                await Rank.findByIdAndUpdate(rank._id, { status: "failed" });
            }
        })();
    } catch (error) {
        console.error("Add keyword error:", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/rank
export const getKeywords = async (req, res) => {
    try {
        const keywords = await Rank.find({ userId: req.userId }).sort({ createdAt: -1 }).select("-rankHistory");
        res.json({ success: true, keywords });
    } catch (error) {
        console.error("Get keywords error:", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/rank/:id
export const getKeyword = async (req, res) => {
    try {
        const rank = await Rank.findOne({ _id: req.params.id, userId: req.userId });
        if (!rank) return res.status(404).json({ success: false, message: "Keyword tracking not found" });

        res.json({ success: true, rank });
    } catch (error) {
        console.error("Get keyword error:", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /api/rank/:id/refresh
export const refreshRanking = async (req, res) => {
    try {
        const rank = await Rank.findOne({ _id: req.params.id, userId: req.userId });
        if (!rank) return res.status(404).json({ success: false, message: "Keyword tracking not found" });

        if (rank.status === "checking") {
            return res.status(400).json({ success: false, message: "Already checking ranking" });
        }

        await Rank.findByIdAndUpdate(rank._id, { status: "checking" });
        res.json({ success: true, message: "Refresh started" });

        // Run in background
        (async () => {
            try {
                const { position, page, competitors } = await checkGoogleRanking(rank.keyword, rank.url);
                const previousPosition = rank.currentPosition;
                const positionChange = previousPosition && position ? previousPosition - position : 0;

                const update = {
                    status: "completed",
                    currentPosition: position,
                    currentPage: page,
                    lastChecked: new Date(),
                    positionChange,
                    competitors,
                };

                if (position && (!rank.bestPosition || position < rank.bestPosition)) {
                    update.bestPosition = position;
                }

                if (position) {
                    update.$push = {
                        rankHistory: {
                            date: new Date(),
                            position,
                            page,
                            title: competitors.find((c) => extractDomain(c.url) === rank.domain)?.title || "",
                            snippet: competitors.find((c) => extractDomain(c.url) === rank.domain)?.snippet || "",
                        },
                    };
                }

                await Rank.findByIdAndUpdate(rank._id, update);
            } catch (err) {
                console.error("Refresh ranking failed:", err.message);
                await Rank.findByIdAndUpdate(rank._id, { status: "failed" });
            }
        })();
    } catch (error) {
        console.error("Refresh ranking error:", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// DELETE /api/rank/:id
export const deleteKeyword = async (req, res) => {
    try {
        const rank = await Rank.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!rank) return res.status(404).json({ success: false, message: "Keyword tracking not found" });

        res.json({ success: true, message: "Keyword tracking deleted" });
    } catch (error) {
        console.error("Delete keyword error:", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// PATCH /api/rank/:id/toggle
export const toggleKeyword = async (req, res) => {
    try {
        const rank = await Rank.findOne({ _id: req.params.id, userId: req.userId });
        if (!rank) return res.status(404).json({ success: false, message: "Keyword tracking not found" });

        rank.active = !rank.active;
        await rank.save();

        res.json({ success: true, rank });
    } catch (error) {
        console.error("Toggle keyword error:", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
