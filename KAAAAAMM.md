# KAAAAAMM — Feature Tracker
Last updated: 2026-04-08

> For full system architecture, hierarchy rules, permission model, and member flows → see **MAP.md**
> For the complete database schema reference → see **DB.md**

---

## PAGES

| Route | File | Purpose |
|---|---|---|
| `/register` | `app/(auth)/register/page.tsx` | Sign-in / sign-up via OAuth (Google, GitHub, LinkedIn). Entry point for unauthenticated users. |
| `/invite` | `app/(auth)/invite/page.tsx` | Invite landing page. Reads `?token=` from URL, fetches real invite details (dept, role, clearance, expiry), shows a branded card, and prompts the recipient to sign in via OAuth to accept. Shows error states for expired/used/invalid tokens. |
| `/invite/redeem` | `app/(auth)/invite/redeem/page.tsx` | Server-side redemption step. Runs after OAuth completes. Validates the token, creates the `DepartmentMember` record with the pre-set role and clearance, marks the invite as used, then redirects to `/departments`. Never renders UI — purely transactional. |
| `/dev` | `app/dev/page.tsx` | Dev-only account switcher. Signs in as any seed member via the `dev-seed` Credentials provider. Hard-blocked in production (`NODE_ENV !== "development"` → redirect). |
| `/` | `app/(studio)/page.tsx` | Studio dashboard. Overview metrics and activity for the organisation. |
| `/proposals` | `app/(studio)/proposals/page.tsx` | Full proposal gallery. Lists all proposals with status badges, type filters, and sorting. Action-needed proposals (where it's the current user's turn to review in an approval chain) are highlighted with a special card treatment. |
| `/proposals/[id]` | `app/(studio)/proposals/[id]/page.tsx` | Proposal detail page. Shows the full proposal — asset viewer (PDF/image), brief & context, submission data, approval chains, action buttons, and version history. Supports inline field editing and PDF replacement, both of which snapshot the proposal state before saving. |
| `/departments` | `app/(studio)/departments/page.tsx` | Organisational hierarchy manager. Shows department nodes in a bento grid and a collapsible tree map. Supports creating departments, adding/inviting members with role and clearance levels, viewing pending invites, and deleting nodes. |
| `/members` | `app/(studio)/members/page.tsx` | Member directory. Lists all signed-in users with avatar, clearance badge, department memberships, and active proposals. Searchable and paginated (9 per page). Featured card for highest-clearance member. |

### Planned pages (not yet built)
| Route | Purpose |
|---|---|
| `/events` | Active Events — proposals that have reached `ACTIVE` status, shown as live event cards. |
| `/archive` | Archive — `REJECTED` and past proposals for historical reference. |
| `/settings` | User and organisation settings. |

---

## DONE

