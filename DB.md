# DB — Database Reference
Last updated: 2026-04-08

Complete reference for every table, column, enum, and foreign-key relationship in the Aetheric Studio PostgreSQL database. Managed via Prisma (`prisma/schema.prisma`) and kept in sync with `npx prisma db push`.

---

## Enums

### `ProposalType`
The category of a proposal.

| Value | Meaning |
|---|---|
| `EVENT` | Public-facing event |
| `SUMMIT` | Conference / intensive |
| `EXHIBITION` | Gallery or display show |
| `WEDDING` | Private ceremony |
| `PERFORMANCE` | Live performance |
| `INTERNAL` | Internal org project |

---

### `ProposalStatus`
Lifecycle state of a proposal.

| Value | Meaning |
|---|---|
| `DRAFT` | Created / in edit / under approval chain review |
| `APPROVED` | All approval chains cleared |
| `FLAGGED` | A reviewer flagged it — needs attention |
| `REJECTED` | Rejected by a reviewer |
| `ACTIVE` | Proposal activated as a live event |

---

### `MemberRole`
A person's functional role within a single department.

| Value | Meaning |
|---|---|
| `HEAD` | Leads the department; can transfer proposals |
| `LEAD` | Second-in-command |
| `MEMBER` | Standard participant |
| `OBSERVER` | View-only, cannot act in approval chains |

---

### `Clearance`
System-level access power, independent of department role.

| Value | Meaning |
|---|---|
| `OMEGA` | Full system access |
| `ALPHA` | Department admin — approve proposals, manage members |
| `BETA` | Creator — can submit proposals |
| `GAMMA` | Contributor — view, comment, vote |
| `DELTA` | Read-only |

---

### `DepartmentProtocol`
Governs how a department behaves in proposal routing.

| Value | Meaning |
|---|---|
| `STANDARD` | Normal routing |
| `RESTRICTED` | Reserved for future access-gating |

---

### `OrgRole`
Org-chart title — one per person, independent of department membership.

| Value | Level |
|---|---|
| `PRESIDENT` | Executive |
| `VICE_PRESIDENT` | Executive |
| `SECRETARY` | Executive |
| `HEAD_LOGISTICS` | Department Head |
| `HEAD_FINANCE` | Department Head |
| `HEAD_MARKETING` | Department Head |
| `HEAD_CREATIVES` | Department Head |
| `PROJECT_LEAD` | Core Member |
| `ASSOCIATE` | Member |
| `VOLUNTEER` | General |

---

### `ApprovalChainStatus`
State of a single department's approval chain on a proposal.

| Value | Meaning |
|---|---|
| `ACTIVE` | Chain is in progress — current step awaiting review |
| `APPROVED` | All steps in this chain have been approved |
| `REJECTED` | A step in this chain was rejected |

---

## Tables

---

### `User`
Created automatically by `@auth/prisma-adapter` when a person first signs in via OAuth. Can also be represented as an `OrgMember` entry with `userId = null` before they sign in.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | PK |
| `name` | `String?` | Display name from OAuth provider |
| `email` | `String` | Unique — used as identity key |
| `emailVerified` | `DateTime?` | Set by NextAuth on email verification |
| `image` | `String?` | Avatar URL from OAuth provider |
| `bio` | `String?` | User-editable profile bio |
| `specialty` | `String?` | User-editable specialty label |
| `createdAt` | `DateTime` | Auto-set on creation |
| `updatedAt` | `DateTime` | Auto-updated on any change |

**Relations (outgoing FKs defined on other tables pointing here):**
- `accounts[]` → `Account` (OAuth provider links)
- `memberships[]` → `DepartmentMember` (dept memberships)
- `authoredProposals[]` → `ProposalAuthor` (proposal authorship records)
- `proposalVersions[]` → `ProposalVersion` (edits made to proposals)
- `orgMembership` → `OrgMember?` (one org-chart title, optional)

---

