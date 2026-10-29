import {
  Bus,
  UtensilsCrossed,
  Coffee,
  BookOpen,
  ShoppingBag,
  Lightbulb,
  HeartPulse,
  Clapperboard,
  Package,
  Briefcase,
  Home,
  Laptop,
  GraduationCap,
  Coins,
  type LucideIcon,
} from "lucide-react";

export type TxType = "income" | "expense";

export interface CategoryDef {
  name: string;
  icon: LucideIcon;
  color: string; // hex for charts
  bg: string; // tailwind class for icon chip background
  fg: string; // tailwind class for icon color
  type: TxType;
}

export const EXPENSE_CATEGORIES: CategoryDef[] = [
  { name: "Food", icon: UtensilsCrossed, color: "#f97316", bg: "bg-orange-100 dark:bg-orange-950", fg: "text-orange-600 dark:text-orange-400", type: "expense" },
  { name: "Transport", icon: Bus, color: "#14b8a6", bg: "bg-teal-100 dark:bg-teal-950", fg: "text-teal-600 dark:text-teal-400", type: "expense" },
  { name: "Refreshment", icon: Coffee, color: "#eab308", bg: "bg-yellow-100 dark:bg-yellow-950", fg: "text-yellow-600 dark:text-yellow-400", type: "expense" },
  { name: "Academic", icon: BookOpen, color: "#8b5cf6", bg: "bg-violet-100 dark:bg-violet-950", fg: "text-violet-600 dark:text-violet-400", type: "expense" },
  { name: "Shopping", icon: ShoppingBag, color: "#ec4899", bg: "bg-pink-100 dark:bg-pink-950", fg: "text-pink-600 dark:text-pink-400", type: "expense" },
  { name: "Bills", icon: Lightbulb, color: "#ef4444", bg: "bg-red-100 dark:bg-red-950", fg: "text-red-600 dark:text-red-400", type: "expense" },
  { name: "Health", icon: HeartPulse, color: "#22c55e", bg: "bg-green-100 dark:bg-green-950", fg: "text-green-600 dark:text-green-400", type: "expense" },
  { name: "Entertainment", icon: Clapperboard, color: "#06b6d4", bg: "bg-cyan-100 dark:bg-cyan-950", fg: "text-cyan-600 dark:text-cyan-400", type: "expense" },
  { name: "Other", icon: Package, color: "#78716c", bg: "bg-stone-100 dark:bg-stone-900", fg: "text-stone-600 dark:text-stone-400", type: "expense" },
];

export const INCOME_CATEGORIES: CategoryDef[] = [
  { name: "Salary", icon: Briefcase, color: "#10b981", bg: "bg-emerald-100 dark:bg-emerald-950", fg: "text-emerald-600 dark:text-emerald-400", type: "income" },
  { name: "Pocket Money", icon: Home, color: "#84cc16", bg: "bg-lime-100 dark:bg-lime-950", fg: "text-lime-600 dark:text-lime-400", type: "income" },
  { name: "Part-time", icon: Laptop, color: "#a3e635", bg: "bg-lime-100 dark:bg-lime-950", fg: "text-lime-700 dark:text-lime-300", type: "income" },
  { name: "Scholarship", icon: GraduationCap, color: "#2dd4bf", bg: "bg-teal-100 dark:bg-teal-950", fg: "text-teal-600 dark:text-teal-400", type: "income" },
  { name: "Other Income", icon: Coins, color: "#34d399", bg: "bg-emerald-100 dark:bg-emerald-950", fg: "text-emerald-600 dark:text-emerald-300", type: "income" },
];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export function getCategory(name: string): CategoryDef {
  return (
    ALL_CATEGORIES.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? {
      name,
      icon: Package,
      color: "#78716c",
      bg: "bg-stone-100 dark:bg-stone-900",
      fg: "text-stone-600 dark:text-stone-400",
      type: "expense",
    }
  );
}

export const EXPENSE_CATEGORY_NAMES = EXPENSE_CATEGORIES.map((c) => c.name);
export const INCOME_CATEGORY_NAMES = INCOME_CATEGORIES.map((c) => c.name);

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI / GPay / PhonePe" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank Transfer" },
];

/** Format amount as Indian Rupees, e.g. ₹1,234 */
export function formatINR(amount: number, opts?: { decimals?: boolean }): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: opts?.decimals ? 2 : 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDayLabel(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
