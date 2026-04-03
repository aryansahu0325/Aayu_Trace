import { useState } from "react";
import { 
  Home, 
  Package, 
  Plus, 
  BarChart3, 
  Tag, 
  ShoppingCart, 
  Bell,
  Users,
  LogOut 
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Products", url: "/products", icon: Package },
  { title: "Add Product", url: "/add-product", icon: Plus },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Categories", url: "/categories", icon: Tag },
  { title: "Shopping Lists", url: "/shopping-lists", icon: ShoppingCart },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Family", url: "/family", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50";

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar
      className={state === "collapsed" ? "w-14" : "w-60"}
      collapsible="icon"
    >
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 text-primary font-bold">
            <img src="/favicon.svg" alt="AayuTrace Icon" className="w-5 h-5 rounded drop-shadow-sm" />
            AayuTrace
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                  <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {state !== "collapsed" && <span>Sign Out</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}