import type { Metadata } from "next";
import AppShell from "@/components/app/AppShell";

export const metadata: Metadata = { title: "SpatialGrid App | Play, generate, validate" };

export default function AppPage() {
  return <AppShell />;
}
