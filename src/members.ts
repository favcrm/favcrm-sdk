import type { ApiMember, Member } from './types/member.js';

/** Map v6 API member response to the normalized Member shape. */
export function mapApiMember(api: ApiMember): Member {
  return {
    uuid: api.uuid,
    name: api.name ?? "",
    email: api.email ?? null,
    phone: api.phone ?? "",
    avatarUrl: null,
    membershipTier: api.membershipTier
      ? {
          id: String(api.membershipTier.id),
          name: api.membershipTier.name,
          level: api.membershipTier.priority ?? 0,
          color: "",
          benefits: [],
        }
      : null,
  };
}
