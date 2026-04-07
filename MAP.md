# MAP — Aetheric Studio: System Architecture & Flow Reference
Last updated: 2026-04-08

This file describes how the site's hierarchy, permissions, and member flows actually work.
Keep it updated whenever the permission model, DB schema, or user flows change.

---

## 1. The Two Parallel Hierarchies

The system has **two independent hierarchy systems** that can overlap on a single person:

### A. Org Hierarchy (OrgMember / OrgRole)
This is the org-chart title — who holds what position in the society overall.
Managed on `/members`. One person, one role.

```
Executive
  ├── President          — Strategic vision, external representation
  ├── Vice President     — Internal operations, department synergy
  └── Secretary          — Documentation, membership records

Department Head
  ├── Head of Logistics  — Venue & technical execution
  ├── Head of Finance    — Budgeting & sponsorships
  ├── Head of Marketing  — Branding & public relations
  └── Head of Creatives  — Design & event aesthetics

Core Member
  └── Project Lead       — Managing specific event segments

Member
  └── Associate          — Execution of assigned tasks

General
  └── Volunteer          — Day-of-event assistance
```

**Where it lives:** `OrgMember` table. Each entry links optionally to a `User` (if signed in) via `userId`.

---

### B. Department Hierarchy (Department / DepartmentMember)
This is the structural tree of sub-organisations (e.g. Tech → Frontend, Tech → Backend).
Managed on `/departments`. A person can belong to multiple departments with different roles.

```
Root Dept (hub icon)
  └── Child Dept A (account_tree icon)
        └── Grandchild Dept A1
  └── Child Dept B
```

Each person in a department gets two attributes:
- **Role** — their function within the dept
- **Clearance** — their system-level power

#### Roles (what you do)
| Role     | Meaning                      |
|----------|------------------------------|
| HEAD     | Leads the department         |
| LEAD     | Second-in-command            |
| MEMBER   | Standard participant         |
| OBSERVER | View-only, no actions        |

#### Clearance (what you can access system-wide)
| Clearance | Symbol | Meaning                         |
|-----------|--------|---------------------------------|
| OMEGA     | Ω      | Full system access              |
| ALPHA     | α      | Department admin                |
| BETA      | β      | Creator — submit proposals      |
| GAMMA     | γ      | Contributor — view, comment     |
| DELTA     | δ      | Read-only                       |

---

## 2. Permission Model (Departments Page)

Computed fresh on every page load in `page.tsx` from the current user's session.

### Who can edit what

| Condition | Access granted |
|-----------|---------------|
| Any membership with clearance `OMEGA` or `ALPHA` | **ALL** departments (full admin) |
| `HEAD` or `LEAD` role in dept X | dept X + **all descendants** of X |
| `MEMBER` or `OBSERVER` anywhere | Read-only — no edit UI rendered |
| Not signed in or no memberships | Read-only |

### What "edit access" unlocks per department card
- ✓ **+ Add / Invite Member** button (opens AddMemberPanel)
- ✓ **× Remove** button on each member row (hover to reveal)
- ✓ **× Revoke** button on each pending invite row
- ✓ **Delete node** button at card footer (non-root depts only)

### What is always visible (read-only)
- Copy invite link button on pending invites
- Member list, invite list, stats, tree map

### Top-level actions (gated on `hasAnyAccess`)
- **+ New Department** button — only shown if user manages at least one dept

---

## 3. Adding a Member — Two Paths

### Path A: Add to Organisation (Members page `/members`)
Assigns an org-level title to a person. Separate from departments.

```
Admin clicks "Add Member" on /members
  ├── Tab: "Existing User"
  │     Search by name/email → API: GET /api/users/search?q=
  │     Select user → choose OrgRole → submit
  │     → Server action: addOrgMember()
  │     → Creates OrgMember { userId, name, email, orgRole }
  │     → Person's card now shows org role badge
  │
  └── Tab: "New Contact"
        Enter name + email manually → choose OrgRole → submit
        → Server action: addOrgMember()
        → Creates OrgMember { userId: null, name, email, orgRole }
        → Appears in directory without a linked account (no avatar, no projects)
        → If they later sign in, their OrgMember entry stays unlinked
          (manual linking not yet implemented)
```

### Path B: Add to Department (Departments page `/departments`)
Assigns a person to a specific department node with a role and clearance.

#### Sub-path B1: Existing signed-in user
```
Admin opens dept card → "Add / Invite Member" → tab "Add Existing User"
  Search by name/email → API: GET /api/users/search?q=
  Select user → choose Role + Clearance → submit
  → Server action: addExistingUser(departmentId, formData)
  → Checks for duplicate (already in this dept)
  → If adding as HEAD and another HEAD exists → demotes old HEAD to LEAD
  → Creates DepartmentMember { userId, name, email, role, clearance }
  → Member row shows verified (✓) badge
```

