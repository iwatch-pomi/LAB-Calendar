import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CultureManager } from "@/components/CultureManager";

export default async function CulturePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <CultureManager userEmail={user.email ?? ""} />;
}
