/**
 * Budget category configuration.
 * Each category has a type (need/want), label, and default icon name.
 */

export type CategoryType = "need" | "want";

export interface BudgetCategory {
  id: string;
  label: string;
  type: CategoryType;
  defaultIcon: string;
}

export const BUDGET_CATEGORIES: BudgetCategory[] = [
  // Needs
  { id: "housing", label: "Housing / Rent", type: "need", defaultIcon: "Home" },
  { id: "transport", label: "Transport / Car", type: "need", defaultIcon: "Car" },
  { id: "food", label: "Food & Groceries", type: "need", defaultIcon: "ShoppingCart" },
  { id: "utilities", label: "Utilities", type: "need", defaultIcon: "Zap" },
  { id: "insurance", label: "Insurance", type: "need", defaultIcon: "Shield" },
  { id: "healthcare", label: "Healthcare", type: "need", defaultIcon: "HeartPulse" },
  { id: "loan", label: "Loan / Debt Repayment", type: "need", defaultIcon: "CreditCard" },
  { id: "childcare", label: "Childcare", type: "need", defaultIcon: "Baby" },
  { id: "clothing", label: "Clothing", type: "need", defaultIcon: "Shirt" },
  { id: "personal-care", label: "Personal Care", type: "need", defaultIcon: "Sparkles" },

  // Wants
  { id: "entertainment", label: "Entertainment", type: "want", defaultIcon: "Tv2" },
  { id: "dining", label: "Dining Out", type: "want", defaultIcon: "UtensilsCrossed" },
  { id: "subscriptions", label: "Subscriptions", type: "want", defaultIcon: "Monitor" },
  { id: "shopping", label: "Shopping", type: "want", defaultIcon: "ShoppingBag" },
  { id: "travel", label: "Travel / Holidays", type: "want", defaultIcon: "Plane" },
  { id: "hobbies", label: "Hobbies", type: "want", defaultIcon: "Gamepad2" },
  { id: "sports", label: "Sports & Fitness", type: "want", defaultIcon: "Dumbbell" },
  { id: "gaming", label: "Gaming", type: "want", defaultIcon: "Swords" },
  { id: "alcohol", label: "Alcohol & Nights Out", type: "want", defaultIcon: "Wine" },
  { id: "gifts", label: "Gifts", type: "want", defaultIcon: "Gift" },
  { id: "pets", label: "Pets", type: "want", defaultIcon: "PawPrint" },
  { id: "education", label: "Education & Courses", type: "want", defaultIcon: "GraduationCap" },
];

/**
 * All available icons for the icon picker.
 * Users can pick any icon from this list to customise their expense.
 * Each icon must be a valid Lucide React export.
 */
export const AVAILABLE_ICONS: string[] = [
  "Home", "Car", "ShoppingCart", "Zap", "Shield", "HeartPulse", "CreditCard",
  "Baby", "Shirt", "Sparkles", "Tv2", "UtensilsCrossed", "Monitor", "ShoppingBag",
  "Plane", "Gamepad2", "Dumbbell", "Swords", "Wine", "Gift", "PawPrint",
  "GraduationCap", "Wallet", "PiggyBank", "Banknote", "Landmark", "Receipt",
  "Utensils", "Coffee", "CupSoda", "Cake", "Apple", "Leaf", "TreePine",
  "Fuel", "Carrot", "CookingPot", "ShowerHead", "WashingMachine", "Thermometer",
  "Wifi", "Smartphone", "Laptop", "Printer", "Camera", "Music", "Headphones",
  "BookOpen", "Newspaper", "PenLine", "NotebookPen", "Briefcase", "User",
  "Users", "Heart", "Star", "Sun", "Moon", "Cloud", "Umbrella", "Glasses",
  "Watch", "Ear", "Mic", "Keyboard", "Mouse", "Speaker", "Tv", "Radio",
  "Disc", "Library", "Bus", "Train", "Bike", "Footprints", "ParkingMeter",
  "MapPin", "Compass", "Globe", "Luggage", "Ticket", "Sailboat", "Tent",
  "Building", "Factory", "Store", "ShoppingBasket", "Package", "Box",
  "BicepsFlexed", "PersonStanding", "Scale",
  "Currency", "Coins", "DollarSign", "PoundSterling", "Euro", "Bitcoin",
  "Gem", "Crown", "Trophy", "Medal", "Flame", "Wand", "Palette",
  "Brush", "Pencil", "Scissors", "Ruler", "Calculator", "FileText",
  "FolderOpen", "Archive", "Trash2", "Clipboard", "StickyNote", "Tag",
  "Bell", "AlertCircle", "Info", "HelpCircle", "MessageCircle", "Mail",
  "Phone", "Video", "Image", "ScanFace", "Fingerprint",
  "KeyRound", "Lock", "Unlock", "Eye", "EyeOff", "Search", "ZoomIn",
  "ZoomOut", "Filter", "SlidersHorizontal", "Settings", "Wrench", "Hammer",
  "Drill", "PaintBucket", "Shovel", "Bug", "Bone", "Tractor",
  "ChefHat", "GlassWater", "Beer", "Pill", "Syringe",
  "Bed", "Sofa", "Armchair", "DoorOpen", "PanelTop", "LayoutGrid",
  "SquareCode", "Terminal", "Cpu", "HardDrive", "Server", "Database",
  "CloudUpload", "CloudDownload", "Share2", "Link", "AtSign",
  "Hash", "List", "AlignLeft", "BarChart2", "Activity", "Target",
  "Crosshair", "Navigation", "ArrowUp", "ArrowDown", "ArrowLeft",
  "ArrowRight", "ChevronUp", "ChevronDown", "ChevronLeft", "ChevronRight",
  "Plus", "Minus", "Check", "X", "CheckCircle", "XCircle", "AlertTriangle",
  "Rocket", "Orbit", "Sunset", "Sunrise", "Waves", "Mountain",
  "Castle", "Church", "Warehouse", "Hospital", "School", "University",
  "Circle",
];

export function getCategoryById(id: string): BudgetCategory | undefined {
  return BUDGET_CATEGORIES.find((c) => c.id === id);
}

export function getDefaultIcon(categoryId: string): string {
  return getCategoryById(categoryId)?.defaultIcon ?? "Circle";
}