### `Account`
One row per OAuth provider link for a user. Managed entirely by `@auth/prisma-adapter`.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | PK |
| `userId` | `String` | FK → `User.id` (CASCADE delete) |
| `type` | `String` | e.g. `"oauth"` |
| `provider` | `String` | e.g. `"google"`, `"github"` |
| `providerAccountId` | `String` | The user's ID at that provider |
| `refresh_token` | `String?` | OAuth refresh token |
| `access_token` | `String?` | OAuth access token |
| `expires_at` | `Int?` | Token expiry (epoch seconds) |
| `token_type` | `String?` | e.g. `"bearer"` |
| `scope` | `String?` | OAuth scopes granted |
| `id_token` | `String?` | OIDC id token |
| `session_state` | `String?` | Provider session state |

**Unique constraint:** `(provider, providerAccountId)` — one link per provider per user.

**FK behaviour:** Deleting a `User` cascades and deletes all their `Account` rows.

---

### `OrgMember`
Represents a person's position on the org chart. Only one entry per person (enforced by `userId @unique`).

| Column | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | PK |
| `userId` | `String?` | FK → `User.id` (SetNull on delete), unique |
| `user` | `User?` | Optional — null for manual contacts not yet signed in |
| `name` | `String` | Display name |
| `email` | `String?` | Contact email |
| `orgRole` | `OrgRole` | Default: `ASSOCIATE` |
| `joinedAt` | `DateTime` | Auto-set on creation |

**Note:** `userId` is `@unique` — one org title per signed-in person. A person added manually (`userId = null`) can have their entry later linked once they sign in (not yet automated).

---

### `Department`
A node in the org's department tree. Self-referencing to support arbitrary depth.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | PK |
| `name` | `String` | Department display name |
| `protocol` | `DepartmentProtocol` | Default: `STANDARD` |
| `parentId` | `String?` | FK → `Department.id` (self-reference) — null = root node |
| `createdAt` | `DateTime` | Auto-set |
| `updatedAt` | `DateTime` | Auto-updated |

**Self-referencing relations:**
- `parent` → `Department?` (the node above, via `parentId`)
- `children[]` → `Department[]` (nodes below, via `parentId` on children)

**Other relations:**
- `members[]` → `DepartmentMember[]`
- `invites[]` → `DepartmentInvite[]`
- `approvalChains[]` → `ProposalApprovalChain[]`

**FK behaviour:** Deleting a `Department` cascades to its `DepartmentMember` and `DepartmentInvite` rows.

---

### `DepartmentMember`
Junction record linking a person to a department with a role and clearance.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | PK |
| `departmentId` | `String` | FK → `Department.id` (CASCADE delete) |
| `userId` | `String?` | FK → `User.id` (SetNull on delete) — null for unlinked contacts |
| `name` | `String` | Display name — always present even if no User link |
| `email` | `String?` | Contact email |
| `role` | `MemberRole` | Default: `MEMBER` |
| `clearance` | `Clearance` | Default: `GAMMA` |
| `joinedAt` | `DateTime` | Auto-set |

**FK behaviour:**
- Deleting a `Department` cascades and deletes the member row.
- Deleting a `User` sets `userId = null` (SetNull) — the member record remains.

**Business rule:** Only one `HEAD` per department is enforced in `addExistingUser` — adding a new HEAD demotes the existing HEAD to LEAD.

---

### `DepartmentInvite`
A pending invite token for someone not yet in the department. Single-use, expires after 7 days.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | PK |
| `token` | `String` | Unique cuid — embedded in the shareable URL `/invite?token=` |
| `departmentId` | `String` | FK → `Department.id` (CASCADE delete) |
| `email` | `String` | Recipient's email |
| `name` | `String?` | Optional pre-fill for display name |
| `role` | `MemberRole` | Pre-assigned dept role, applied on redemption |
| `clearance` | `Clearance` | Pre-assigned clearance, applied on redemption |
| `orgRole` | `OrgRole?` | Optional org-chart title to assign on redemption |
| `expiresAt` | `DateTime` | 7 days from creation |
| `usedAt` | `DateTime?` | null = still valid; set = consumed (single-use) |
| `createdAt` | `DateTime` | Auto-set |

**FK behaviour:** Deleting a `Department` cascades and deletes its pending invites.

---

