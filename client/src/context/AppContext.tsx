import type { AxiosInstance } from "axios";
import axios from "axios";
import { createContext, useState, useEffect, useContext, type ReactNode } from "react";

interface User {
    _id: string;
    name: string;
    email: string;
    plan: string;
    analysisCount?: number;
}

interface AppContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    api: AxiosInstance;
    login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
    register: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
}

const getBackendUrl = () => {
    let url = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").trim();
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
        url = `https://${url}`;
    }
    return url.replace(/\/+$/, "");
};

const BACKEND_URL = getBackendUrl();

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
    const [loading, setLoading] = useState(true);

    // Axios instance with auth header
    const api = axios.create({ baseURL: BACKEND_URL });

    api.interceptors.request.use((config) => {
        const storedToken = localStorage.getItem("token");
        if (storedToken) {
            config.headers.Authorization = `Bearer ${storedToken}`;
        }
        return config;
    });

    const loadUser = async () => {
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const { data } = await api.get("/api/auth/user");
            if (data.success) {
                setUser(data.user);
            }
        } catch {
            localStorage.removeItem("token");
            setToken(null);
            setUser(null);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const res = await axios.post(`${BACKEND_URL}/api/auth/login`, { email, password });
            if (res.data.success) {
                setToken(res.data.token);
                setUser(res.data.user);
                localStorage.setItem("token", res.data.token);
                return { success: true };
            }
            return { success: false, message: res.data.message };
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            return { success: false, message: err.response?.data?.message || "Login failed" };
        }
    };

    const register = async (name: string, email: string, password: string) => {
        try {
            const res = await axios.post(`${BACKEND_URL}/api/auth/register`, { name, email, password });
            if (res.data.success) {
                setToken(res.data.token);
                setUser(res.data.user);
                localStorage.setItem("token", res.data.token);
                return { success: true };
            }
            return { success: false, message: res.data.message };
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            return { success: false, message: err.response?.data?.message || "Registration failed" };
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    };

    const value = { user, token, loading, api, login, register, logout };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) throw new Error("useApp must be used within AppProvider");
    return context;
}
