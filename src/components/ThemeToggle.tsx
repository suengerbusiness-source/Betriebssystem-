import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/Button";
import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Theme wechseln">
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  );
}
