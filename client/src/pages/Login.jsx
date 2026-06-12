import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Package } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";
import { useToast } from "../components/toast.jsx";
import { Button, Input, Label, Card, PasswordInput } from "../components/ui.jsx";
export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || "/dashboard";

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function fill(role) {
    if (role === "admin") {
      setEmail("admin@culturalcouncil.in");
      setPassword("Admin@123");
    } else {
      setEmail("member@culturalcouncil.in");
      setPassword("User@123");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <div className="px-6 py-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Package size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Welcome to AssetFlow</h1>
            <p className="mt-1 text-sm text-slate-500">
              Cultural Council Asset Management Platform
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@culturalcouncil.in"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-4 flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => fill("admin")}>
              Demo Admin
            </Button>
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => fill("user")}>
              Demo User
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            No account?{" "}
            <Link to="/register" className="font-medium text-brand-600 hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
