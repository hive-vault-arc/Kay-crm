import type { ComponentType, SVGProps } from "react";
import { createElement } from "react";
import prototypeGlyphs from "../../../../branding/prototype/kay-glyphs.json";

// Selected prototype vectors; frozen source hashes/notices remain in the shared registry.
type SvgProps = Omit<SVGProps<SVGSVGElement>, "children" | "dangerouslySetInnerHTML" | "viewBox" | "width" | "height" | "role" | "aria-label" | "aria-hidden">;
export type KayIconProps = SvgProps & {
  size?: 12 | 16 | 20 | 24 | 32 | 48;
} & ({ label: string; "aria-hidden"?: never } | { label?: never; "aria-hidden"?: true | "true" });
export type KayIconComponent = ComponentType<KayIconProps>;

// Exact frozen prototype glyphs requested by the owner. These remain inside the
// typed semantic layer and are hash-checked by the inventory; no package import.
function createPrototypeIcon(name: string): KayIconComponent {
  const glyph = prototypeGlyphs.icons.find(icon => icon.name === name);
  if (!glyph) throw new Error(`Unknown selected glyph: ${name}`);
  const nodes = glyph.nodes as [string, Record<string, string>][];
  function PrototypeIcon({ size = 24, label, ...props }: KayIconProps) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" {...props} focusable="false" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} data-kay-icon={name} data-icon-family="lucide" data-icon-style="linear">{nodes.map(([tag, attributes], index) => createElement(tag, { ...attributes, key: index }))}</svg>;
  }
  PrototypeIcon.displayName = `KayPrototypeIcon(${name})`;
  return PrototypeIcon;
}
export const SunIcon = createPrototypeIcon("sun");
export const MoonIcon = createPrototypeIcon("moon");
export const MonitorIcon = createPrototypeIcon("monitor");

export const CarIcon = createPrototypeIcon("car");
export const ClockIcon = createPrototypeIcon("clock");
export const AlertIcon = createPrototypeIcon("alert");
export const EmptyFolderIcon = createPrototypeIcon("empty-folder");
export const CheckIcon = createPrototypeIcon("check");
export const ChevronDownIcon = createPrototypeIcon("chevron-down");
export const CloseIcon = createPrototypeIcon("close");
export const RadioIndicatorIcon = createPrototypeIcon("radio-indicator");
export const PasswordIcon = createPrototypeIcon("password");
export const SignInIcon = createPrototypeIcon("sign-in");
export const ShowPasswordIcon = createPrototypeIcon("show-password");
export const HidePasswordIcon = createPrototypeIcon("hide-password");
export const PhoneIcon = createPrototypeIcon("phone");
export const EmailIcon = createPrototypeIcon("email");
export const ContactIcon = createPrototypeIcon("contact");
export const TaskIcon = createPrototypeIcon("task");
export const EnquiryIcon = createPrototypeIcon("enquiry");
export const DealIcon = createPrototypeIcon("deal");
export const FinanceIcon = createPrototypeIcon("finance");
export const DevelopmentIcon = createPrototypeIcon("development");
export const PropertyIcon = createPrototypeIcon("property");
export const LocationIcon = createPrototypeIcon("location");
export const CompletedIcon = createPrototypeIcon("completed");
export const InboxIcon = createPrototypeIcon("inbox");
export const ContactsIcon = createPrototypeIcon("contacts");
export const NotificationIcon = createPrototypeIcon("notification");
export const NavigationMenuIcon = createPrototypeIcon("navigation-menu");
export const CalendarIcon = createPrototypeIcon("calendar");
export const DashboardIcon = createPrototypeIcon("dashboard");
export const SettingsIcon = createPrototypeIcon("settings");
export const SearchIcon = createPrototypeIcon("search");
export const AddIcon = createPrototypeIcon("add");
export const EditIcon = createPrototypeIcon("edit");
export const DeleteIcon = createPrototypeIcon("delete");
export const ArchiveIcon = createPrototypeIcon("archive");
export const BackIcon = createPrototypeIcon("back");
export const ForwardIcon = createPrototypeIcon("forward");
export const FilterIcon = createPrototypeIcon("filter");
export const ColumnsIcon = createPrototypeIcon("columns");
export const DownloadIcon = createPrototypeIcon("download");
export const UploadIcon = createPrototypeIcon("upload");
export const RefreshIcon = createPrototypeIcon("refresh");
export const SignOutIcon = createPrototypeIcon("sign-out");
export const RestoreIcon = createPrototypeIcon("restore");
export const CompareIcon = createPrototypeIcon("compare");
export const HelpIcon = createPrototypeIcon("help");
export const OwnerIcon = createPrototypeIcon("owner");

export const MoreIcon = createPrototypeIcon("more");

export const FileIcon = createPrototypeIcon("file");

export const BlockIcon = createPrototypeIcon("block");

export const FailureIcon = createPrototypeIcon("failure");

export const NewLeadIcon = createPrototypeIcon("new-lead");

export const QualifiedLeadIcon = createPrototypeIcon("qualified-lead");

export const RejectedLeadIcon = createPrototypeIcon("rejected-lead");

export const NegotiationIcon = createPrototypeIcon("negotiation");

export const FlagIcon = createPrototypeIcon("flag");

export const ListIcon = createPrototypeIcon("list");
export const KanbanIcon = createPrototypeIcon("kanban");
export const GripIcon = createPrototypeIcon("grip");
