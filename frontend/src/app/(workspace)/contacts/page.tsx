import { AuthUnavailable } from "@/features/auth/auth-frame";
import { ContactDirectory } from "@/features/contacts/contact-directory";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Contacts" };
export default async function ContactsPage() {
  const identity = await requireIdentity("/contacts");
  if (identity.state !== "authenticated") return <AuthUnavailable path="/contacts" />;
  return <ContactDirectory role={identity.profile.user.role} />;
}
