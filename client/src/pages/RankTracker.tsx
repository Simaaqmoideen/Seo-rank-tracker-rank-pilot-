/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Target, Plus, RefreshCw, Trash2, TrendingUp, TrendingDown, Minus, ExternalLink, Clock, Loader2, X, Search, Globe, AlertCircle, Eye, EyeOff, Filter, ArrowUpDown } from "lucide-react";
import { useApp } from "../context/AppContext";
import toast from "react-hot-toast";

interface KeywordItem {
    _id: string;
    keyword: string;
    url: string;
    domain: string;
    currentPosition: number | null;
    currentPage: number | null;
    bestPosition: number | null;
    positionChange: number;
    active: boolean;
    lastChecked: string | null;
    status: string;
    createdAt: string;
    competitors: { position: number; url: string; domain: string; title: string; snippet: string }[];
}

export default function RankTracker() {
    const { api } = useApp();
    const [keywords, setKeywords] = useState<KeywordItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newKeyword, setNewKeyword] = useState("");
    const [newUrl, setNewUrl] = useState("");
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState("");
    const [refreshing, setRefreshing] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("newest");

    const fetchKeywords = async () => {
        try {
            const { data } = await api.get("/api/rank");
            if (data.success) setKeywords(data.keywords);
        } catch {
            toast.error("Failed to load keywords");
        }
        setLoading(false);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddError("");
        if (!newKeyword.trim() || !newUrl.trim()) {
            setAddError("Both keyword and URL are required.");
            return;
        }
        setAdding(true);
        try {
            const { data } = await api.post("/api/rank", { keyword: newKeyword.trim(), url: newUrl.trim() });
            if (data.success) {
                setKeywords((prev) => [data.rank, ...prev]);
                setShowAddModal(false);
                setNewKeyword("");
                setNewUrl("");
                toast.success("Keyword added! Checking rankings...");
            } else {
                setAddError(data.message || "Failed to add keyword");
            }
        } catch (err: any) {
            setAddError(err.response?.data?.message || "Failed to add keyword");
        }
        setAdding(false);
    };

    const handleRefresh = async (id: string) => {
        setRefreshing(id);
        try {
            await api.post(`/api/rank/${id}/refresh`);
            toast.success("Refresh started — results update in ~30s");
            // Update status to "checking" in UI
            setKeywords((prev) => prev.map((k) => k._id === id ? { ...k, status: "checking" } : k));
            // Re-fetch after delay
            setTimeout(fetchKeywords, 30000);
        } catch {
            toast.error("Failed to refresh ranking");
        }
        setRefreshing(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this keyword tracking?")) return;
        setDeleting(id);
        try {
            const { data } = await api.delete(`/api/rank/${id}`);
            if (data.success) {
                setKeywords((prev) => prev.filter((k) => k._id !== id));
                toast.success("Keyword removed");
            }
        } catch {
            toast.error("Failed to delete keyword");
        }
        setDeleting(null);
    };

    const handleToggle = async (id: string) => {
        try {
            const { data } = await api.patch(`/api/rank/${id}/toggle`);
            if (data.success) {
                setKeywords((prev) => prev.map((k) => k._id === id ? { ...k, active: data.rank.active } : k));
            }
        } catch {
            toast.error("Failed to toggle keyword");
        }
    };

    const getPositionBadge = (pos: number | null) => {
        if (pos === null) return { text: "Not Ranked", class: "text-muted-foreground bg-muted/50" };
        if (pos <= 3) return { text: `#${pos}`, class: "text-emerald-400 bg-emerald-500/15 border border-emerald-500/30" };
        if (pos <= 10) return { text: `#${pos}`, class: "text-primary bg-primary/15 border border-primary/30" };
        if (pos <= 20) return { text: `#${pos}`, class: "text-accent bg-accent/15 border border-accent/30" };
        return { text: `#${pos}`, class: "text-danger bg-danger/15 border border-danger/30" };
    };

    const getChangeIndicator = (change: number) => {
        if (change > 0) return { icon: <TrendingUp size={14} />, text: `+${change}`, class: "text-emerald-500" };
        if (change < 0) return { icon: <TrendingDown size={14} />, text: `${change}`, class: "text-danger" };
        return { icon: <Minus size={14} />, text: "0", class: "text-muted-foreground" };
    };

    let processedData = [...keywords];
    if (searchQuery) {
        processedData = processedData.filter((k) => k.keyword.toLowerCase().includes(searchQuery.toLowerCase()) || k.domain.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (statusFilter !== "all") {
        if (statusFilter === "active") processedData = processedData.filter((k) => k.active === true);
        else if (statusFilter === "paused") processedData = processedData.filter((k) => k.active === false);
    }
    processedData.sort((a: any, b: any) => {
        if (sortBy === "newest") return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        if (sortBy === "rank_asc") return (a.currentPosition || 999) - (b.currentPosition || 999);
        if (sortBy === "rank_desc") return (b.currentPosition || 0) - (a.currentPosition || 0);
        if (sortBy === "change") return (b.positionChange || 0) - (a.positionChange || 0);
        return 0;
    });

    useEffect(() => {
        fetchKeywords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="min-h-scree pt-16 md:pt-24 bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-medium text-foreground">
                            <span className="gradient-text">Rank Tracker</span>
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">Track your keyword rankings on Google — updated daily.</p>
                    </div>
                    <button onClick={() => setShowAddModal(true)} className="bg-primary px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-2 self-start" id="add-keyword-btn" style={{ color: "var(--background)" }}>
                        <Plus size={18} /> Track Keyword
                    </button>
                </div>

                {/* Filters */}
                <div className="mb-6 flex flex-col md:flex-row gap-3">
                    <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2 flex-1">
                        <Search size={18} className="text-muted-foreground" />
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search keywords or domains..." className="bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none flex-1" id="rank-search-input" />
                    </div>
                    <div className="flex gap-3">
                        <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2">
                            <Filter size={16} className="text-muted-foreground" />
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-transparent text-sm text-foreground outline-none appearance-none pr-4 cursor-pointer">
                                <option value="all" className="bg-background">All Status</option>
                                <option value="active" className="bg-background">Active</option>
                                <option value="paused" className="bg-background">Paused</option>
                            </select>
                        </div>
                        <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2">
                            <ArrowUpDown size={16} className="text-muted-foreground" />
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-transparent text-sm text-foreground outline-none appearance-none pr-4 cursor-pointer">
                                <option value="newest" className="bg-background">Newest First</option>
                                <option value="rank_asc" className="bg-background">Highest Ranked</option>
                                <option value="rank_desc" className="bg-background">Lowest Ranked</option>
                                <option value="change" className="bg-background">Biggest Gain</option>
                            </select>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-30">
                        <div className="size-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : processedData.length === 0 ? (
                    <div className="glass rounded-2xl p-12 text-center">
                        <Target size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No keywords tracked yet</h3>
                        <p className="text-sm text-muted-foreground mb-6">Add your first keyword and URL to start tracking your Google rankings.</p>
                        <button onClick={() => setShowAddModal(true)} className="bg-primary px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity" style={{ color: "var(--background)" }}>
                            Track Your First Keyword
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {processedData.map((kw) => {
                            const posBadge = getPositionBadge(kw.currentPosition);
                            const change = getChangeIndicator(kw.positionChange);
                            return (
                                <div key={kw._id} className={`glass rounded-xl p-5 hover:bg-muted/50 transition-all ${!kw.active ? "opacity-50" : ""}`}>
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                        <div className="flex items-center gap-4 lg:w-32 shrink-0">
                                            {kw.status === "checking" ? (
                                                <div className="w-16 h-16 rounded-xl glass flex items-center justify-center">
                                                    <Loader2 size={24} className="text-primary animate-spin" />
                                                </div>
                                            ) : (
                                                <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-lg font-bold ${posBadge.class}`}>{kw.currentPosition ? `#${kw.currentPosition}` : "—"}</div>
                                            )}
                                            {kw.status === "completed" && kw.currentPosition && (
                                                <div className="text-center mt-1">
                                                    <div className={`flex items-center justify-center gap-1 text-sm font-medium ${change.class}`}>{change.icon}{change.text}</div>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">change</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <Link to={`/rank/${kw._id}`} className="text-base font-semibold text-foreground hover:text-primary transition-colors block truncate">
                                                "{kw.keyword}"
                                            </Link>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Globe size={12} className="text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground truncate">{kw.domain}</span>
                                                {kw.currentPage && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Page {kw.currentPage}</span>}
                                            </div>
                                            {kw.lastChecked && (
                                                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                                    <Clock size={10} /> Last checked: {new Date(kw.lastChecked).toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                        {kw.status === "completed" && (
                                            <div className="hidden md:flex items-center gap-5">
                                                <div className="text-center">
                                                    <p className="text-sm font-bold text-primary">{kw.bestPosition || "—"}</p>
                                                    <p className="text-[10px] text-muted-foreground">Best</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-bold text-accent">{kw.competitors?.length || 0}</p>
                                                    <p className="text-[10px] text-muted-foreground">Competitors</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <Link to={`/rank/${kw._id}`} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-all" title="View Details">
                                                <ExternalLink size={16} />
                                            </Link>
                                            <button onClick={() => handleRefresh(kw._id)} disabled={refreshing === kw._id || kw.status === "checking"} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-all disabled:opacity-30" title="Refresh Ranking">
                                                <RefreshCw size={16} className={refreshing === kw._id ? "animate-spin" : ""} />
                                            </button>
                                            <button onClick={() => handleToggle(kw._id)} className={`p-2 rounded-lg hover:bg-muted transition-all ${kw.active ? "text-success hover:text-success" : "text-muted-foreground hover:text-foreground"}`} title={kw.active ? "Pause Tracking" : "Resume Tracking"}>
                                                {kw.active ? <Eye size={16} /> : <EyeOff size={16} />}
                                            </button>
                                            <button onClick={() => handleDelete(kw._id)} disabled={deleting === kw._id} className="p-2 rounded-lg hover:bg-danger/10 text-muted-foreground hover:text-danger transition-all disabled:opacity-50" title="Delete">
                                                {deleting === kw._id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-foreground">Track New Keyword</h2>
                            <button onClick={() => { setShowAddModal(false); setAddError(""); }} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
                        </div>
                        {addError && (
                            <div className="mb-4 px-4 py-3 rounded-xl severity-critical text-sm flex items-center gap-2">
                                <AlertCircle size={16} className="shrink-0" />{addError}
                            </div>
                        )}
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label htmlFor="modal-keyword" className="block text-sm font-medium text-foreground mb-1.5">Keyword</label>
                                <div className="relative">
                                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input id="modal-keyword" type="text" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} placeholder='e.g., "best seo tools"' required className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder-muted-foreground outline-none focus:border-primary/50 transition-colors text-sm" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="modal-url" className="block text-sm font-medium text-foreground mb-1.5">Website URL</label>
                                <div className="relative">
                                    <Globe size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input id="modal-url" type="text" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="e.g., example.com" required className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder-muted-foreground outline-none focus:border-primary/50 transition-colors text-sm" />
                                </div>
                            </div>
                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-muted-foreground">
                                <p>💡 We'll search Google for your keyword, find your website's position (up to page 5), and track it daily.</p>
                            </div>
                            <button type="submit" disabled={adding} className="w-full py-3 rounded-xl bg-primary font-semibold text-sm text-primary-foreground flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50" style={{ color: "var(--background)" }}>
                                {adding ? <Loader2 size={18} className="animate-spin" /> : <><Target size={18} />Start Tracking</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
