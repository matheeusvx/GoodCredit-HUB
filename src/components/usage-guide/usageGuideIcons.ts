import {
  BadgeDollarSign,
  BarChart3,
  CheckSquare,
  CircleHelp,
  FileClock,
  Home,
  Landmark,
  PiggyBank,
  WalletCards
} from "lucide-react";
import type { UsageGuideIcon } from "../../types/usageGuide";

export const usageGuideIcons = {
  home: Home,
  amortization: BarChart3,
  simulation: WalletCards,
  "pro-soluto": BadgeDollarSign,
  registration: Landmark,
  income: FileClock,
  checklist: CheckSquare,
  fgts: PiggyBank,
  faq: CircleHelp
} satisfies Record<UsageGuideIcon, typeof Home>;
