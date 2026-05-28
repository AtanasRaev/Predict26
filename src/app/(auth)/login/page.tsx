"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid username or password");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <Card className="w-full max-w-sm overflow-hidden shadow-2xl shadow-black/40">
      {/* Gradient accent bar */}
      <div className="h-1 bg-gradient-to-r from-primary via-blue-400 to-yellow-400" />

      <CardHeader className="text-center pt-6 pb-4">
        <div className="flex justify-center mb-3">
          <div className="p-3 rounded-full bg-yellow-400/15 ring-1 ring-yellow-400/30">
            <Trophy className="h-7 w-7 text-yellow-400" />
          </div>
        </div>
        <CardTitle className="text-xl font-bold">Sign In</CardTitle>
        <CardDescription className="text-sm">Welcome back to the predictions game</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 px-6">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 border border-destructive/20">
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your username"
              required
              autoComplete="username"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 px-6 pb-6">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline hover:text-foreground transition-colors">
              Register
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
