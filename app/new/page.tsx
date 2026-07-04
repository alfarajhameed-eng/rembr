"use client";

import { useAuth } from "@/lib/useAuth";
import ReminderForm from "@/app/components/ReminderForm";

export default function NewReminderPage() {
  const { loading } = useAuth();
  if (loading) return null;
  return <ReminderForm />;
}