- [x] Auth — OAuth sign-in (Google, GitHub, LinkedIn)
- [x] Auth — Register page + Invite page (branded, shows real invite data)
- [x] Auth — Route protection via middleware
- [x] Auth — Invite token forwarding for already-authenticated users
- [x] Auth — Dev `Credentials` provider (`dev-seed`) for signing in as seed members during development
- [x] DB — Proposal model (types, statuses, authors, tags, JSONB fields)
- [x] DB — Department model (self-referencing hierarchy, protocol)
- [x] DB — DepartmentMember model (role: HEAD/LEAD/MEMBER/OBSERVER, clearance: OMEGA–DELTA)
- [x] DB — DepartmentInvite model (token, email, role, clearance, expiry, usedAt)
- [x] DB — OrgMember model (org-chart titles: President → Volunteer, optional userId link)
- [x] DB — OrgRole enum (10 roles across 5 levels)
- [x] DB — ProposalApprovalChain model (one per proposal × department, JSON steps, cascade)
- [x] DB — ProposalVersion model (full snapshot per mutation — title, description, type, budget, dateEst, location, metadata, coverImageUrl, imageGradient, editorId, editorName)
- [x] DB — User: bio and specialty fields
- [x] DB — ProposalAuthor: userId FK to User
- [x] API — GET /api/proposals (with filters)
- [x] API — GET /api/proposals/[id]
- [x] API — GET /api/invite/[token] (public — returns invite details for landing page)
- [x] UI — SideNav + TopNav layout
- [x] UI — SideNav — Departments link (account_tree icon)
- [x] UI — SideNav — Members link (group icon)
- [x] UI — Dashboard with metrics cards
- [x] UI — Members page (directory, search, pagination, featured card, clearance/role badges)
- [x] UI — Members: "Add Member" panel (search existing users + manual name/email entry)
- [x] UI — Members: org role badge on member cards, sort by org rank
- [x] UI — Members: "Structure" hover panel showing full org hierarchy with responsibilities
- [x] UI — Proposals list page with status badges, type filters, and sorting
- [x] UI — Proposals list: "Action Needed" card treatment for proposals awaiting the current user's review
- [x] UI — Proposal detail page — asset viewer (PDF iframe + page nav, image, gradient fallback)
- [x] UI — Proposal detail: inline PDF/attachment replace (upload → snapshot → save)
- [x] UI — Proposal detail: inline field editing (title, description, budget, dateEst, location, type → snapshot → save)
- [x] UI — Proposal detail: approval chain bars in header (per-department avatar strips with approved/active/pending states)
- [x] UI — Proposal detail: full chain ladder (step connectors, role labels, approvals, timestamps)
- [x] UI — Proposal detail: action buttons (Submit for Review, Approve/Flag/Reject per chain, Activate, Transfer to Department)
- [x] UI — Proposal detail: version history panel (collapsible list, click to view any past version)
- [x] UI — Proposal detail: version navigator (prev/next arrows, version counter pill, Current button)
- [x] UI — Proposal detail: past version banner (editor, timestamp, Restore button)
- [x] UI — Departments page (node bento grid, hierarchy tree, stats bar)
- [x] UI — Department create form (name, parent node, protocol)
- [x] UI — Add/Invite Member form (name, email, role, clearance selector)
- [x] UI — Pending invites panel per dept card (revoke button)
- [x] UI — Clearance legend + badges (Ω/α/β/γ/δ) on member rows
- [x] UI — Dev account switcher at `/dev` (sign in as any seed member, grouped by department)
- [x] Email — Resend integration, branded invite email (dept, role, clearance, expiry, CTA)
- [x] Flow — Invite redemption: /invite?token= → OAuth → /invite/redeem → DepartmentMember created
- [x] Flow — Proposal approval chain: submit → tier-by-tier review (MEMBER→LEAD→HEAD) → approve/flag/reject
- [x] Flow — Parallel approval chains: HEAD transfer creates independent chain for another department
- [x] Flow — Proposal versioning: every PDF replace or field edit snapshots the proposal state; restore restores + snapshots current
- [x] Auth — Department permission model: OMEGA/ALPHA → ALL, HEAD/LEAD → dept + descendants
- [x] UI — Departments: edit controls gated per-card based on current user's role/clearance
- [x] Seed — 20 boilerplate members across 4 departments for testing (Creative Direction, Production & Logistics, Finance & Strategy, Technology & Innovation)
- [x] Docs — MAP.md (system architecture, hierarchy, all member flows)
- [x] Docs — DB.md (full database reference — all tables, columns, FK relationships, cascade rules)

---

## MUST HAVE (not yet built)

- [ ] UI — Create Proposal form/flow
- [ ] API — POST /api/proposals (create)
- [ ] API — PATCH /api/proposals/[id] (update status, fields)
- [ ] API — DELETE /api/proposals/[id]
- [ ] UI — User identity in TopNav (avatar, name, sign-out) — TopNav shell exists, needs session data wired
- [ ] Auth — Tie proposals to the user who created them (author linking on create)
- [ ] UI — Departments: resend invite action on pending invite rows
- [ ] UI — Departments: edit department (rename, change protocol, change parent)
- [ ] UI — Departments: move member between departments
- [ ] UI — Members: edit org role (change role of an existing org member)
- [ ] UI — Members: remove org member button on cards
- [ ] Flow — OrgMember auto-link: when a manual contact signs in, link their userId to existing OrgMember entry
- [ ] UI — Events page (`/events`) — live event cards for ACTIVE proposals
- [ ] UI — Archive page (`/archive`) — REJECTED and past proposals
- [ ] UI — upload banner image for a proposal
- [ ] UI — proposals active do not show author in all proposals