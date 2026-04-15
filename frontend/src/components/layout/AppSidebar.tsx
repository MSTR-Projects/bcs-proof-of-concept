import { Home, Users, Building2, Settings, ChevronDown, ClipboardCheck, LogOut, BookOpen, ListChecks, Layers, MoreVertical, Sun, Moon, Monitor, BarChart3, Globe, LayoutGrid, FilePlus2, FolderPlus, Hammer } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useTaskContext } from "@/context/TaskContext";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import bcsLogo from "@/assets/bcs-logo.svg";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

export function AppSidebar() {
  const { teams, currentTeam, setCurrentTeamId } = useTaskContext();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
  };

  const themeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const ThemeIcon = themeIcon;

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-5 border-b border-sidebar-border -mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sidebar-primary flex items-center justify-center shadow-lg">
              <ClipboardCheck className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-sidebar-foreground tracking-tight">
              Controle <span className="text-sidebar-foreground">assistent</span>
            </span>
          </div>
        </div>
        <div className="flex justify-end items-center gap-1 -mb-3">
          <span className="text-[9px] text-sidebar-muted uppercase tracking-wider">Powered by</span>
          <div className="bg-white/90 rounded px-1.5 py-0.5 w-fit">
            <img src={bcsLogo} alt="BCS" className="h-3 w-auto" />
          </div>
        </div>
      </SidebarHeader>

      <div className="px-3 py-3 border-b border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground text-sm font-medium transition-colors">
            <span>{currentTeam?.name || 'Selecteer team'}</span>
            <ChevronDown className="h-4 w-4 text-sidebar-muted" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {teams.map((team) => (
              <DropdownMenuItem
                key={team.id}
                onClick={() => setCurrentTeamId(team.id)}
                className={currentTeam?.id === team.id ? "bg-accent" : ""}
              >
                {team.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SidebarContent className="px-3 py-4">
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/"
                    end
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                  >
                    <Home className="h-5 w-5" />
                    <span>Dashboard</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Team */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/team"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                  >
                    <Users className="h-5 w-5" />
                    <span>Team</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Controles Section */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs text-sidebar-muted font-semibold uppercase tracking-wider mb-2">
            Controles
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/controles"
                    end
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                  >
                    <ListChecks className="h-5 w-5" />
                    <span>Alle controles</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/controles/resultaten"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                  >
                    <BarChart3 className="h-5 w-5" />
                    <span>Geschiedenis</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/controle-series"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                  >
                    <Layers className="h-5 w-5" />
                    <span>Reeksen</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/klanten"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                  >
                    <Building2 className="h-5 w-5" />
                    <span>Klanten</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Ontwikkelen Section */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs text-sidebar-muted font-semibold uppercase tracking-wider mb-2">
            Ontwikkelen
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/gallerij"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                  >
                    <LayoutGrid className="h-5 w-5" />
                    <span>Controle gallerij</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/controle/nieuw"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                  >
                    <FilePlus2 className="h-5 w-5" />
                    <span>Controle maken</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/controle-series/nieuw"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                  >
                    <FolderPlus className="h-5 w-5" />
                    <span>Reeks maken</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/regels"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                  >
                    <BookOpen className="h-5 w-5" />
                    <span>Regelbibliotheek</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/controles/globale-waarden"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                  >
                    <Globe className="h-5 w-5" />
                    <span>Globale waarden</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings */}
        <SidebarGroup className="mt-6">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/instellingen"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                  >
                    <Settings className="h-5 w-5" />
                    <span>Instellingen</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex flex-col gap-3">
          {/* User row with kebab menu */}
          {user && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-full bg-sidebar-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-sidebar-primary">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-sidebar-muted truncate">
                  {user.email}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-1.5 rounded-md text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors shrink-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" className="w-48">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <ThemeIcon className="mr-2 h-4 w-4" />
                      Thema
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => setTheme("light")}>
                        <Sun className="mr-2 h-4 w-4" />
                        Licht
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("dark")}>
                        <Moon className="mr-2 h-4 w-4" />
                        Donker
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("system")}>
                        <Monitor className="mr-2 h-4 w-4" />
                        Systeem
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Uitloggen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
