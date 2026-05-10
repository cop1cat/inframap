import type { CallType, InfraJson } from "../types";

export interface BrokenLink {
  from: string;
  to: string;
}

export interface OwnerCount {
  owner: string;
  count: number;
}

export interface GroupCount {
  group: string;
  label: string;
  count: number;
}

export interface Stats {
  totalServices: number;
  totalGroups: number;
  totalCalls: number;
  byCallType: Record<CallType, number>;
  brokenLinks: BrokenLink[];
  withoutOwner: string[];
  withoutDescription: string[];
  topOwners: OwnerCount[];
  groupSizes: GroupCount[];
}

export function computeStats(infra: InfraJson): Stats {
  const byCallType: Record<CallType, number> = {
    sync: 0,
    async: 0,
    event: 0,
    unknown: 0,
  };
  const brokenLinks: BrokenLink[] = [];
  const withoutOwner: string[] = [];
  const withoutDescription: string[] = [];
  const ownerCounts = new Map<string, number>();
  const groupCounts = new Map<string, number>();
  let totalCalls = 0;

  for (const s of infra.services) {
    if (!s.owner) withoutOwner.push(s.id);
    if (!s.description) withoutDescription.push(s.id);
    if (s.owner) ownerCounts.set(s.owner, (ownerCounts.get(s.owner) ?? 0) + 1);
    if (s.group) groupCounts.set(s.group, (groupCounts.get(s.group) ?? 0) + 1);
    for (const c of s.calls) {
      byCallType[c.type]++;
      totalCalls++;
      if (c.broken) brokenLinks.push({ from: s.id, to: c.id });
    }
  }

  const groupLabels = new Map(infra.groups.map((g) => [g.id, g.label]));
  const groupSizes: GroupCount[] = [...groupCounts.entries()]
    .map(([group, count]) => ({ group, label: groupLabels.get(group) ?? group, count }))
    .sort((a, b) => b.count - a.count);

  const topOwners: OwnerCount[] = [...ownerCounts.entries()]
    .map(([owner, count]) => ({ owner, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalServices: infra.services.length,
    totalGroups: infra.groups.length,
    totalCalls,
    byCallType,
    brokenLinks,
    withoutOwner,
    withoutDescription,
    topOwners,
    groupSizes,
  };
}
