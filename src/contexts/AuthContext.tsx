/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from "react";
import { login as apiLogin, register as apiRegister, getMe } from "@/lib/api";

interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
  handle?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (
    email: string,
    password: string,
    type: "login" | "register"
  ) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("quote-flow-token");
      if (token) {
        try {
          const userData = await getMe();
          const hydratedUser: User = {
            ...userData,
            name: userData.email.split("@")[0],
            handle: "@" + userData.email.split("@")[0],
            avatar: `https://ui-avatars.com/api/?name=${userData.email}&background=random`,
          };
          setUser(hydratedUser);
          localStorage.setItem("quote-flow-user", JSON.stringify(userData));
        } catch (e) {
          console.error("Failed to restore session:", e);
          localStorage.removeItem("quote-flow-token");
          localStorage.removeItem("quote-flow-user");
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (
    email: string,
    password: string,
    type: "login" | "register"
  ) => {
    let data;
    if (type === "login") {
      data = await apiLogin(email, password);
    } else {
      data = await apiRegister(email, password);
    }

    const { user: apiUser, token } = data;

    localStorage.setItem("quote-flow-token", token);
    localStorage.setItem("quote-flow-user", JSON.stringify(apiUser));

    setUser({
      ...apiUser,
      name: apiUser.email.split("@")[0],
      handle: "@" + apiUser.email.split("@")[0],
      avatar: `https://ui-avatars.com/api/?name=${apiUser.email}&background=random`,
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("quote-flow-token");
    localStorage.removeItem("quote-flow-user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
