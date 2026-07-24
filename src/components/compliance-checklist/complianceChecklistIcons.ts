import {
  ClipboardList,
  ContactRound,
  FileCheck2,
  FileClock,
  FileSearch,
  HeartHandshake,
  Landmark,
  MapPinned,
  MonitorCheck,
  MonitorCog,
  ReceiptText,
  RefreshCw,
  SearchCheck,
  TrendingDown,
  WalletCards
} from "lucide-react";
import { ComplianceChecklistIconName } from "../../types/complianceChecklist";

export const COMPLIANCE_CHECKLIST_ICONS = {
  FileClock,
  RefreshCw,
  FileSearch,
  Landmark,
  FileCheck2,
  ReceiptText,
  MapPinned,
  ContactRound,
  WalletCards,
  HeartHandshake,
  MonitorCheck,
  ClipboardList,
  SearchCheck,
  TrendingDown,
  MonitorCog
} satisfies Record<ComplianceChecklistIconName, typeof FileClock>;
