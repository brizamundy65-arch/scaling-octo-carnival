import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Base URL for API
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_URL,
});

// Add interceptor to inject token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('quote-flow-token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Helper to get or generate Guest ID
export const getUserId = (): string => {
    // Check if user is logged in
    const userStr = localStorage.getItem('quote-flow-user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user?.id) return user.id;
        } catch {
            localStorage.removeItem('quote-flow-user');
        }
    }

    // Check for existing Guest ID
    let guestId = localStorage.getItem('quote-flow-guest-id');
    if (!guestId) {
        guestId = uuidv4();
        localStorage.setItem('quote-flow-guest-id', guestId);
    }
    return guestId;
};

// --- API Methods ---

export interface Category {
    id: number;
    name: string;
    description: string;
    subcategories: Subcategory[];
}

export interface Subcategory {
    id: number;
    category_id: number;
    name: string;
    tags: string[];
}

export type Visibility = "public" | "unlisted" | "private";

export interface Quote {
    id: number;
    text: string;
    author: string;
    subcategory_id: number;
    background_color: string;
    text_color: string;
    font_family: string;
    visibility?: Visibility;
    user_id?: string; // UUID from users table
    created_at?: string;
    updated_at?: string;
    deleted_at?: string;
    category_name?: string;
    subcategory_name?: string;
}

export interface QuoteComment {
    id: number;
    quote_id: number;
    user_id: string | null;
    user_email?: string | null;
    content: string;
    created_at: string;
    updated_at?: string;
    pending?: boolean;
}

export const getCategories = async () => {
    const res = await api.get<Category[]>('/categories');
    return res.data;
};

export const getTimeline = async () => {
    const res = await api.get<Quote[]>('/quotes/timeline', {
        params: {}
    });
    return res.data;
};

export const getWidgets = () =>
  api.get<SiteWidget[]>("/widgets").then((res) => res.data);

export const getDiscovery = async () => {
    const res = await api.get<Quote[]>('/quotes/discovery');
    return res.data;
};

export const getLatest = async () => {
    const res = await api.get<Quote[]>('/quotes/latest');
    return res.data;
};

export const searchQuotes = async (query: string) => {
    const res = await api.get<Quote[]>('/quotes/search', {
        params: { q: query }
    });
    return res.data;
};

export const recordInteraction = (
  quoteId: number,
  interactionType: "view" | "like" | "remix" | "share"
) => {
  return api
    .post("/interactions", { quoteId, interactionType })
    .then((res) => res.data);
};

export const createUserQuote = (data: Partial<Quote>) =>
  api.post("/quotes", data).then((res) => res.data);

export const updateUserQuote = (id: number, data: Partial<Quote>) =>
  api.put(`/quotes/${id}`, data).then((res) => res.data);

export const deleteUserQuote = (id: number) =>
  api.delete(`/quotes/${id}`).then((res) => res.data);

export const getQuoteComments = (quoteId: number) =>
  api.get<QuoteComment[]>(`/quotes/${quoteId}/comments`).then((res) => res.data);

export const createQuoteComment = (quoteId: number, content: string) =>
  api
    .post<QuoteComment>(`/quotes/${quoteId}/comments`, { content })
    .then((res) => res.data);

export const updateQuoteComment = (
  quoteId: number,
  commentId: number,
  content: string
) =>
  api
    .put<QuoteComment>(`/quotes/${quoteId}/comments/${commentId}`, { content })
    .then((res) => res.data);

export const deleteQuoteComment = (quoteId: number, commentId: number) =>
  api.delete(`/quotes/${quoteId}/comments/${commentId}`).then((res) => res.data);

export const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
};

export const register = async (email: string, password: string) => {
    const res = await api.post('/auth/register', { email, password });
    return res.data;
};

export const getMe = async () => {
    const res = await api.get('/auth/me');
    return res.data;
};

// --- Admin Methods ---