### `Proposal`
The core proposal record. Flexible via `metadata` and `flowState` JSONB columns.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | PK |
| `type` | `ProposalType` | Category of the proposal |
| `status` | `ProposalStatus` | Default: `DRAFT` |
| `title` | `String` | Proposal title |
| `description` | `String?` | Long-form brief |
| `imageGradient` | `String?` | CSS gradient string for cover fallback |
| `coverImageUrl` | `String?` | URL of the uploaded cover image |
| `dateEst` | `String?` | Human-readable estimated date e.g. `"May 2026"` |
| `budget` | `Int?` | Allocated budget in USD (integer cents or dollars depending on context) |
| `location` | `String?` | Primary venue / location |
| `metadata` | `Json?` | Flexible JSONB: `attachmentUrl`, `attachmentName`, `sourceAttachmentUrl`, `expectedAttendance`, `riskLevel`, `flagReason`, etc. |
| `flowState` | `Json?` | Reserved for future state-machine data |
| `createdAt` | `DateTime` | Auto-set |
| `updatedAt` | `DateTime` | Auto-updated |

**Relations:**
- `authors[]` → `ProposalAuthor[]`
- `tags[]` → `ProposalTag[]`
- `approvalChains[]` → `ProposalApprovalChain[]`
- `versions[]` → `ProposalVersion[]`

---

### `ProposalAuthor`
A named contributor on a proposal. Optionally linked to a `User` account.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | PK |
| `proposalId` | `String` | FK → `Proposal.id` (CASCADE delete) |
| `userId` | `String?` | FK → `User.id` (SetNull on delete) — optional |
| `name` | `String` | Display name |
| `role` | `String` | e.g. `"Lead Planner"`, `"Creative Director"` |
| `initial` | `String?` (max 2 chars) | Avatar initial fallback |
| `iconName` | `String?` | Material Symbol icon name for avatar |
| `isPrimary` | `Boolean` | Default: `false` — the lead author |

**FK behaviour:** Deleting a `Proposal` cascades and removes all its author records.

---

### `ProposalTag`
A keyword label attached to a proposal. Simple string, no global tag registry.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | PK |
| `proposalId` | `String` | FK → `Proposal.id` (CASCADE delete) |
| `label` | `String` | Tag text |

---

### `ProposalApprovalChain`
One chain per `(proposal × department)`. Tracks the step-by-step review progress for that department. Multiple chains can exist per proposal (parallel review after a HEAD transfer).

| Column | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | PK |
| `proposalId` | `String` | FK → `Proposal.id` (CASCADE delete) |
| `departmentId` | `String` | FK → `Department.id` |
| `currentStep` | `Int` | Default: `0` — index into `steps` array |
| `status` | `ApprovalChainStatus` | Default: `ACTIVE` |
| `steps` | `Json` | Array of `ChainStep` objects (see below) |
| `transferredFrom` | `String?` | `departmentId` of the chain whose HEAD triggered a transfer; null for the original chain |
| `createdAt` | `DateTime` | Auto-set |
| `updatedAt` | `DateTime` | Auto-updated |

**Unique constraint:** `(proposalId, departmentId)` — one chain per proposal per department.

**`ChainStep` shape (stored in `steps` JSON):**
```ts
{
  role: "MEMBER" | "LEAD" | "HEAD"
  label: string                       // e.g. "Department Head"
  members: {
    userId: string | null
    name: string
    initial: string
  }[]
  approvals: {
    userId: string
    name: string
    approvedAt: string                // ISO timestamp
  }[]
  status: "PENDING" | "ACTIVE" | "APPROVED" | "REJECTED" | "FLAGGED"
}
```

**How it works:**
1. `submitForReview` builds steps from the submitter's role upward (MEMBER → LEAD → HEAD), skipping tiers with no members.
2. Step 0 starts as `ACTIVE`; others start as `PENDING`.
3. `approveChainStep` records the approval, advances `currentStep`, marks chain `APPROVED` when the last step clears.
4. If all chains for the proposal are `APPROVED`, the proposal itself becomes `APPROVED`.
5. A Department HEAD in an `APPROVED` chain can call `transferToAdditionalDepartment` — creates a new HEAD-only chain for the target department, resetting the proposal to `DRAFT`.

---

