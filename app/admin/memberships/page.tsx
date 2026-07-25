import { requireAdmin } from "@/lib/auth";
import { getMembershipPlans } from "@/lib/data";
import MembershipManager from "@/app/admin/memberships/MembershipManager";

export default async function AdminMembershipsPage() {
  await requireAdmin();
  const plans = await getMembershipPlans({ includeInactive: true });

  return (
    <main className="mx-auto w-full max-w-5xl px-2 py-8 lg:px-8">
      <MembershipManager plans={plans} />
    </main>
  );
}