export const getAdminStats = async () => {
    const res = await api.get('/admin/stats');
    return res.data;
};

export const getAdminUsers = async () => {
    const res = await api.get('/admin/users');
    return res.data;
};

export const updateAdminUser = async (id: string, data: { role?: string; is_verified?: boolean }) => {
    const res = await api.patch(`/admin/users/${id}`, data);
    return res.data;
};

export const getAdminQuotes = async () => {
    const res = await api.get('/admin/quotes');
    return res.data;
};

export const deleteAdminQuote = (id: number) =>
  api.delete(`/admin/quotes/${id}`).then((res) => res.data);

export const createAdminQuote = (data: Partial<Quote>) =>
  api.post("/admin/quotes", data).then((res) => res.data);

export const updateAdminQuote = (id: number, data: Partial<Quote>) =>
  api.put(`/admin/quotes/${id}`, data).then((res) => res.data);

export const getAdminCategories = () =>
  api.get("/admin/categories").then((res) => res.data);

export const createAdminCategory = (data: { name: string; description: string }) =>
  api.post("/admin/categories", data).then((res) => res.data);

export const updateAdminCategory = (id: number, data: { name: string; description: string }) =>
  api.put(`/admin/categories/${id}`, data).then((res) => res.data);

export const deleteAdminCategory = (id: number) =>
  api.delete(`/admin/categories/${id}`).then((res) => res.data);

export const getAdminSubcategories = (categoryId: number) =>
  api.get(`/admin/categories/${categoryId}/subcategories`).then((res) => res.data);

export const createAdminSubcategory = (data: { name: string; category_id: number }) =>
  api.post("/admin/subcategories", data).then((res) => res.data);

export interface SiteWidget {
  key: string;
  title: string;
  content: Record<string, unknown>;
  is_active: boolean;
  updated_at: string;
}

export interface SiteWidgetUpdate {
  title?: string;
  content?: Record<string, unknown>;
  is_active?: boolean;
}

export const getAdminWidgets = () =>
  api.get("/admin/widgets").then((res) => res.data);

export const updateAdminWidget = (key: string, data: SiteWidgetUpdate) =>
  api.put(`/admin/widgets/${key}`, data).then((res) => res.data);

export const deleteAdminSubcategory = (id: number) =>
  api.delete(`/admin/subcategories/${id}`).then((res) => res.data);

// ============================================
// User Profile APIs
// ============================================
export const updateUserProfile = (data: { name?: string }) =>
  api.put("/auth/profile", data).then((res) => res.data);

// ============================================
// User Quotes APIs
// ============================================
export const getMyQuotes = () =>
  api.get<Quote[]>("/quotes/my").then((res) => res.data);

export const getUserQuotes = (userId: string) =>
  api.get<Quote[]>(`/quotes/user/${userId}`).then((res) => res.data);

export const getUserBookmarks = () =>
  api.get<Quote[]>("/quotes/bookmarks").then((res) => res.data);

// ============================================
// Likes APIs
// ============================================
export interface LikeResponse {
  liked: boolean;
  count: number;
}

export const likeQuote = (id: number) =>
  api.post<LikeResponse>(`/quotes/${id}/like`).then((res) => res.data);

export const unlikeQuote = (id: number) =>
  api.delete<LikeResponse>(`/quotes/${id}/like`).then((res) => res.data);

export const getQuoteLike = (id: number) =>
  api.get<LikeResponse>(`/quotes/${id}/like`).then((res) => res.data);

// ============================================
// Bookmarks APIs
// ============================================
export interface BookmarkResponse {
  bookmarked: boolean;
}

export const bookmarkQuote = (id: number) =>
  api.post<BookmarkResponse>(`/quotes/${id}/bookmark`).then((res) => res.data);

export const removeBookmark = (id: number) =>
  api.delete<BookmarkResponse>(`/quotes/${id}/bookmark`).then((res) => res.data);

export default api;