### `ProposalVersion`
A full snapshot of a proposal's field values at a specific point in time. Created automatically before any mutation (PDF replace, field edit, version restore). Enables version history and cycling.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | PK |
| `proposalId` | `String` | FK → `Proposal.id` (CASCADE delete) |
| `versionNumber` | `Int` | Auto-incrementing per proposal — V1, V2, V3… |
| `title` | `String` | Snapshot of `Proposal.title` |
| `description` | `String?` | Snapshot of `Proposal.description` |
| `type` | `ProposalType` | Snapshot of `Proposal.type` |
| `budget` | `Int?` | Snapshot of `Proposal.budget` |
| `dateEst` | `String?` | Snapshot of `Proposal.dateEst` |
| `location` | `String?` | Snapshot of `Proposal.location` |
| `metadata` | `Json?` | Snapshot of `Proposal.metadata` (includes `attachmentUrl` at that time) |
| `coverImageUrl` | `String?` | Snapshot of `Proposal.coverImageUrl` |
| `imageGradient` | `String?` | Snapshot of `Proposal.imageGradient` |
| `editorId` | `String?` | FK → `User.id` (SetNull on delete) — who made the change |
| `editorName` | `String` | Denormalized name for permanent display even if user deleted |
| `createdAt` | `DateTime` | When this version was captured |

**Unique constraint:** `(proposalId, versionNumber)` — sequential per proposal.

**What triggers a new version:**
- `replaceAttachment` — reviewer uploads a new PDF
- `updateProposalDetails` — reviewer edits title, description, budget, dateEst, location, or type
- `restoreVersion` — restoring a past version (the current state is snapshotted first, making the restore itself reversible)

**FK behaviour:** Deleting a `Proposal` cascades and removes all its version records.

---

## Foreign Key Map

```
User ──────────────────────────────────────────────────────────────────────────┐
  │  id ◄── Account.userId (CASCADE)                                           │
  │  id ◄── OrgMember.userId (SetNull, @unique)                               │
  │  id ◄── DepartmentMember.userId (SetNull)                                 │
  │  id ◄── ProposalAuthor.userId (SetNull)                                   │
  │  id ◄── ProposalVersion.editorId (SetNull)                                │
  └──────────────────────────────────────────────────────────────────────────────

Department ───────────────────────────────────────────────────────────────────┐
  │  id ◄── Department.parentId (self-ref, no cascade — tree integrity)        │
  │  id ◄── DepartmentMember.departmentId (CASCADE)                           │
  │  id ◄── DepartmentInvite.departmentId (CASCADE)                           │
  │  id ◄── ProposalApprovalChain.departmentId                                │
  └──────────────────────────────────────────────────────────────────────────────

Proposal ─────────────────────────────────────────────────────────────────────┐
  │  id ◄── ProposalAuthor.proposalId (CASCADE)                               │
  │  id ◄── ProposalTag.proposalId (CASCADE)                                  │
  │  id ◄── ProposalApprovalChain.proposalId (CASCADE)                        │
  │  id ◄── ProposalVersion.proposalId (CASCADE)                              │
  └──────────────────────────────────────────────────────────────────────────────
```

---

## Cascade Summary

| Delete this | Cascades to |
|---|---|
| `User` | `Account` (deleted) · `DepartmentMember.userId` (→ null) · `OrgMember.userId` (→ null) · `ProposalAuthor.userId` (→ null) · `ProposalVersion.editorId` (→ null) |
| `Department` | `DepartmentMember` (deleted) · `DepartmentInvite` (deleted) |
| `Proposal` | `ProposalAuthor` (deleted) · `ProposalTag` (deleted) · `ProposalApprovalChain` (deleted) · `ProposalVersion` (deleted) |

---

## Key Constraints & Invariants

- A `User` can have at most **one** `OrgMember` entry (`userId @unique`)
- A `User` can belong to **many** departments (no unique on `DepartmentMember(userId, departmentId)` — but `addExistingUser` checks for duplicates in code)
- A proposal can have at most **one** `ProposalApprovalChain` per department (`@@unique([proposalId, departmentId])`)
- `ProposalVersion.versionNumber` is monotonically increasing per proposal — computed as `MAX(versionNumber) + 1` in `snapshotProposal()`
- `DepartmentInvite.token` is globally unique — safe to use as a URL parameter without enumeration risk
- Invite tokens are single-use: `usedAt` is set on redemption and checked before processing
- `ProposalVersion.editorName` is denormalized — stored at write time so history remains readable even if the `User` is later deleted
