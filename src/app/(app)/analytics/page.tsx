"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BarChart3, TrendingUp, Users, Globe } from "lucide-react";
import styles from "./analytics.module.css";

interface AnalyticsData {
    analytics: Array<{
        _id: {
            source?: string;
            medium?: string;
            campaign?: string;
        };
        count: number;
        uniqueUsers: number;
        uniqueSessions: number;
    }>;
    deviceBreakdown: Array<{
        _id: string;
        count: number;
    }>;
    topPages: Array<{
        _id: string;
        count: number;
    }>;
    browserBreakdown: Array<{
        _id: string;
        count: number;
    }>;
    timeRange: {
        start: string;
        end: string;
        days: number;
    };
}

export default function AnalyticsDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(7);
    const [selectedSource, setSelectedSource] = useState<string>("");

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    days: days.toString(),
                });

                if (selectedSource) {
                    params.append("source", selectedSource);
                }

                const res = await fetch(`/api/analytics?${params}`);
                const result = await res.json();

                if (result.success) {
                    setData(result.data);
                }
            } catch (error) {
                console.error("Error fetching analytics:", error);
            } finally {
                setLoading(false);
            }
        };

        if (status === "authenticated") {
            fetchAnalytics();
        }
    }, [status, days, selectedSource]);

    if (status === "loading" || loading) {
        return (
            <div className={styles.analytics}>
                <div className={styles.loading}>Loading analytics...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className={styles.analytics}>
                <div className={styles.error}>No analytics data available</div>
            </div>
        );
    }

    const totalVisits = data.analytics.reduce((sum, item) => sum + item.count, 0);
    const totalUsers = data.analytics.reduce((sum, item) => sum + item.uniqueUsers, 0);
    const totalSessions = data.analytics.reduce((sum, item) => sum + item.uniqueSessions, 0);

    // Get unique sources
    const sources = Array.from(
        new Set(data.analytics.map((item) => item._id.source).filter(Boolean))
    );

    return (
        <div className={styles.analytics}>
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <div className={styles.headerIcon}>
                        <BarChart3 size={48} />
                    </div>
                    <div className={styles.headerInfo}>
                        <h1 className={styles.title}>Viewership Analytics</h1>
                        <p className={styles.subtitle}>
                            Track UTM sources and analyze visitor behavior
                        </p>
                    </div>
                </div>
            </div>

            <div className={styles.filters}>
                <div className={styles.filterGroup}>
                    <label>Time Range</label>
                    <select
                        value={days}
                        onChange={(e) => setDays(parseInt(e.target.value))}
                        className={styles.select}
                    >
                        <option value={1}>Last 24 hours</option>
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label>Filter by Source</label>
                    <select
                        value={selectedSource}
                        onChange={(e) => setSelectedSource(e.target.value)}
                        className={styles.select}
                    >
                        <option value="">All Sources</option>
                        {sources.map((source) => (
                            <option key={source} value={source || ""}>
                                {source || "Direct"}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                        <TrendingUp size={28} />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>Total Visits</p>
                        <p className={styles.statValue}>{totalVisits.toLocaleString()}</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                        <Users size={28} />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>Unique Users</p>
                        <p className={styles.statValue}>{totalUsers.toLocaleString()}</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                        <Globe size={28} />
                    </div>
                    <div className={styles.statContent}>
                        <p className={styles.statLabel}>Sessions</p>
                        <p className={styles.statValue}>{totalSessions.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <div className={styles.contentGrid}>
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>UTM Source Performance</h2>
                    <div className={styles.table}>
                        <div className={styles.tableHeader}>
                            <div>Source</div>
                            <div>Medium</div>
                            <div>Campaign</div>
                            <div>Visits</div>
                            <div>Unique Users</div>
                            <div>Sessions</div>
                        </div>
                        {data.analytics.length > 0 ? (
                            data.analytics.map((item, idx) => (
                                <div key={idx} className={styles.tableRow}>
                                    <div>{item._id.source || "Direct"}</div>
                                    <div>{item._id.medium || "-"}</div>
                                    <div>{item._id.campaign || "-"}</div>
                                    <div className={styles.highlight}>{item.count}</div>
                                    <div>{item.uniqueUsers}</div>
                                    <div>{item.uniqueSessions}</div>
                                </div>
                            ))
                        ) : (
                            <div className={styles.emptyState}>No data available</div>
                        )}
                    </div>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Top Pages</h2>
                    <div className={styles.list}>
                        {data.topPages.map((page, idx) => (
                            <div key={idx} className={styles.listItem}>
                                <div className={styles.listContent}>
                                    <p className={styles.listTitle}>{page._id}</p>
                                </div>
                                <div className={styles.listValue}>{page.count} visits</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className={styles.contentGrid}>
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Device Breakdown</h2>
                    <div className={styles.list}>
                        {data.deviceBreakdown.map((device, idx) => (
                            <div key={idx} className={styles.listItem}>
                                <div className={styles.listContent}>
                                    <p className={styles.listTitle}>
                                        {device._id || "Unknown"}
                                    </p>
                                </div>
                                <div className={styles.listValue}>
                                    {device.count}{" "}
                                    <span className={styles.percentage}>
                                        (
                                        {(
                                            (device.count / totalVisits) *
                                            100
                                        ).toFixed(1)}
                                        %)
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Browser Distribution</h2>
                    <div className={styles.list}>
                        {data.browserBreakdown.map((browser, idx) => (
                            <div key={idx} className={styles.listItem}>
                                <div className={styles.listContent}>
                                    <p className={styles.listTitle}>
                                        {browser._id || "Unknown"}
                                    </p>
                                </div>
                                <div className={styles.listValue}>
                                    {browser.count}{" "}
                                    <span className={styles.percentage}>
                                        (
                                        {(
                                            (browser.count / totalVisits) *
                                            100
                                        ).toFixed(1)}
                                        %)
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className={styles.footer}>
                <p>
                    Last updated: {new Date(data.timeRange.end).toLocaleString()}
                </p>
                <p className={styles.footerNote}>
                    Data is retained for 90 days. Analytics updated in real-time.
                </p>
            </div>
        </div>
    );
}
