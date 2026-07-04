"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "@/lib/types";

export function useAuth() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (active) {
        setProfile(profileData);
        setLoading(false);
      }
    }

    load();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push("/login");
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return { profile, loading, signOut };
}