#### Sub-path B2: Invite by link (for people not yet signed in)
```
Admin opens dept card → "Add / Invite Member" → tab "Invite by Link"
  Enter email (+ optional name)
  Choose Dept Role + Clearance
  Optionally choose Org Role (see rank rule below)
  → "Generate Link"
  → Server action: createInviteLink(departmentId, formData)
      Server-side rank check: if orgRole is set, verify the inviter's own OrgMember rank
      allows that assignment (target rank must be >= inviter's rank index)
  → Creates DepartmentInvite { token, email, name, role, clearance, orgRole?, expiresAt (+7 days) }
  → Returns shareable URL: /invite?token=<cuid>
  Admin copies and forwards the link manually

Recipient flow:
  Opens /invite?token=<token>
  → API: GET /api/invite/<token> validates token (expired? used? not found?)
  → Shows branded card: dept name, role, clearance, expiry
  → Clicks "Accept & Sign In" → OAuth provider
  → On return, middleware detects /invite?token= for authenticated user
    → redirects to /invite/redeem?token=
  → /invite/redeem (server component):
    → Validates token again
    → Looks up User by session email
    → Creates DepartmentMember { userId, name, role, clearance }
    → If invite.orgRole is set AND user has no existing OrgMember:
        Creates OrgMember { userId, name, email, orgRole }
    → Marks DepartmentInvite.usedAt = now()
    → Redirects to /departments
```

#### Org role rank rule (invite assignment)
The org role selector only appears in the invite form if the inviter has their own OrgMember entry.
Available options are filtered to the inviter's own role and lower (by index in ORG_ROLE_ORDER).

| Inviter's role | Can assign |
|----------------|-----------|
| President (idx 0) | All 10 roles |
| Vice President (idx 1) | VP, Secretary, all Dept Heads, Project Lead, Associate, Volunteer |
| Head of Finance (idx 4) | Head of Marketing, Head of Creatives, Project Lead, Associate, Volunteer |
| Associate (idx 8) | Associate, Volunteer |

Server-side enforcement: `createInviteLink` in `actions.ts` re-checks this via `auth()` even if
the client sends a manipulated form. Returns `{ error }` if the target rank is higher than the inviter's.

---

## 4. Removing a Member

```
Admin hovers over a member row on a dept card they can edit
  → × button appears
  → Click → startTransition → removeMember(memberId)
  → Server action: prisma.departmentMember.delete({ where: { id } })
  → revalidatePath("/departments")
  → Card re-renders without that member
```

Removing a DepartmentMember does NOT:
- Delete the User account
- Remove their OrgMember entry
- Affect their membership in other departments

---

## 5. Revoking an Invite

```
Admin clicks a pending invite badge on a dept card → invite section expands
  → Hover invite row → × revoke button appears (only if canEdit)
  → Click → revokeInvite(inviteId)
  → Server action: prisma.departmentInvite.delete({ where: { id } })
  → revalidatePath("/departments")
  → Invite row disappears
```

If the invite link was already shared, it will now return "not found" when opened.

---

## 6. Auth & User Creation Flow

```
New visitor hits any protected route
  → middleware.ts detects no session
  → redirects to /register

/register page shows OAuth buttons (Google, GitHub, LinkedIn)
  → User clicks → OAuth provider → callback → NextAuth
  → @auth/prisma-adapter auto-creates:
       User { id, name, email, image, emailVerified }
       Account { provider, providerAccountId, ... }
  → Session established (JWT strategy, userId stored in token.sub)
  → Redirected to / (dashboard)

On subsequent visits:
  → middleware reads JWT session (edge-safe, no Prisma)
  → Validated user passes through
```

**Important:** A `User` record is only created when someone signs in via OAuth.
Manual `OrgMember` entries with `userId: null` represent people added by name/email
who have NOT yet signed in.

---

## 7. Data Model Summary

> For the complete column-level reference including all FK behaviours and cascade rules, see **DB.md**.

