"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [joinMode, setJoinMode] = useState<"new" | "join">("new");
  const [householdCode, setHouseholdCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.7rem 0.9rem",
    borderRadius: "10px",
    border: "1px solid var(--paper-line)",
    background: "white",
    fontSize: "0.95rem",
    marginTop: "0.3rem"
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.85rem",
    color: "var(--ink-soft)",
    marginTop: "1rem"
  };

  async function handleSignIn() {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function handleSignUp() {
    setError("");
    if (!fullName.trim()) return setError("Enter your name.");
    if (joinMode === "join" && !householdCode.trim()) {
      return setError("Enter the household code, or choose to start your own space.");
    }
    setLoading(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password
    });

    if (signUpError || !signUpData.user) {
      setLoading(false);
      setError(signUpError?.message || "Something went wrong signing up.");
      return;
    }

    const userId = signUpData.user.id;

    // Create the profile row
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      full_name: fullName.trim()
    });

    if (profileError) {
      setLoading(false);
      setError(profileError.message);
      return;
    }

    if (joinMode === "join") {
      const { data: household, error: findError } = await supabase
        .from("households")
        .select("*")
        .eq("code", householdCode.trim().toUpperCase())
        .single();

      if (findError || !household) {
        setLoading(false);
        setError("Household code not found. Check it and try again.");
        return;
      }

      await supabase.from("profiles").update({ household_id: household.id }).eq("id", userId);
    } else {
      let code = generateCode();
      const { data: newHousehold, error: createError } = await supabase
        .from("households")
        .insert({ code, created_by: userId })
        .select()
        .single();

      if (createError || !newHousehold) {
        setLoading(false);
        setError(createError?.message || "Couldn't create your space.");
        return;
      }

      await supabase.from("profiles").update({ household_id: newHousehold.id }).eq("id", userId);
    }

    setLoading(false);

    if (signUpData.session) {
      router.push("/");
      router.refresh();
    } else {
      setError("Check your email to confirm your account, then sign in.");
      setMode("signin");
    }
  }

  return (
    <main
      style={{
        maxWidth: "420px",
        margin: "0 auto",
        padding: "3rem 1.2rem",
        minHeight: "100vh"
      }}
    >
      <h1 className="display" style={{ fontSize: "2rem", marginBottom: "0.1rem" }}>
        Rembr
      </h1>
      <p style={{ color: "var(--ink-soft)", marginTop: 0, marginBottom: "2rem" }}>
        A reminder system that learns you.
      </p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <button
          onClick={() => setMode("signin")}
          style={{
            flex: 1,
            padding: "0.6rem",
            borderRadius: "10px",
            border: "none",
            background: mode === "signin" ? "var(--ink)" : "var(--paper-line)",
            color: mode === "signin" ? "var(--paper)" : "var(--ink)",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Sign in
        </button>
        <button
          onClick={() => setMode("signup")}
          style={{
            flex: 1,
            padding: "0.6rem",
            borderRadius: "10px",
            border: "none",
            background: mode === "signup" ? "var(--ink)" : "var(--paper-line)",
            color: mode === "signup" ? "var(--paper)" : "var(--ink)",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Sign up
        </button>
      </div>

      {mode === "signup" && (
        <label style={labelStyle}>
          Your name
          <input style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
      )}

      <label style={labelStyle}>
        Email
        <input
          style={inputStyle}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label style={labelStyle}>
        Password
        <input
          style={inputStyle}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      {mode === "signup" && (
        <>
          <label style={labelStyle}>Space</label>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem" }}>
            <button
              onClick={() => setJoinMode("new")}
              style={{
                flex: 1,
                padding: "0.55rem",
                borderRadius: "10px",
                border: joinMode === "new" ? "none" : "1px solid var(--paper-line)",
                background: joinMode === "new" ? "var(--salmon)" : "white",
                color: joinMode === "new" ? "white" : "var(--ink)",
                fontSize: "0.85rem",
                cursor: "pointer"
              }}
            >
              Start my own space
            </button>
            <button
              onClick={() => setJoinMode("join")}
              style={{
                flex: 1,
                padding: "0.55rem",
                borderRadius: "10px",
                border: joinMode === "join" ? "none" : "1px solid var(--paper-line)",
                background: joinMode === "join" ? "var(--salmon)" : "white",
                color: joinMode === "join" ? "white" : "var(--ink)",
                fontSize: "0.85rem",
                cursor: "pointer"
              }}
            >
              Join a household
            </button>
          </div>

          {joinMode === "join" && (
            <label style={labelStyle}>
              Household code
              <input
                style={inputStyle}
                value={householdCode}
                onChange={(e) => setHouseholdCode(e.target.value.toUpperCase())}
                placeholder="e.g. K4P9QR"
              />
            </label>
          )}
        </>
      )}

      {error && (
        <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: "1rem" }}>{error}</p>
      )}

      <button
        onClick={mode === "signin" ? handleSignIn : handleSignUp}
        disabled={loading}
        style={{
          marginTop: "1.5rem",
          width: "100%",
          background: "var(--ink)",
          color: "var(--paper)",
          border: "none",
          borderRadius: "999px",
          padding: "0.8rem",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: "pointer"
        }}
      >
        {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
      </button>
    </main>
  );
}
