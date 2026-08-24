import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useIsMobile } from "@/hooks/useMobile";
import { Activity, Bot, Command, LayoutDashboard, Link2, Settings2, ShieldCheck } from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Overview", target: "overview" },
  { icon: Link2, label: "Pair device", target: "pair-device" },
  { icon: Command, label: "Commands", target: "commands" },
  { icon: Activity, label: "Activity", target: "activity" },
  { icon: Settings2, label: "Owner controls", target: "owner-controls" },
];

function scrollTo(target: string) {
  document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const collapsed = state === "collapsed";

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-border/70 bg-card/70 backdrop-blur-xl">
        <SidebarHeader className="h-[86px] justify-center px-3">
          <div className="flex items-center gap-3">
            <button onClick={toggleSidebar} aria-label="Toggle navigation" className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_30px_oklch(0.72_0.16_151_/_28%)] transition-transform duration-150 hover:scale-105 active:scale-[.97]">
              <Bot className="size-5" />
            </button>
            {!collapsed && <div className="min-w-0"><p className="font-display text-base font-bold tracking-tight">NEP BOT</p><p className="mono text-[10px] uppercase tracking-[.16em] text-primary">Control center</p></div>}
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2 pt-5">
          <p className="mb-3 px-3 mono text-[10px] uppercase tracking-[.16em] text-muted-foreground group-data-[collapsible=icon]:hidden">Workspace</p>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.target}>
                <SidebarMenuButton tooltip={item.label} onClick={() => scrollTo(item.target)} className="h-11 rounded-xl text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground">
                  <item.icon className="size-[17px]" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-3">
          <div className="rounded-2xl border border-border/70 bg-background/40 p-2.5 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
            {loading ? <div className="h-10 animate-pulse rounded-xl bg-muted" /> : user ? (
              <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
                <Avatar className="size-9 border border-primary/30"><AvatarFallback className="bg-primary/15 text-primary">{user.name?.slice(0, 1).toUpperCase() || "O"}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-xs font-semibold">{user.name || "Owner"}</p><p className="truncate text-[11px] text-muted-foreground">Secure session</p></div>
                <button onClick={logout} className="group-data-[collapsible=icon]:hidden text-[11px] text-muted-foreground hover:text-foreground">Sign out</button>
              </div>
            ) : (
              <Button onClick={() => startLogin()} size="sm" className="h-10 w-full rounded-xl text-xs group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0"><ShieldCheck className="size-4" /><span className="group-data-[collapsible=icon]:hidden">Owner sign in</span></Button>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-transparent">
        {isMobile && <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl"><SidebarTrigger className="rounded-xl" /><div><p className="font-display text-sm font-bold">NEP BOT</p><p className="mono text-[9px] uppercase tracking-[.14em] text-primary">Control center</p></div></header>}
        <main className="min-h-screen px-4 py-5 md:px-8 md:py-8">{children}</main>
      </SidebarInset>
    </>
  );
}