```
User
  ├── id, name, email, image
  ├── bio, specialty               (editable profile fields)
  ├── accounts[]                   → Account[] (OAuth provider links)
  ├── memberships[]                → DepartmentMember[]
  ├── authoredProposals[]          → ProposalAuthor[]
  ├── proposalVersions[]           → ProposalVersion[] (edits made to proposals)
  └── orgMembership                → OrgMember? (one org title, optional)

OrgMember                          (org-chart title — one per person)
  ├── userId?                      → User (optional; null = manual contact)
  ├── name, email, orgRole
  └── joinedAt

Department                         (self-referencing tree node)
  ├── parentId?                    → Department (null = root)
  ├── children[]                   → Department[]
  ├── members[]                    → DepartmentMember[]
  ├── invites[]                    → DepartmentInvite[]
  └── approvalChains[]             → ProposalApprovalChain[]

DepartmentMember                   (person ↔ dept link)
  ├── departmentId                 → Department (CASCADE)
  ├── userId?                      → User (SetNull)
  ├── name, email, role, clearance
  └── joinedAt

DepartmentInvite                   (pending invite token)
  ├── token                        (unique cuid — share URL)
  ├── departmentId                 → Department (CASCADE)
  ├── email, name, role, clearance, orgRole?
  ├── expiresAt
  └── usedAt?                      (null = valid, set = consumed)

Proposal
  ├── type, status, title, description
  ├── dateEst, budget, location
  ├── imageGradient, coverImageUrl
  ├── metadata, flowState          (JSONB — flexible data)
  ├── authors[]                    → ProposalAuthor[]
  ├── tags[]                       → ProposalTag[]
  ├── approvalChains[]             → ProposalApprovalChain[]
  └── versions[]                   → ProposalVersion[]

ProposalAuthor
  ├── proposalId                   → Proposal (CASCADE)
  ├── userId?                      → User (SetNull)
  ├── name, role, initial, iconName
  └── isPrimary

ProposalTag
  ├── proposalId                   → Proposal (CASCADE)
  └── label

ProposalApprovalChain              (one per proposal × department)
  ├── proposalId                   → Proposal (CASCADE)
  ├── departmentId                 → Department
  ├── currentStep, status
  ├── steps                        (JSON — ChainStep[]: role, members, approvals, status)
  └── transferredFrom?             (departmentId of the chain that triggered this transfer)

ProposalVersion                    (full snapshot before each mutation)
  ├── proposalId                   → Proposal (CASCADE)
  ├── versionNumber                (auto-incrementing per proposal)
  ├── title, description, type, budget, dateEst, location
  ├── metadata, coverImageUrl, imageGradient
  ├── editorId?                    → User (SetNull)
  ├── editorName                   (denormalized — survives user deletion)
  └── createdAt
```

---

## 8. Key Invariants & Edge Cases

- A `User` can only have **one** `OrgMember` entry (`userId @unique` on OrgMember)
- A `User` can belong to **many** departments simultaneously
- Only **one HEAD** per department is enforced in `addExistingUser` — adding a new HEAD demotes the existing HEAD to LEAD
- Invite tokens expire after **7 days** and are single-use (`usedAt` set on redemption)
- Deleting a `Department` cascades to its `DepartmentMember` and `DepartmentInvite` rows
- Removing a `User` sets `userId = null` on their `DepartmentMember` and `OrgMember` rows (SetNull), preserving records
- The `/members` page shows: all signed-in `User` records + any `OrgMember` where `userId = null` (manual contacts)
- Org role assignment via invite is **rank-constrained**: inviter can only assign roles ≤ their own rank. Validated both in UI (filtered select) and server-side in `createInviteLink`
- Redemption creates OrgMember only if the invite carried an `orgRole` AND the user doesn't already have one — existing org memberships are never overwritten by an invite
- Permission checks are **server-side only** — computed in `page.tsx`, never trusted from the client

---

## 9. File Locations (key files)

| Concern | File |
|---------|------|
| DB schema | `prisma/schema.prisma` |
| DB full reference | `DB.md` |
| Auth config (edge-safe) | `auth.config.ts` |
| Auth full (with adapter + dev provider) | `auth.ts` |
| Route protection | `middleware.ts` |
| Prisma client singleton | `lib/prisma.ts` |
| User search API | `app/api/users/search/route.ts` |
| Invite details API | `app/api/invite/[token]/route.ts` |
| Departments page + permissions | `app/(studio)/departments/page.tsx` |
| Departments UI + RBAC gating | `app/(studio)/departments/DepartmentsClient.tsx` |
| Departments server actions | `app/(studio)/departments/actions.ts` |
| Members page | `app/(studio)/members/page.tsx` |
| Members UI | `app/(studio)/members/MembersClient.tsx` |
| Members server actions | `app/(studio)/members/actions.ts` |
| Proposals list page | `app/(studio)/proposals/page.tsx` |
| Proposals list UI | `app/(studio)/proposals/ProposalsClient.tsx` |
| Proposal detail page | `app/(studio)/proposals/[id]/page.tsx` |
| Proposal detail UI | `app/(studio)/proposals/[id]/ProposalDetailClient.tsx` |
| Proposal server actions | `app/(studio)/proposals/[id]/actions.ts` |
| Invite landing page | `app/(auth)/invite/page.tsx` |
| Invite redemption | `app/(auth)/invite/redeem/page.tsx` |
| Dev account switcher | `app/dev/page.tsx` + `app/dev/DevSwitcher.tsx` |
