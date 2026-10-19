/* eslint-disable @typescript-eslint/no-explicit-any */
import { AlertTriangleIcon, ClockIcon } from "lucide-react";
import ScoreGauge from "./ScoreGauge";
import { Link } from "react-router-dom";

export default function AnalysesCard({ analysis }: { analysis: any }) {
    const getScoreClass = (s: number) => {
        if (s >= 80) return "score-good";
        if (s >= 50) return "score-medium";
        return "score-poor";
    };

    const getHostname = (urlStr: string) => {
        try {
            return new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`).hostname;
        } catch {
            return urlStr || "Website";
        }
    };

    return (
        <Link key={analysis._id} to={`/report/${analysis._id}`} className="glass rounded-2xl p-5 hover:bg-muted/50 transition-all group block">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{getHostname(analysis.url)}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{analysis.url}</p>
                </div>
                {analysis.status === "completed" ? (
                    <ScoreGauge score={analysis.overallScore || 0} size={56} strokeWidth={5} />
                ) : analysis.status === "processing" ? (
                    <div className="w-14 h-14 rounded-full glass flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="w-14 h-14 rounded-full glass flex items-center justify-center">
                        <AlertTriangleIcon size={18} className="text-danger" />
                    </div>
                )}
            </div>

            {analysis.status === "completed" && (
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { label: "SEO", value: analysis.categories?.seo ?? 0 },
                        { label: "Perf", value: analysis.categories?.performance ?? 0 },
                        { label: "A11y", value: analysis.categories?.accessibility ?? 0 },
                        { label: "BP", value: analysis.categories?.bestPractices ?? 0 },
                    ].map((c) => (
                        <div key={c.label} className="text-center">
                            <p className={`text-sm font-medium ${getScoreClass(c.value)}`}>{c.value}</p>
                            <p className="text-[10px] text-muted-foreground">{c.label}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-1 mt-4 text-xs text-muted-foreground">
                <ClockIcon size={12} /> {analysis.createdAt ? new Date(analysis.createdAt).toLocaleDateString() : ""}
            </div>
        </Link>
    );
}
