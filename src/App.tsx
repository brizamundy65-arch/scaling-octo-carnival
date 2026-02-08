import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";
import Home from "./pages/Home";
import Editor from "./pages/Editor";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Discovery from "./pages/Discovery";
import Search from "./pages/Search";
import QuoteView from "./pages/Quote";
import LegalPage from "./pages/Legal";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import QuotesManager from "./pages/admin/QuotesManager";
import UsersManager from "./pages/admin/UsersManager";
import CategoryManager from "./pages/admin/CategoryManager";
import WidgetManager from "./pages/admin/WidgetManager";
import { SettingsManager } from "./pages/admin/SettingsManager";
import ScrollToTop from "./components/ScrollToTop";

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/auth" element={<Auth />} />

        {/* Main App Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="discovery" element={<Discovery />} />
          <Route path="create" element={<Editor />} />
          <Route path="q/:id/:slug?" element={<QuoteView />} />
          <Route path="terms" element={<LegalPage type="terms" />} />
          <Route path="privacy" element={<LegalPage type="privacy" />} />
          <Route path="cookies" element={<LegalPage type="cookies" />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="quotes" element={<QuotesManager />} />
          <Route path="users" element={<UsersManager />} />
          <Route path="categories" element={<CategoryManager />} />
          <Route path="widgets" element={<WidgetManager />} />
          <Route path="settings" element={<SettingsManager />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
