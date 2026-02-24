import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="pl-16 md:pl-56 p-6">
        <Outlet />
      </main>
    </div>
  );
}
