import type { KayIconComponent } from "@/components/icons";
import {
  AddIcon, ArchiveIcon, BackIcon, CalendarIcon, ChevronDownIcon, CloseIcon,
  ColumnsIcon, CompareIcon, CompletedIcon, ContactIcon, ContactsIcon, DealIcon,
  DeleteIcon, DownloadIcon, EditIcon, EmptyFolderIcon, EnquiryIcon, FinanceIcon,
  FilterIcon, ForwardIcon, HidePasswordIcon, PasswordIcon, PropertyIcon,
  RefreshIcon, RestoreIcon, SearchIcon, SettingsIcon, ShowPasswordIcon,
  SignOutIcon, TaskIcon, UploadIcon,
} from "@/components/icons";

export type ActionDefinition = {
  icon: KayIconComponent;
  tone: "neutral" | "info" | "warning" | "success" | "danger" | "teal" | "purple";
  variant: "outline" | "creation" | "success" | "destructive";
  iconClassName?: string;
};

export const buttonActions = {
  create: { icon: AddIcon, tone: "warning", variant: "creation" },
  add: { icon: AddIcon, tone: "warning", variant: "outline" },
  save: { icon: CompletedIcon, tone: "success", variant: "success" },
  confirm: { icon: CompletedIcon, tone: "success", variant: "success" },
  complete: { icon: CompletedIcon, tone: "success", variant: "success" },
  edit: { icon: EditIcon, tone: "info", variant: "outline" },
  remove: { icon: DeleteIcon, tone: "danger", variant: "outline" },
  archive: { icon: ArchiveIcon, tone: "danger", variant: "destructive" },
  cancelRecord: { icon: CloseIcon, tone: "danger", variant: "destructive" },
  restore: { icon: RestoreIcon, tone: "success", variant: "outline" },
  back: { icon: BackIcon, tone: "neutral", variant: "outline" },
  forward: { icon: ForwardIcon, tone: "neutral", variant: "outline" },
  up: { icon: ChevronDownIcon, tone: "neutral", variant: "outline", iconClassName: "rotate-180" },
  down: { icon: ChevronDownIcon, tone: "neutral", variant: "outline" },
  close: { icon: CloseIcon, tone: "neutral", variant: "outline" },
  cancel: { icon: CloseIcon, tone: "neutral", variant: "outline" },
  search: { icon: SearchIcon, tone: "info", variant: "outline" },
  filter: { icon: FilterIcon, tone: "warning", variant: "outline" },
  reset: { icon: RestoreIcon, tone: "neutral", variant: "outline" },
  refresh: { icon: RefreshIcon, tone: "info", variant: "outline" },
  retry: { icon: RefreshIcon, tone: "info", variant: "outline" },
  compare: { icon: CompareIcon, tone: "purple", variant: "outline" },
  select: { icon: CompletedIcon, tone: "success", variant: "outline" },
  assign: { icon: ContactsIcon, tone: "purple", variant: "outline" },
  release: { icon: RestoreIcon, tone: "warning", variant: "outline" },
  reserve: { icon: CalendarIcon, tone: "warning", variant: "creation" },
  outcome: { icon: DealIcon, tone: "warning", variant: "outline" },
  export: { icon: DownloadIcon, tone: "teal", variant: "outline" },
  download: { icon: DownloadIcon, tone: "teal", variant: "outline" },
  upload: { icon: UploadIcon, tone: "teal", variant: "outline" },
  file: { icon: EmptyFolderIcon, tone: "teal", variant: "outline" },
  columns: { icon: ColumnsIcon, tone: "purple", variant: "outline" },
  preview: { icon: ShowPasswordIcon, tone: "info", variant: "outline" },
  signout: { icon: SignOutIcon, tone: "danger", variant: "outline" },
  password: { icon: PasswordIcon, tone: "purple", variant: "outline" },
  show: { icon: ShowPasswordIcon, tone: "info", variant: "outline" },
  hide: { icon: HidePasswordIcon, tone: "info", variant: "outline" },
  settings: { icon: SettingsIcon, tone: "neutral", variant: "outline" },
  contact: { icon: ContactIcon, tone: "info", variant: "outline" },
  enquiry: { icon: EnquiryIcon, tone: "purple", variant: "outline" },
  task: { icon: TaskIcon, tone: "info", variant: "outline" },
  deal: { icon: DealIcon, tone: "warning", variant: "outline" },
  inventory: { icon: PropertyIcon, tone: "teal", variant: "outline" },
  visit: { icon: CalendarIcon, tone: "purple", variant: "outline" },
  finance: { icon: FinanceIcon, tone: "teal", variant: "outline" },
  read: { icon: CompletedIcon, tone: "teal", variant: "outline" },
} as const satisfies Record<string, ActionDefinition>;

export type ButtonAction = keyof typeof buttonActions;

export const actionIconColors: Record<ActionDefinition["tone"], string> = {
  neutral: "text-muted-foreground", info: "text-info", warning: "text-warning",
  success: "text-success", danger: "text-danger", teal: "text-teal", purple: "text-purple",
};
