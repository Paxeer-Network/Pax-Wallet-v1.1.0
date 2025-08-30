import { Button } from "@/components/ui/button";
import { PieChart, History, Globe, Settings, Gift } from "lucide-react";

export type TabType = "portfolio" | "transactions" | "browser" | "rewards" | "settings";

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    { id: "portfolio" as TabType, label: "Portfolio", icon: PieChart },
    { id: "transactions" as TabType, label: "History", icon: History },
    { id: "browser" as TabType, label: "Browser", icon: Globe },
    { id: "rewards" as TabType, label: "Rewards", icon: Gift },
    { id: "settings" as TabType, label: "Settings", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full bg-black border-t border-white/20 safe-area-pb z-50">
      <div className="grid grid-cols-5 py-3 px-2 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              variant="ghost"
              className={`flex flex-col items-center py-2 px-2 h-auto space-y-1 min-h-[60px] ${
                isActive ? "text-primary" : "text-white/60"
              } hover:text-primary transition-colors`}
              onClick={() => onTabChange(tab.id)}
              data-testid={`tab-${tab.id}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium truncate max-w-[50px]">{tab.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
