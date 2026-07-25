import { getDashboardDestination, requireUser } from "@/lib/auth";
import { getCommunityGroups, getCommunityTopicsByGroupSlug } from "@/lib/data";
import type { ReactNode } from "react";

import CommunityShell from "./community-shell";

export default async function CommunityLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const user = await requireUser();
  const groups = await getCommunityGroups();
  const groupsWithTopics = await Promise.all(
    groups.map(async (group) => {
      const { topics } = await getCommunityTopicsByGroupSlug(group.slug);

      return {
        ...group,
        topics,
      };
    })
  );

  return (
    <CommunityShell dashboardHref={getDashboardDestination(user)} groups={groupsWithTopics}>
      {children}
    </CommunityShell>
  );
}
