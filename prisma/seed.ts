import "dotenv/config";
import { PrismaClient, ProposalType, ProposalStatus, type OrgRole, type MemberRole, type Clearance } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

/* ── Flow State Templates ────────────────────────────────────── */

function makeFlowState(opts: {
  submitter: { name: string; initial: string; timestamp: string };
  reviewer: { name: string; initial: string; timestamp: string };
  approver: { name: string; initial: string; timestamp: string };
  activeLabel?: string;
}) {
  return {
    nodes: [
      {
        id: "node-draft",
        label: "Initial Draft",
        type: "draft",
        dotColor: "#707977",
        pillStyle: "ghost",
        position: { x: 50, y: 80 },
        animationClass: "animate-float-slow",
        actor: opts.submitter,
      },
      {
        id: "node-review",
        label: "Review Stage",
        type: "review",
        dotColor: "#4b645b",
        pillStyle: "ghost",
        position: { x: 200, y: 270 },
        animationClass: "animate-float",
        actor: opts.reviewer,
      },
      {
        id: "node-approved",
        label: "Final Approval",
        type: "approved",
        dotColor: "#2d5349",
        pillStyle: "primary-ghost",
        position: { x: 80, y: 490 },
        animationClass: "animate-float-delayed",
        actor: opts.approver,
      },
      {
        id: "node-active",
        label: opts.activeLabel ?? "Active Project",
        type: "active",
        dotColor: "#ffffff",
        pillStyle: "solid-primary",
        position: { x: 240, y: 680 },
        animationClass: "animate-float",
        iconName: "bolt",
      },
    ],
    connections: [
      { from: "node-draft",    to: "node-review",   path: "M 120 120 Q 210 170 260 270" },
      { from: "node-review",   to: "node-approved", path: "M 260 310 Q 290 430 170 490" },
      { from: "node-approved", to: "node-active",   path: "M 165 530 Q 130 650 330 695" },
    ],
    junctionDots: [
      { cx: 260, cy: 270 },
      { cx: 170, cy: 490 },
      { cx: 330, cy: 695 },
    ],
  };
}

/* ── Seed ────────────────────────────────────────────────────── */

async function main() {
  console.log("Seeding database...");
  await prisma.proposal.deleteMany();

  // Create (or reuse) the seed organisation
  let seedOrg = await prisma.organization.findFirst({ where: { name: "Aetheric Studio (Seed)" } });
  if (!seedOrg) {
    seedOrg = await prisma.organization.create({ data: { name: "Aetheric Studio (Seed)" } });
  }
  const seedOrgId = seedOrg.id;

  /* 1 ── Met Gala 2026: The Kinetic Silk Road */
  await prisma.proposal.create({
    data: {
      orgId: seedOrgId,
      type: ProposalType.EVENT,
      status: ProposalStatus.DRAFT,
      title: "Met Gala 2026: The Kinetic Silk Road",
      description: "A celebration of ancient textile traditions reimagined through kinetic fashion installations. The theme explores the intersection of Central Asian craft heritage and contemporary motion design.",
      imageGradient: "linear-gradient(135deg, #3d1a0f 0%, #7c3a20 50%, #1a0a05 100%)",
      coverImageUrl: "https://picsum.photos/seed/silkroad/800/500",
      dateEst: "May 2026",
      location: "Metropolitan Museum of Art, New York",
      budget: 4200000,
      flowState: makeFlowState({
        submitter: { name: "Julian Vane",   initial: "J", timestamp: "OCT 12, 18:45" },
        reviewer:  { name: "Marcus Chen",   initial: "M", timestamp: "OCT 24, 09:15" },
        approver:  { name: "Elena Rossi",   initial: "E", timestamp: "OCT 28, 14:30" },
        activeLabel: "Live Production",
      }),
      metadata: {
        expectedAttendance: 600,
        dresscode: "Black Tie / Theme Costume",
        broadcastPartner: "Vogue Global",
        ticketTiers: ["Patron", "Press", "Industry"],
        riskLevel: "low",
        lastUpdatedBy: "Julian Vane",
      },
      authors: {
        create: [
          { name: "Julian Vane",  role: "Lead Architect", initial: "J", isPrimary: true },
          { name: "Priya Nair",   role: "Textile Curator", initial: "P", isPrimary: false },
        ],
      },
      tags: { create: [{ label: "High Priority" }, { label: "Kinetic" }, { label: "Heritage" }] },
    },
  });

  /* 2 ── Neo-Baroque Summit: Digital Heritage */
  await prisma.proposal.create({
    data: {
      orgId: seedOrgId,
      type: ProposalType.SUMMIT,
      status: ProposalStatus.APPROVED,
      title: "Neo-Baroque Summit: Digital Heritage",
      description: "A three-day interdisciplinary summit bringing together digital archivists, curators, and technologists to discuss the preservation of Baroque art in immersive digital environments.",
      imageGradient: "linear-gradient(135deg, #0a1628 0%, #1a3a5c 50%, #0d2847 100%)",
      coverImageUrl: "https://picsum.photos/seed/baroque/800/500",
      dateEst: "Sep 2025",
      location: "Palazzo Reale, Milan",
      budget: 870000,
      flowState: makeFlowState({
        submitter: { name: "Elena Rossi",   initial: "E", timestamp: "AUG 03, 11:00" },
        reviewer:  { name: "Dr. Liam Park", initial: "L", timestamp: "AUG 18, 16:40" },
        approver:  { name: "Sofia Mendez",  initial: "S", timestamp: "AUG 25, 10:05" },
        activeLabel: "Summit Confirmed",
      }),
      metadata: {
        speakers: ["Dr. Amara Osei", "Prof. Tomáš Novák", "Yuki Tanaka"],
        sessions: 14,
        streamingEnabled: true,
        cpdPoints: 12,
        maxDelegates: 300,
        riskLevel: "low",
        lastUpdatedBy: "Elena Rossi",
      },
      authors: {
        create: [
          { name: "Elena Rossi",   role: "Tech Curator",    initial: "E", isPrimary: true },
          { name: "Dr. Liam Park", role: "Program Director", initial: "L", isPrimary: false },
        ],
      },
      tags: { create: [{ label: "Approved" }, { label: "Digital" }, { label: "Summit" }] },
    },
  });

  /* 3 ── The Floating Orchestra: Venice Tides */
  await prisma.proposal.create({
    data: {
      orgId: seedOrgId,
      type: ProposalType.PERFORMANCE,
      status: ProposalStatus.FLAGGED,
      title: "The Floating Orchestra: Venice Tides",
      description: "Environmental feasibility study required for the acoustic platforms in the central basin. 80-piece orchestra to perform on modular floating stages. Assessment required before permits can be issued.",
      dateEst: "Jun 2026",
      location: "Grand Canal, Venice",
      budget: 1550000,
      flowState: makeFlowState({
        submitter: { name: "Marco Fontana",  initial: "M", timestamp: "SEP 01, 09:30" },
        reviewer:  { name: "Chiara Bellini", initial: "C", timestamp: "SEP 14, 14:00" },
        approver:  { name: "Review Board",   initial: "R", timestamp: "PENDING" },
        activeLabel: "Awaiting Clearance",
      }),
      metadata: {
        ensembleSize: 80,
        floatingStages: 4,
        audienceCapacity: 2000,
        permitStatus: "pending",
        environmentalReport: "required",
        riskLevel: "high",
        flagReason: "Environmental impact assessment outstanding",
        lastUpdatedBy: "Chiara Bellini",
      },
      authors: {
        create: [
          { name: "Marco Fontana",  role: "Production Lead",  initial: "M", isPrimary: true },
          { name: "Chiara Bellini", role: "Logistics Manager", initial: "C", isPrimary: false },
        ],
      },
      tags: { create: [{ label: "Flagged" }, { label: "Environmental" }, { label: "Outdoor" }] },
    },
  });

  /* 4 ── AI Fashion Week: Generated Couture */
  await prisma.proposal.create({
    data: {
      orgId: seedOrgId,
      type: ProposalType.INTERNAL,
      status: ProposalStatus.DRAFT,
      title: "AI Fashion Week: Generated Couture",
      description: "Internal showcase of AI-generated fashion collections trained on archival runway data. Each look generated through diffusion models fine-tuned on 60 years of haute couture.",
      imageGradient: "linear-gradient(135deg, #1a2a1f 0%, #2d4a38 50%, #1a3028 100%)",
      coverImageUrl: "https://picsum.photos/seed/couture/800/500",
      dateEst: "Jan 2026",
      location: "Studio Black, HQ",
      budget: 95000,
      flowState: makeFlowState({
        submitter: { name: "Creative AI Dept.", initial: "A", timestamp: "NOV 01, 08:00" },
        reviewer:  { name: "Marcus Chen",       initial: "M", timestamp: "NOV 08, 13:20" },
        approver:  { name: "Julian Vane",        initial: "J", timestamp: "PENDING" },
        activeLabel: "In Review",
      }),
      metadata: {
        modelsUsed: ["SDXL-Couture-v2", "FashionCLIP"],
        looksGenerated: 240,
        humanCurated: 18,
        printingPartner: "Materialize Studio",
        internalOnly: true,
        riskLevel: "low",
        lastUpdatedBy: "Creative AI Dept.",
      },
      authors: {
        create: [
          { name: "Creative AI Dept.", role: "Internal Project", iconName: "smart_toy", isPrimary: true },
          { name: "Marcus Chen",       role: "Technical Lead",   initial: "M",          isPrimary: false },
        ],
      },
      tags: { create: [{ label: "AI" }, { label: "Internal" }, { label: "Fashion" }] },
    },
  });

  /* 5 ── Desert Noir: The Saharan Pavilion */
  await prisma.proposal.create({
    data: {
      orgId: seedOrgId,
      type: ProposalType.EXHIBITION,
      status: ProposalStatus.APPROVED,
      title: "Desert Noir: The Saharan Pavilion",
      description: "A permanent-installation exhibition exploring the architectural vernacular of the Sahara — rammed earth, mudbrick, and shadow — translated into contemporary gallery space.",
      imageGradient: "linear-gradient(135deg, #2c1a08 0%, #5c3d1e 40%, #8a6040 100%)",
      coverImageUrl: "https://picsum.photos/seed/sahara/800/500",
      dateEst: "Mar 2026",
      location: "Tate Modern, London",
      budget: 720000,
      flowState: makeFlowState({
        submitter: { name: "Amara Osei",   initial: "A", timestamp: "JUL 15, 10:00" },
        reviewer:  { name: "Sofia Mendez", initial: "S", timestamp: "JUL 28, 15:30" },
        approver:  { name: "Elena Rossi",  initial: "E", timestamp: "AUG 04, 09:00" },
        activeLabel: "Installation Confirmed",
      }),
      metadata: {
        installationArea: "1,200 sqm",
        materials: ["rammed earth", "raw brass", "woven palm"],
        lightingDesign: "Atelier Lumière",
        publicProgramming: true,
        educationPartner: "SOAS University",
        riskLevel: "low",
        lastUpdatedBy: "Amara Osei",
      },
      authors: {
        create: [
          { name: "Amara Osei",   role: "Lead Designer",     initial: "A", isPrimary: true },
          { name: "Kofi Acheampong", role: "Material Specialist", initial: "K", isPrimary: false },
        ],
      },
      tags: { create: [{ label: "Exhibition" }, { label: "Architecture" }, { label: "Approved" }] },
    },
  });

  /* 6 ── Solstice Gala: Arctic Edition */
  await prisma.proposal.create({
    data: {
      orgId: seedOrgId,
      type: ProposalType.EVENT,
      status: ProposalStatus.DRAFT,
      title: "Solstice Gala: Arctic Edition",
      description: "An immersive gala experience set under the Northern Lights, featuring cryogenic art installations, ice sculptors in residence, and a zero-waste fine dining concept.",
      imageGradient: "linear-gradient(135deg, #0d1f2d 0%, #1b3a4b 50%, #0a2535 100%)",
      coverImageUrl: "https://picsum.photos/seed/arctic/800/500",
      dateEst: "Dec 2025",
      location: "Tromsø, Norway",
      budget: 3100000,
      flowState: makeFlowState({
        submitter: { name: "Freya Larsen",  initial: "F", timestamp: "OCT 20, 17:00" },
        reviewer:  { name: "Not Assigned",  initial: "—", timestamp: "PENDING" },
        approver:  { name: "Not Assigned",  initial: "—", timestamp: "PENDING" },
        activeLabel: "Draft Stage",
      }),
      metadata: {
        expectedAttendance: 400,
        venueType: "outdoor-temporary",
        weatherContingency: "heated geodesic domes",
        cateringConcept: "zero-waste Nordic tasting menu",
        artistsInvited: ["Olafur Eliasson Studio", "Ice Collective"],
        riskLevel: "medium",
        lastUpdatedBy: "Freya Larsen",
      },
      authors: {
        create: [
          { name: "Freya Larsen", role: "Creative Director", initial: "F", isPrimary: true },
        ],
      },
      tags: { create: [{ label: "Draft" }, { label: "Outdoor" }, { label: "Sustainability" }] },
    },
  });

  /* 7 ── Hyperion Summit: Future of Craft */
  await prisma.proposal.create({
    data: {
      orgId: seedOrgId,
      type: ProposalType.SUMMIT,
      status: ProposalStatus.DRAFT,
      title: "Hyperion Summit: Future of Craft",
      description: "A one-day intensive bringing master craftspeople into dialogue with robotics engineers and interaction designers. Sessions on material intelligence, digital loom weaving, and ceramic 3D printing.",
      imageGradient: "linear-gradient(135deg, #1c1c2e 0%, #2d2d44 50%, #16213e 100%)",
      coverImageUrl: "https://picsum.photos/seed/craftwork/800/500",
      dateEst: "Apr 2026",
      location: "V&A Museum, London",
      budget: 310000,
      flowState: makeFlowState({
        submitter: { name: "Dr. Liam Park", initial: "L", timestamp: "NOV 05, 12:00" },
        reviewer:  { name: "Priya Nair",    initial: "P", timestamp: "NOV 19, 09:45" },
        approver:  { name: "Pending",       initial: "—", timestamp: "PENDING" },
        activeLabel: "Under Review",
      }),
      metadata: {
        keynoteSpeakers: ["Neri Oxman Estate", "Formafantasma"],
        workshops: 6,
        liveDemo: "robotic loom",
        documenterAssigned: true,
        broadcastPartner: "Dezeen Live",
        riskLevel: "low",
        lastUpdatedBy: "Dr. Liam Park",
      },
      authors: {
        create: [
          { name: "Dr. Liam Park", role: "Program Director", initial: "L", isPrimary: true },
          { name: "Priya Nair",    role: "Craft Curator",    initial: "P", isPrimary: false },
        ],
      },
      tags: { create: [{ label: "Summit" }, { label: "Craft" }, { label: "Technology" }] },
    },
  });

  /* 8 ── Requiem for the Archive */
  await prisma.proposal.create({
    data: {
      orgId: seedOrgId,
      type: ProposalType.PERFORMANCE,
      status: ProposalStatus.APPROVED,
      title: "Requiem for the Archive",
      description: "A multi-channel audio-visual performance piece responding to the destruction of cultural archives in conflict zones. Commissioned for a 90-minute live score performed with archival footage projections.",
      imageGradient: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0a0a0a 100%)",
      coverImageUrl: "https://picsum.photos/seed/orchestra/800/500",
      dateEst: "Feb 2026",
      location: "Barbican Centre, London",
      budget: 185000,
      flowState: makeFlowState({
        submitter: { name: "Yuki Tanaka",  initial: "Y", timestamp: "SEP 10, 20:00" },
        reviewer:  { name: "Elena Rossi", initial: "E", timestamp: "SEP 22, 11:30" },
        approver:  { name: "Julian Vane", initial: "J", timestamp: "OCT 01, 16:00" },
        activeLabel: "Production Active",
      }),
      metadata: {
        duration: "90 min",
        ensemble: "12-piece chamber orchestra",
        archiveSources: ["INA Paris", "Getty Images Archive"],
        lightingRig: "custom-mapped",
        accessibilityNotes: "BSL interpreted, audio described",
        riskLevel: "low",
        lastUpdatedBy: "Yuki Tanaka",
      },
      authors: {
        create: [
          { name: "Yuki Tanaka",   role: "Composer & Director", initial: "Y", isPrimary: true },
          { name: "Sofia Mendez",  role: "Visual Director",      initial: "S", isPrimary: false },
        ],
      },
      tags: { create: [{ label: "Performance" }, { label: "Commission" }, { label: "Approved" }] },
    },
  });

  /* 9 ── Chromatic Wedding: House of Valentin */
  await prisma.proposal.create({
    data: {
      orgId: seedOrgId,
      type: ProposalType.WEDDING,
      status: ProposalStatus.ACTIVE,
      title: "Chromatic Wedding: House of Valentin",
      description: "A high-concept private wedding experience for a fashion house principal. Full venue takeover, custom floral taxonomy mapped to Pantone spectrum, live couture alteration suite on-site.",
      imageGradient: "linear-gradient(135deg, #2d0a3e 0%, #5c1a6e 50%, #3d0a55 100%)",
      coverImageUrl: "https://picsum.photos/seed/chateau/800/500",
      dateEst: "Aug 2025",
      location: "Château de Vaux-le-Vicomte, France",
      budget: 6800000,
      flowState: makeFlowState({
        submitter: { name: "Isabelle Fontaine", initial: "I", timestamp: "MAY 12, 10:00" },
        reviewer:  { name: "Julian Vane",       initial: "J", timestamp: "MAY 20, 14:30" },
        approver:  { name: "Marcus Chen",       initial: "M", timestamp: "JUN 01, 09:00" },
        activeLabel: "Live Event",
      }),
      metadata: {
        guestCount: 180,
        venueExclusivity: "full weekend",
        cateringPartner: "Alain Ducasse Enterprise",
        floristry: "Thierry Boutemy",
        dressDesigner: "House of Valentin — Atelier",
        security: "tier-2",
        riskLevel: "medium",
        lastUpdatedBy: "Isabelle Fontaine",
      },
      authors: {
        create: [
          { name: "Isabelle Fontaine", role: "Event Director",    initial: "I", isPrimary: true },
          { name: "Marcus Chen",       role: "Logistics Director", initial: "M", isPrimary: false },
        ],
      },
      tags: { create: [{ label: "Wedding" }, { label: "Luxury" }, { label: "Active" }] },
    },
  });

  /* 10 ── Liminal Spaces: Global Architecture Biennale */
  await prisma.proposal.create({
    data: {
      orgId: seedOrgId,
      type: ProposalType.EXHIBITION,
      status: ProposalStatus.DRAFT,
      title: "Liminal Spaces: Global Architecture Biennale",
      description: "A pavilion-based exhibition spanning 22 national representations exploring the architecture of in-between — thresholds, corridors, transit spaces — as sites of political and social meaning.",
      imageGradient: "linear-gradient(135deg, #101820 0%, #1e3040 50%, #0c1520 100%)",
      coverImageUrl: "https://picsum.photos/seed/biennale/800/500",
      dateEst: "Nov 2026",
      location: "Arsenale, Venice",
      budget: 2900000,
      flowState: makeFlowState({
        submitter: { name: "Prof. Tomáš Novák", initial: "T", timestamp: "OCT 30, 08:30" },
        reviewer:  { name: "Amara Osei",        initial: "A", timestamp: "NOV 12, 17:00" },
        approver:  { name: "Pending",            initial: "—", timestamp: "PENDING" },
        activeLabel: "Under Review",
      }),
      metadata: {
        nationalPavilions: 22,
        curatorCount: 8,
        publicProgram: "symposium + schools outreach",
        cataloguePublisher: "Lars Müller Publishers",
        biennaleEdition: "15th",
        riskLevel: "medium",
        lastUpdatedBy: "Prof. Tomáš Novák",
      },
      authors: {
        create: [
          { name: "Prof. Tomáš Novák", role: "Chief Curator",       initial: "T", isPrimary: true },
          { name: "Amara Osei",        role: "Pavilion Coordinator", initial: "A", isPrimary: false },
          { name: "Freya Larsen",      role: "Nordic Representative", initial: "F", isPrimary: false },
        ],
      },
      tags: { create: [{ label: "Biennale" }, { label: "Architecture" }, { label: "International" }] },
    },
  });

  /* 11 ── Studio Residency: The Unwritten City */
  await prisma.proposal.create({
    data: {
      orgId: seedOrgId,
      type: ProposalType.INTERNAL,
      status: ProposalStatus.DRAFT,
      title: "Studio Residency: The Unwritten City",
      description: "A 6-week internal residency programme pairing emerging urban researchers with studio designers to produce speculative city documents — maps, ordinances, transit guides — for cities that don't exist.",
      imageGradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      coverImageUrl: "https://picsum.photos/seed/citymap/800/500",
      dateEst: "Jul 2025",
      location: "Studio HQ — Floor 4",
      budget: 42000,
      flowState: makeFlowState({
        submitter: { name: "Kofi Acheampong", initial: "K", timestamp: "DEC 01, 09:00" },
        reviewer:  { name: "Not Assigned",    initial: "—", timestamp: "PENDING" },
        approver:  { name: "Not Assigned",    initial: "—", timestamp: "PENDING" },
        activeLabel: "Draft Stage",
      }),
      metadata: {
        cohortSize: 6,
        duration: "6 weeks",
        outputFormat: "printed document + digital archive",
        mentors: ["Julian Vane", "Dr. Liam Park"],
        openCall: false,
        riskLevel: "low",
        lastUpdatedBy: "Kofi Acheampong",
      },
      authors: {
        create: [
          { name: "Kofi Acheampong", role: "Programme Lead", initial: "K", isPrimary: true },
        ],
      },
      tags: { create: [{ label: "Residency" }, { label: "Internal" }, { label: "Research" }] },
    },
  });

  /* 12 ── Neon Carnivale: São Paulo Street Summit */
  await prisma.proposal.create({
    data: {
      orgId: seedOrgId,
      type: ProposalType.EVENT,
      status: ProposalStatus.FLAGGED,
      title: "Neon Carnivale: São Paulo Street Summit",
      description: "A large-scale street festival celebrating Brazilian contemporary art, graffiti, and electronic music across three districts. Flagged for unresolved municipal permit issues and crowd management plan gaps.",
      imageGradient: "linear-gradient(135deg, #1a0533 0%, #3d0f66 50%, #5a1a99 100%)",
      coverImageUrl: "https://picsum.photos/seed/carnival/800/500",
      dateEst: "Feb 2026",
      location: "Vila Madalena, São Paulo",
      budget: 980000,
      flowState: makeFlowState({
        submitter: { name: "Beatriz Santos",  initial: "B", timestamp: "OCT 05, 14:00" },
        reviewer:  { name: "Marcus Chen",     initial: "M", timestamp: "OCT 18, 10:30" },
        approver:  { name: "Review Board",    initial: "R", timestamp: "FLAGGED" },
        activeLabel: "Awaiting Clearance",
      }),
      metadata: {
        expectedAttendance: 15000,
        districts: ["Vila Madalena", "Pinheiros", "Barra Funda"],
        municipalPermit: "pending",
        crowdManagementPlan: "incomplete",
        artistLineup: ["Anitta", "Criolo", "Liniker"],
        flagReason: "Municipal permit unresolved + crowd management plan incomplete",
        riskLevel: "high",
        lastUpdatedBy: "Marcus Chen",
      },
      authors: {
        create: [
          { name: "Beatriz Santos", role: "Festival Director", initial: "B", isPrimary: true },
          { name: "Marcus Chen",    role: "Compliance Lead",   initial: "M", isPrimary: false },
        ],
      },
      tags: { create: [{ label: "Flagged" }, { label: "Festival" }, { label: "Street Art" }] },
    },
  });

  console.log("Database seeded with 12 proposals ✓");

  await seedMembers();
  await seedDemo();
  await seedDummy();
}

/* ── Members & Departments seed ─────────────────────────────── */

function orgRoleLabel(role: OrgRole): string {
  const map: Record<OrgRole, string> = {
    PRESIDENT:       "President",
    VICE_PRESIDENT:  "Vice President",
    SECRETARY:       "Secretary",
    HEAD_LOGISTICS:  "Head Logistics",
    HEAD_FINANCE:    "Head Finance",
    HEAD_MARKETING:  "Head Marketing",
    HEAD_CREATIVES:  "Head Creatives",
    PROJECT_LEAD:    "Project Lead",
    ASSOCIATE:       "Associate",
    VOLUNTEER:       "Volunteer",
  };
  return map[role];
}

function slugEmail(first: string, last: string): string {
  const clean = (s: string) =>
    s.toLowerCase().replace(/[^a-z]/g, "");   // strip hyphens, spaces, etc.
  return `${clean(first)}.${clean(last)}@aetheric.seed`;
}

type MemberDef = {
  first:   string;
  last:    string;
  orgRole: OrgRole;
};

const MEMBER_DEFS: MemberDef[] = [
  { first: "Aleksei",  last: "Volkov",    orgRole: "PRESIDENT"      },
  { first: "Hana",     last: "Suzuki",    orgRole: "VICE_PRESIDENT" },
  { first: "Lukas",    last: "Bauer",     orgRole: "SECRETARY"      },
  { first: "Marco",    last: "Delacroix", orgRole: "HEAD_LOGISTICS" },
  { first: "Priscilla",last: "Okafor",    orgRole: "HEAD_FINANCE"   },
  { first: "Isabelle", last: "Voss",      orgRole: "HEAD_CREATIVES" },
  { first: "Kwame",    last: "Asante",    orgRole: "PROJECT_LEAD"   },
  { first: "Rajan",    last: "Mehta",     orgRole: "PROJECT_LEAD"   },
  { first: "Yuna",     last: "Kim",       orgRole: "PROJECT_LEAD"   },
  { first: "Nadia",    last: "Solberg",   orgRole: "ASSOCIATE"      },
  { first: "Felix",    last: "Hartmann",  orgRole: "ASSOCIATE"      },
  { first: "Tariq",    last: "AlRashid",  orgRole: "ASSOCIATE"      },
  { first: "Saoirse",  last: "Murphy",    orgRole: "ASSOCIATE"      },
  { first: "MeiLing",  last: "Zhou",      orgRole: "ASSOCIATE"      },
  { first: "Arjun",    last: "Patel",     orgRole: "ASSOCIATE"      },
  { first: "Lena",     last: "Fischer",   orgRole: "ASSOCIATE"      },
  { first: "Chioma",   last: "Adeyemi",   orgRole: "VOLUNTEER"      },
  { first: "Dani",     last: "Reyes",     orgRole: "VOLUNTEER"      },
  { first: "Camille",  last: "Dubois",    orgRole: "VOLUNTEER"      },
  { first: "Omar",     last: "Sharif",    orgRole: "VOLUNTEER"      },
];

async function seedMembers() {
  console.log("Seeding org members…");

  // ── 1. Find or create the seed org ──────────────────────────
  let seedOrg = await prisma.organization.findFirst({ where: { name: "Aetheric Studio (Seed)" } });
  if (!seedOrg) {
    seedOrg = await prisma.organization.create({ data: { name: "Aetheric Studio (Seed)" } });
  }
  const seedOrgId = seedOrg.id;

  // ── 2. Wipe existing seed users (and their OrgMembers) ──────
  const seedUsers = await prisma.user.findMany({
    where:  { email: { endsWith: "@aetheric.seed" } },
    select: { id: true },
  });
  const seedIds = seedUsers.map((u) => u.id);
  if (seedIds.length > 0) {
    await prisma.orgMember.deleteMany({ where: { userId: { in: seedIds } } });
    await prisma.user.deleteMany({ where: { id: { in: seedIds } } });
  }

  // ── 3. Create users + org memberships ───────────────────────
  for (const def of MEMBER_DEFS) {
    const roleLabel   = orgRoleLabel(def.orgRole);
    const displayName = `${roleLabel} - ${def.first} ${def.last}`;
    const email       = slugEmail(def.first, def.last);

    const user = await prisma.user.create({
      data: { name: displayName, email },
    });

    await prisma.orgMember.create({
      data: { userId: user.id, name: displayName, email, orgRole: def.orgRole, orgId: seedOrgId },
    });
  }

  console.log(`Seeded ${MEMBER_DEFS.length} org members ✓`);
}

/* ── DEMO Org Seed ───────────────────────────────────────────── */

type DemoDef = {
  first:    string;
  last:     string;
  orgRole:  OrgRole;
  deptKey:  "creative" | "production" | "finance" | "tech";
  role:     MemberRole;
  clearance: Clearance;
};

const DEMO_DEPTS = {
  creative:   "Creative Direction",
  production: "Production & Logistics",
  finance:    "Finance & Strategy",
  tech:       "Technology & Innovation",
} as const;

const DEMO_DEFS: DemoDef[] = [
  // Creative Direction
  { first: "Zara",   last: "Marchetti",  orgRole: "PRESIDENT",      deptKey: "creative",   role: "HEAD",    clearance: "OMEGA" },
  { first: "Kai",    last: "Nakamura",   orgRole: "HEAD_CREATIVES",  deptKey: "creative",   role: "LEAD",    clearance: "ALPHA" },
  { first: "Nina",   last: "Vasquez",    orgRole: "ASSOCIATE",       deptKey: "creative",   role: "MEMBER",  clearance: "BETA"  },
  // Production & Logistics
  { first: "Ethan",  last: "Oduya",      orgRole: "HEAD_LOGISTICS",  deptKey: "production", role: "HEAD",    clearance: "OMEGA" },
  { first: "Lola",   last: "Berger",     orgRole: "PROJECT_LEAD",    deptKey: "production", role: "LEAD",    clearance: "ALPHA" },
  { first: "Soren",  last: "Lindgren",   orgRole: "ASSOCIATE",       deptKey: "production", role: "MEMBER",  clearance: "BETA"  },
  // Finance & Strategy
  { first: "Maya",   last: "Goldstein",  orgRole: "HEAD_FINANCE",    deptKey: "finance",    role: "HEAD",    clearance: "OMEGA" },
  { first: "Ariel",  last: "Santos",     orgRole: "SECRETARY",       deptKey: "finance",    role: "LEAD",    clearance: "ALPHA" },
  { first: "Tobias", last: "Richter",    orgRole: "ASSOCIATE",       deptKey: "finance",    role: "MEMBER",  clearance: "GAMMA" },
  // Technology & Innovation
  { first: "Luna",   last: "Chen",       orgRole: "VICE_PRESIDENT",  deptKey: "tech",       role: "HEAD",    clearance: "ALPHA" },
  { first: "Remi",   last: "Adeyemi",    orgRole: "PROJECT_LEAD",    deptKey: "tech",       role: "LEAD",    clearance: "BETA"  },
  { first: "Petra",  last: "Kowalski",   orgRole: "VOLUNTEER",       deptKey: "tech",       role: "MEMBER",  clearance: "GAMMA" },
];

async function seedDemo() {
  console.log("Seeding DEMO org…");

  // ── 1. Find or create the DEMO org ──────────────────────────
  let demoOrg = await prisma.organization.findFirst({ where: { name: "DEMO" } });
  if (!demoOrg) {
    demoOrg = await prisma.organization.create({ data: { name: "DEMO" } });
  }
  const demoOrgId = demoOrg.id;

  // ── 2. Clean existing DEMO data ──────────────────────────────
  await prisma.proposal.deleteMany({ where: { orgId: demoOrgId } });

  const demoDepts = await prisma.department.findMany({
    where: { orgId: demoOrgId },
    select: { id: true },
  });
  const demoDeptIds = demoDepts.map((d) => d.id);
  if (demoDeptIds.length > 0) {
    await prisma.departmentMember.deleteMany({ where: { departmentId: { in: demoDeptIds } } });
  }
  await prisma.department.deleteMany({ where: { orgId: demoOrgId } });

  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: "@aetheric.demo" } },
    select: { id: true },
  });
  const demoIds = demoUsers.map((u) => u.id);
  if (demoIds.length > 0) {
    await prisma.orgMember.deleteMany({ where: { userId: { in: demoIds } } });
    await prisma.user.deleteMany({ where: { id: { in: demoIds } } });
  }

  // ── 3. Create departments ─────────────────────────────────────
  const deptRecords: Record<string, string> = {};
  for (const [key, name] of Object.entries(DEMO_DEPTS)) {
    const dept = await prisma.department.create({
      data: { name, orgId: demoOrgId },
    });
    deptRecords[key] = dept.id;
  }

  // ── 4. Create users + memberships ────────────────────────────
  const userMap: Record<string, string> = {}; // email → userId
  for (const def of DEMO_DEFS) {
    const clean  = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
    const email  = `${clean(def.first)}.${clean(def.last)}@aetheric.demo`;
    const deptName = DEMO_DEPTS[def.deptKey];
    const roleLabel = orgRoleLabel(def.orgRole);
    const displayName = `${roleLabel} - ${def.first} ${def.last}`;

    const user = await prisma.user.create({ data: { name: displayName, email } });
    userMap[email] = user.id;

    await prisma.orgMember.create({
      data: { userId: user.id, name: displayName, email, orgRole: def.orgRole, orgId: demoOrgId },
    });

    await prisma.departmentMember.create({
      data: {
        departmentId: deptRecords[def.deptKey],
        userId:       user.id,
        name:         displayName,
        email,
        role:         def.role,
        clearance:    def.clearance,
      },
    });
  }

  // ── 5. Create proposals at all lifecycle stages ───────────────
  // Helper: get userId by name search
  const demoUser = (first: string, last: string) => {
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
    return `${clean(first)}.${clean(last)}@aetheric.demo`;
  };

  /* DRAFT 1 */
  await prisma.proposal.create({
    data: {
      orgId:        demoOrgId,
      type:         ProposalType.EVENT,
      status:       ProposalStatus.DRAFT,
      title:        "Future Visionaries Gala 2026",
      description:  "An annual fundraising gala celebrating emerging talent across design, fashion, and technology. Still in early concept phase — venue and talent roster to be confirmed.",
      imageGradient:"linear-gradient(135deg, #1a1030 0%, #2d1f50 50%, #12091f 100%)",
      coverImageUrl:"https://picsum.photos/seed/gala2026/800/500",
      dateEst:      "Nov 2026",
      location:     "TBC — London or Paris",
      budget:       1200000,
      flowState:    makeFlowState({
        submitter: { name: "Zara Marchetti", initial: "Z", timestamp: "MAR 10, 09:00" },
        reviewer:  { name: "Not Assigned",   initial: "—", timestamp: "PENDING" },
        approver:  { name: "Not Assigned",   initial: "—", timestamp: "PENDING" },
        activeLabel: "Draft Stage",
      }),
      metadata: {
        concept: "annual showcase",
        talentCategories: ["design", "fashion", "technology"],
        riskLevel: "low",
        lastUpdatedBy: "Zara Marchetti",
      },
      authors: { create: [{ name: "Zara Marchetti", role: "Creative Director", initial: "Z", isPrimary: true }] },
      tags:    { create: [{ label: "Draft" }, { label: "Gala" }, { label: "Annual" }] },
    },
  });

  /* DRAFT 2 */
  await prisma.proposal.create({
    data: {
      orgId:        demoOrgId,
      type:         ProposalType.INTERNAL,
      status:       ProposalStatus.DRAFT,
      title:        "Studio Branding Refresh",
      description:  "Internal proposal to update the studio's visual identity system — wordmark, colour palette, motion tokens, and digital templates. Scoping phase only.",
      imageGradient:"linear-gradient(135deg, #1f2937 0%, #374151 50%, #111827 100%)",
      dateEst:      "Q2 2026",
      location:     "Studio HQ",
      budget:       35000,
      flowState:    makeFlowState({
        submitter: { name: "Kai Nakamura", initial: "K", timestamp: "MAR 15, 14:00" },
        reviewer:  { name: "Zara Marchetti", initial: "Z", timestamp: "PENDING" },
        approver:  { name: "Not Assigned",   initial: "—", timestamp: "PENDING" },
        activeLabel: "Under Review",
      }),
      metadata: {
        internalOnly: true,
        deliverables: ["wordmark", "palette", "motion tokens"],
        riskLevel: "low",
        lastUpdatedBy: "Kai Nakamura",
      },
      authors: { create: [{ name: "Kai Nakamura", role: "Design Lead", initial: "K", isPrimary: true }] },
      tags:    { create: [{ label: "Draft" }, { label: "Internal" }, { label: "Branding" }] },
    },
  });

  /* APPROVED */
  await prisma.proposal.create({
    data: {
      orgId:        demoOrgId,
      type:         ProposalType.SUMMIT,
      status:       ProposalStatus.APPROVED,
      title:        "Creative Technologies Summit",
      description:  "A two-day international summit exploring AI-assisted design, generative media, and the ethics of creative automation. Speakers confirmed. Budget approved.",
      imageGradient:"linear-gradient(135deg, #0a2540 0%, #1a4a70 50%, #061830 100%)",
      coverImageUrl:"https://picsum.photos/seed/techsummit/800/500",
      dateEst:      "Sep 2026",
      location:     "Design Museum, London",
      budget:       580000,
      flowState:    makeFlowState({
        submitter: { name: "Luna Chen",      initial: "L", timestamp: "FEB 01, 10:00" },
        reviewer:  { name: "Maya Goldstein", initial: "M", timestamp: "FEB 14, 15:30" },
        approver:  { name: "Zara Marchetti", initial: "Z", timestamp: "FEB 22, 09:00" },
        activeLabel: "Summit Approved",
      }),
      metadata: {
        speakers: ["Refik Anadol Studio", "Holly Herndon"],
        sessions: 10,
        maxDelegates: 250,
        riskLevel: "low",
        lastUpdatedBy: "Luna Chen",
      },
      authors: { create: [
        { name: "Luna Chen",   role: "Programme Director", initial: "L", isPrimary: true },
        { name: "Remi Adeyemi", role: "Tech Producer",    initial: "R", isPrimary: false },
      ]},
      tags: { create: [{ label: "Approved" }, { label: "Summit" }, { label: "AI" }] },
    },
  });

  /* FLAGGED */
  await prisma.proposal.create({
    data: {
      orgId:        demoOrgId,
      type:         ProposalType.EXHIBITION,
      status:       ProposalStatus.FLAGGED,
      title:        "Voices of the Diaspora: Photo Exhibition",
      description:  "A touring photography exhibition documenting diaspora communities across 8 cities. Flagged pending rights clearance for all 120 commissioned works.",
      imageGradient:"linear-gradient(135deg, #3d2008 0%, #7a4010 50%, #2a1505 100%)",
      coverImageUrl:"https://picsum.photos/seed/diaspora/800/500",
      dateEst:      "Oct 2026",
      location:     "Touring — 8 cities",
      budget:       420000,
      flowState:    makeFlowState({
        submitter: { name: "Nina Vasquez",   initial: "N", timestamp: "JAN 20, 11:00" },
        reviewer:  { name: "Ethan Oduya",    initial: "E", timestamp: "FEB 03, 16:00" },
        approver:  { name: "Review Board",   initial: "R", timestamp: "FLAGGED" },
        activeLabel: "Awaiting Clearance",
      }),
      metadata: {
        worksCount: 120,
        citiesCount: 8,
        rightsStatus: "pending",
        flagReason: "Rights clearance outstanding for 37 works",
        riskLevel: "medium",
        lastUpdatedBy: "Ethan Oduya",
      },
      authors: { create: [
        { name: "Nina Vasquez", role: "Lead Curator",      initial: "N", isPrimary: true },
        { name: "Lola Berger",  role: "Logistics Manager", initial: "L", isPrimary: false },
      ]},
      tags: { create: [{ label: "Flagged" }, { label: "Exhibition" }, { label: "Photography" }] },
    },
  });

  /* REJECTED */
  await prisma.proposal.create({
    data: {
      orgId:        demoOrgId,
      type:         ProposalType.EVENT,
      status:       ProposalStatus.REJECTED,
      title:        "Midnight Runway: Rooftop Fashion Show",
      description:  "A late-night outdoor runway event on a central London rooftop. Rejected due to noise abatement regulations and structural load concerns raised by building management.",
      imageGradient:"linear-gradient(135deg, #0f0f0f 0%, #2a2a2a 50%, #050505 100%)",
      dateEst:      "Jul 2026",
      location:     "Central London Rooftop (unconfirmed)",
      budget:       290000,
      flowState:    makeFlowState({
        submitter: { name: "Nina Vasquez",   initial: "N", timestamp: "DEC 10, 20:00" },
        reviewer:  { name: "Ariel Santos",   initial: "A", timestamp: "DEC 18, 14:00" },
        approver:  { name: "Zara Marchetti", initial: "Z", timestamp: "JAN 05, 10:00" },
        activeLabel: "Rejected",
      }),
      metadata: {
        rejectionReason: "Noise regulations + structural load concerns",
        reviewedBy: "Zara Marchetti",
        riskLevel: "high",
        lastUpdatedBy: "Ariel Santos",
      },
      authors: { create: [
        { name: "Nina Vasquez", role: "Creative Lead",      initial: "N", isPrimary: true },
        { name: "Soren Lindgren", role: "Production Lead",  initial: "S", isPrimary: false },
      ]},
      tags: { create: [{ label: "Rejected" }, { label: "Fashion" }, { label: "Outdoor" }] },
    },
  });

  /* ACTIVE 1 */
  await prisma.proposal.create({
    data: {
      orgId:        demoOrgId,
      type:         ProposalType.PERFORMANCE,
      status:       ProposalStatus.ACTIVE,
      title:        "Sound & Structure: A Spatial Audio Experience",
      description:  "An immersive spatial audio installation running across three floors of a converted warehouse. Live performance component with rotating guest composers every two weeks.",
      imageGradient:"linear-gradient(135deg, #0d2a1e 0%, #1a4a38 50%, #092015 100%)",
      coverImageUrl:"https://picsum.photos/seed/spatialaudio/800/500",
      dateEst:      "Apr–Jun 2026",
      location:     "Tobacco Dock, London",
      budget:       340000,
      flowState:    makeFlowState({
        submitter: { name: "Remi Adeyemi",   initial: "R", timestamp: "JAN 10, 09:00" },
        reviewer:  { name: "Luna Chen",      initial: "L", timestamp: "JAN 22, 13:30" },
        approver:  { name: "Zara Marchetti", initial: "Z", timestamp: "FEB 01, 10:00" },
        activeLabel: "Live Installation",
      }),
      metadata: {
        duration: "3 months",
        rotatingComposers: true,
        capacity: 300,
        ticketTiers: ["General", "Opening Night", "Patron"],
        riskLevel: "low",
        lastUpdatedBy: "Remi Adeyemi",
      },
      authors: { create: [
        { name: "Remi Adeyemi", role: "Technical Director",  initial: "R", isPrimary: true },
        { name: "Kai Nakamura", role: "Installation Design", initial: "K", isPrimary: false },
      ]},
      tags: { create: [{ label: "Active" }, { label: "Audio" }, { label: "Installation" }] },
    },
  });

  /* ACTIVE 2 */
  await prisma.proposal.create({
    data: {
      orgId:        demoOrgId,
      type:         ProposalType.WEDDING,
      status:       ProposalStatus.ACTIVE,
      title:        "Private Wedding: Castello di Amore",
      description:  "Destination wedding for a private client at a Tuscan estate. Full creative direction including floral design, lighting, and a bespoke string quartet programme. Currently in live production.",
      imageGradient:"linear-gradient(135deg, #3a1a2e 0%, #6a2a50 50%, #2a0f22 100%)",
      coverImageUrl:"https://picsum.photos/seed/tuscany/800/500",
      dateEst:      "Jun 2026",
      location:     "Castello di Amore, Tuscany",
      budget:       4500000,
      flowState:    makeFlowState({
        submitter: { name: "Lola Berger",    initial: "L", timestamp: "NOV 15, 11:00" },
        reviewer:  { name: "Ethan Oduya",    initial: "E", timestamp: "DEC 01, 14:00" },
        approver:  { name: "Zara Marchetti", initial: "Z", timestamp: "DEC 10, 09:30" },
        activeLabel: "Live Production",
      }),
      metadata: {
        guestCount: 150,
        venueExclusivity: "full weekend",
        floralPartner: "Atelier Botanique",
        riskLevel: "medium",
        lastUpdatedBy: "Lola Berger",
      },
      authors: { create: [
        { name: "Lola Berger",    role: "Event Director",    initial: "L", isPrimary: true },
        { name: "Ethan Oduya",    role: "Logistics Lead",    initial: "E", isPrimary: false },
        { name: "Zara Marchetti", role: "Creative Director", initial: "Z", isPrimary: false },
      ]},
      tags: { create: [{ label: "Active" }, { label: "Wedding" }, { label: "Destination" }] },
    },
  });

  /* COMPLETED */
  await prisma.proposal.create({
    data: {
      orgId:        demoOrgId,
      type:         ProposalType.EXHIBITION,
      status:       ProposalStatus.COMPLETED,
      title:        "Material Futures: Graduate Design Showcase",
      description:  "A completed group exhibition showcasing 28 graduate designers exploring sustainable material innovation. Ran for 6 weeks. Fully documented and archived.",
      imageGradient:"linear-gradient(135deg, #0f2a1a 0%, #1e4a30 50%, #0a1f12 100%)",
      coverImageUrl:"https://picsum.photos/seed/graduate/800/500",
      dateEst:      "Jan 2026",
      location:     "Barbican Curve Gallery, London",
      budget:       95000,
      flowState:    makeFlowState({
        submitter: { name: "Kai Nakamura",   initial: "K", timestamp: "OCT 01, 09:00" },
        reviewer:  { name: "Nina Vasquez",   initial: "N", timestamp: "OCT 12, 13:00" },
        approver:  { name: "Zara Marchetti", initial: "Z", timestamp: "OCT 20, 10:00" },
        activeLabel: "Completed",
      }),
      metadata: {
        designersShowcased: 28,
        duration: "6 weeks",
        visitorsTotal: 4800,
        pressFeatures: ["Dezeen", "It's Nice That", "Wallpaper*"],
        riskLevel: "low",
        lastUpdatedBy: "Kai Nakamura",
      },
      authors: { create: [
        { name: "Kai Nakamura", role: "Lead Curator",    initial: "K", isPrimary: true },
        { name: "Nina Vasquez", role: "Co-Curator",      initial: "N", isPrimary: false },
      ]},
      tags: { create: [{ label: "Completed" }, { label: "Graduate" }, { label: "Sustainability" }] },
    },
  });

  console.log(`DEMO org seeded: 4 departments, ${DEMO_DEFS.length} users, 8 proposals ✓`);
}

/* ── DUMMY Org Seed ──────────────────────────────────────────── */

async function seedDummy() {
  console.log("Seeding DUMMY org…");

  // ── 1. Find or create org ────────────────────────────────────
  let org = await prisma.organization.findFirst({ where: { name: "Dummy" } });
  if (!org) {
    org = await prisma.organization.create({ data: { name: "Dummy" } });
  }
  const orgId = org.id;

  // ── 2. Clean existing data for this org ─────────────────────
  // Approval chains first (FK on proposals)
  const existingProposalIds = (
    await prisma.proposal.findMany({ where: { orgId }, select: { id: true } })
  ).map((p) => p.id);
  if (existingProposalIds.length) {
    await prisma.proposalApprovalChain.deleteMany({
      where: { proposalId: { in: existingProposalIds } },
    });
  }
  await prisma.proposal.deleteMany({ where: { orgId } });

  // Students
  const existingStudents = await prisma.student.findMany({
    where: { orgId },
    select: { id: true, userId: true },
  });
  for (const s of existingStudents) {
    await prisma.student.delete({ where: { id: s.id } });
    await prisma.user.delete({ where: { id: s.userId } });
  }

  // Dept members + depts
  const existingDepts = await prisma.department.findMany({
    where: { orgId },
    select: { id: true },
  });
  const existingDeptIds = existingDepts.map((d) => d.id);
  if (existingDeptIds.length) {
    await prisma.departmentMember.deleteMany({
      where: { departmentId: { in: existingDeptIds } },
    });
  }
  await prisma.department.deleteMany({ where: { orgId } });

  // Org members + users
  const existingOrgMembers = await prisma.orgMember.findMany({
    where:  { orgId, userId: { not: null } },
    select: { userId: true },
  });
  const existingUserIds = existingOrgMembers.map((m) => m.userId!);
  await prisma.orgMember.deleteMany({ where: { orgId } });
  if (existingUserIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: existingUserIds }, email: { endsWith: "@dummy.seed" } } });
  }

  // ── 3. Create departments (5 default + 2 extra) ──────────────
  const deptNames = [
    { name: "Finance",           protocol: "STANDARD"   as const },
    { name: "On-site Execution", protocol: "STANDARD"   as const },
    { name: "Creative Design",   protocol: "STANDARD"   as const },
    { name: "Marketing",         protocol: "STANDARD"   as const },
    { name: "Council",           protocol: "RESTRICTED" as const },
    { name: "Technology",        protocol: "STANDARD"   as const },
    { name: "Media Relations",   protocol: "STANDARD"   as const },
  ];
  const depts: Record<string, string> = {};
  for (const d of deptNames) {
    const created = await prisma.department.create({ data: { ...d, orgId } });
    depts[d.name] = created.id;
  }

  // ── 4. Create org members ────────────────────────────────────
  type StaffDef = {
    first: string; last: string;
    orgRole: OrgRole;
    depts: { name: string; role: MemberRole; clearance: Clearance }[];
  };

  const staffDefs: StaffDef[] = [
    // President
    { first: "Aryan",    last: "Kapoor",    orgRole: "PRESIDENT",
      depts: [{ name: "Council",           role: "HEAD",   clearance: "OMEGA" }] },
    // Dept heads
    { first: "Meera",    last: "Iyer",      orgRole: "HEAD_FINANCE",
      depts: [{ name: "Finance",           role: "HEAD",   clearance: "ALPHA" }] },
    { first: "Dev",      last: "Sharma",    orgRole: "HEAD_LOGISTICS",
      depts: [{ name: "On-site Execution", role: "HEAD",   clearance: "ALPHA" }] },
    { first: "Pooja",    last: "Nair",      orgRole: "HEAD_CREATIVES",
      depts: [{ name: "Creative Design",   role: "HEAD",   clearance: "ALPHA" }] },
    { first: "Rahul",    last: "Gupta",     orgRole: "HEAD_MARKETING",
      depts: [{ name: "Marketing",         role: "HEAD",   clearance: "ALPHA" }] },
    { first: "Ananya",   last: "Singh",     orgRole: "PROJECT_LEAD",
      depts: [{ name: "Technology",        role: "HEAD",   clearance: "ALPHA" }] },
    { first: "Karan",    last: "Mehta",     orgRole: "PROJECT_LEAD",
      depts: [{ name: "Media Relations",   role: "HEAD",   clearance: "ALPHA" }] },
    // Leads
    { first: "Tanya",    last: "Bose",      orgRole: "ASSOCIATE",
      depts: [{ name: "Finance",           role: "LEAD",   clearance: "BETA"  }] },
    { first: "Vivek",    last: "Rao",       orgRole: "ASSOCIATE",
      depts: [{ name: "On-site Execution", role: "LEAD",   clearance: "BETA"  }] },
    { first: "Isha",     last: "Patel",     orgRole: "ASSOCIATE",
      depts: [{ name: "Creative Design",   role: "LEAD",   clearance: "BETA"  }] },
    { first: "Nikhil",   last: "Verma",     orgRole: "ASSOCIATE",
      depts: [{ name: "Marketing",         role: "LEAD",   clearance: "BETA"  }] },
    // Members
    { first: "Shreya",   last: "Das",       orgRole: "VOLUNTEER",
      depts: [{ name: "Finance",           role: "MEMBER", clearance: "GAMMA" }] },
    { first: "Akash",    last: "Kumar",     orgRole: "VOLUNTEER",
      depts: [{ name: "On-site Execution", role: "MEMBER", clearance: "GAMMA" }] },
    { first: "Divya",    last: "Reddy",     orgRole: "VOLUNTEER",
      depts: [{ name: "Creative Design",   role: "MEMBER", clearance: "GAMMA" }] },
    { first: "Rohan",    last: "Joshi",     orgRole: "VOLUNTEER",
      depts: [{ name: "Marketing",         role: "MEMBER", clearance: "GAMMA" }] },
    { first: "Sana",     last: "Khan",      orgRole: "VOLUNTEER",
      depts: [{ name: "Council",           role: "MEMBER", clearance: "GAMMA" }] },
  ];

  // userId by first+last for later use
  const userIds: Record<string, string> = {};

  for (const def of staffDefs) {
    const email       = `${def.first.toLowerCase()}.${def.last.toLowerCase()}@dummy.seed`;
    const roleLabel   = orgRoleLabel(def.orgRole);
    const displayName = `${roleLabel} - ${def.first} ${def.last}`;

    const user = await prisma.user.create({ data: { name: displayName, email } });
    userIds[`${def.first} ${def.last}`] = user.id;

    await prisma.orgMember.create({
      data: { userId: user.id, name: displayName, email, orgRole: def.orgRole, orgId },
    });

    for (const d of def.depts) {
      await prisma.departmentMember.create({
        data: {
          departmentId: depts[d.name],
          userId:       user.id,
          name:         displayName,
          email,
          role:         d.role,
          clearance:    d.clearance,
        },
      });
    }
  }

  // ── 5. Create dummy students ─────────────────────────────────
  const studentDefs = [
    { first: "Aarav",   last: "Sharma",  number: "2023BCS001", branch: "Computer Science", year: "3rd Year" },
    { first: "Priya",   last: "Patel",   number: "2022ECE042", branch: "Electronics",      year: "4th Year" },
    { first: "Rohan",   last: "Verma",   number: "2024MBA010", branch: "Management",       year: "1st Year" },
    { first: "Sneha",   last: "Gupta",   number: "2023MEC088", branch: "Mechanical Engg",  year: "3rd Year" },
    { first: "Vikram",  last: "Nair",    number: "2022CIV019", branch: "Civil Engineering", year: "4th Year" },
  ];

  const studentIds: Record<string, string> = {}; // "first last" → student.id

  for (const def of studentDefs) {
    const email = `${def.first.toLowerCase()}.${def.last.toLowerCase()}@dummy.student`;
    const user = await prisma.user.create({
      data: { name: `${def.first} ${def.last}`, email, role: "STUDENT" },
    });
    const student = await prisma.student.create({
      data: {
        userId:       user.id,
        name:         `${def.first} ${def.last}`,
        email,
        studentNumber: def.number,
        branch:       def.branch,
        year:         def.year,
        orgId,
      },
    });
    studentIds[`${def.first} ${def.last}`] = student.id;
  }

  // ── 6. Helper: build a student approval chain ────────────────
  // STUDENT_DEPT_ORDER: Finance → On-site Execution → Creative Design → Marketing → Council
  const STUDENT_DEPT_ORDER = [
    "Finance", "On-site Execution", "Creative Design", "Marketing", "Council",
  ];

  type StepStatus = "PENDING" | "ACTIVE" | "APPROVED" | "REJECTED";

  function buildSteps(deptId: string, memberRows: { userId: string | null; name: string; role: MemberRole }[]) {
    const roleOrder: MemberRole[] = ["MEMBER", "LEAD", "HEAD"];
    return roleOrder.map((role) => {
      const members = memberRows
        .filter((m) => m.role === role)
        .map((m) => ({ userId: m.userId, name: m.name, initial: m.name.charAt(0).toUpperCase() }));
      return {
        role,
        label: role === "HEAD" ? "Department Head" : role === "LEAD" ? "Lead Review" : "Member Review",
        members,
        approvals: [] as { userId: string; name: string; approvedAt: string }[],
        status: "PENDING" as StepStatus,
      };
    }).filter((s) => s.members.length > 0);
  }

  async function getDeptMembers(deptName: string) {
    return prisma.departmentMember.findMany({
      where:  { departmentId: depts[deptName] },
      select: { userId: true, name: true, role: true },
    });
  }

  // Build full chain for a proposal, approving depts up to `approvedUpTo` (exclusive)
  // and setting `activeIdx` dept as ACTIVE at step `activeStep`
  async function createStudentChains(
    proposalId: string,
    approvedUpTo: number,  // number of leading depts that are fully APPROVED
    activeDepth: number,   // how many steps are approved within the current (active) dept
  ) {
    for (let i = 0; i < STUDENT_DEPT_ORDER.length; i++) {
      const deptName = STUDENT_DEPT_ORDER[i];
      const deptId   = depts[deptName];
      const members  = await getDeptMembers(deptName);
      const steps    = buildSteps(deptId, members);
      if (steps.length === 0) continue;

      let chainStatus: "ACTIVE" | "APPROVED" | "REJECTED" = "ACTIVE";
      let currentStep = 0;

      if (i < approvedUpTo) {
        // This dept is fully approved
        chainStatus = "APPROVED";
        currentStep = steps.length - 1;
        for (const step of steps) {
          step.status = "APPROVED";
          step.approvals = step.members
            .filter((m) => m.userId)
            .slice(0, 1)
            .map((m) => ({ userId: m.userId!, name: m.name, approvedAt: new Date().toISOString() }));
        }
      } else if (i === approvedUpTo) {
        // This is the active dept
        chainStatus = "ACTIVE";
        currentStep = Math.min(activeDepth, steps.length - 1);
        for (let s = 0; s < steps.length; s++) {
          if (s < activeDepth) {
            steps[s].status = "APPROVED";
            steps[s].approvals = steps[s].members
              .filter((m) => m.userId)
              .slice(0, 1)
              .map((m) => ({ userId: m.userId!, name: m.name, approvedAt: new Date().toISOString() }));
          } else if (s === activeDepth) {
            steps[s].status = "ACTIVE";
          }
        }
      }
      // depts beyond active stay PENDING with no changes

      await prisma.proposalApprovalChain.create({
        data: {
          proposalId,
          departmentId: deptId,
          currentStep,
          status: chainStatus,
          steps,
        },
      });
    }
  }

  // ── 7. Create org proposals ──────────────────────────────────

  await prisma.proposal.create({
    data: {
      orgId,
      type:          ProposalType.EVENT,
      status:        ProposalStatus.APPROVED,
      title:         "Dummy Annual Tech Fest",
      description:   "A two-day technology festival celebrating innovation across AI, robotics, and software. Keynotes, hackathons, and a startup expo.",
      imageGradient: "linear-gradient(135deg, #0d1b2a 0%, #1b3a5c 50%, #0a1520 100%)",
      coverImageUrl: "https://picsum.photos/seed/dummytechfest/800/500",
      dateEst:       "Aug 2026",
      location:      "College Auditorium, Main Campus",
      budget:        150000,
      flowState: makeFlowState({
        submitter: { name: "Aryan Kapoor", initial: "A", timestamp: "MAR 01, 09:00" },
        reviewer:  { name: "Meera Iyer",   initial: "M", timestamp: "MAR 10, 11:00" },
        approver:  { name: "Aryan Kapoor", initial: "A", timestamp: "MAR 15, 14:00" },
        activeLabel: "Approved",
      }),
      metadata: { expectedAttendance: 500, riskLevel: "low", lastUpdatedBy: "Aryan Kapoor" },
      authors: { create: [{ name: "Aryan Kapoor", role: "President", initial: "A", isPrimary: true, userId: userIds["Aryan Kapoor"] }] },
      tags:    { create: [{ label: "Approved" }, { label: "Technology" }, { label: "Annual" }] },
    },
  });

  await prisma.proposal.create({
    data: {
      orgId,
      type:          ProposalType.EVENT,
      status:        ProposalStatus.DRAFT,
      title:         "Freshers Welcome Night",
      description:   "An evening welcome event for incoming first-year students. DJ, food stalls, games, and a campus tour component.",
      imageGradient: "linear-gradient(135deg, #1a0533 0%, #3d0f66 50%, #12031f 100%)",
      dateEst:       "Jul 2026",
      location:      "College Grounds",
      budget:        40000,
      flowState: makeFlowState({
        submitter: { name: "Rahul Gupta", initial: "R", timestamp: "APR 01, 10:00" },
        reviewer:  { name: "Not Assigned", initial: "—", timestamp: "PENDING" },
        approver:  { name: "Not Assigned", initial: "—", timestamp: "PENDING" },
        activeLabel: "Draft Stage",
      }),
      metadata: { expectedAttendance: 300, riskLevel: "low", lastUpdatedBy: "Rahul Gupta" },
      authors: { create: [{ name: "Rahul Gupta", role: "Marketing Head", initial: "R", isPrimary: true, userId: userIds["Rahul Gupta"] }] },
      tags:    { create: [{ label: "Draft" }, { label: "Freshers" }] },
    },
  });

  await prisma.proposal.create({
    data: {
      orgId,
      type:          ProposalType.INTERNAL,
      status:        ProposalStatus.ACTIVE,
      title:         "Campus Media Rebranding",
      description:   "Rebranding the college media presence — new logo, social media templates, and a launch video series.",
      imageGradient: "linear-gradient(135deg, #1f1a0a 0%, #3d3010 50%, #0f0d05 100%)",
      dateEst:       "Jun 2026",
      location:      "Media Lab",
      budget:        25000,
      flowState: makeFlowState({
        submitter: { name: "Karan Mehta", initial: "K", timestamp: "FEB 20, 09:00" },
        reviewer:  { name: "Pooja Nair",  initial: "P", timestamp: "MAR 05, 13:00" },
        approver:  { name: "Aryan Kapoor", initial: "A", timestamp: "MAR 12, 11:00" },
        activeLabel: "In Production",
      }),
      metadata: { internalOnly: true, riskLevel: "low", lastUpdatedBy: "Karan Mehta" },
      authors: { create: [
        { name: "Karan Mehta", role: "Media Relations Head", initial: "K", isPrimary: true,  userId: userIds["Karan Mehta"] },
        { name: "Pooja Nair",  role: "Creative Lead",        initial: "P", isPrimary: false, userId: userIds["Pooja Nair"] },
      ]},
      tags: { create: [{ label: "Active" }, { label: "Internal" }, { label: "Media" }] },
    },
  });

  // ── 8. Create student proposals with approval chains ─────────

  // Student proposal 1: just submitted → Finance chain active at step 0 (MEMBER review)
  const sp1 = await prisma.proposal.create({
    data: {
      orgId,
      studentId:     studentIds["Aarav Sharma"],
      type:          ProposalType.EVENT,
      status:        ProposalStatus.DRAFT,
      title:         "Inter-College Coding Hackathon",
      description:   "A 24-hour hackathon open to all engineering colleges in the city. Participants compete in teams of 4 to build solutions around a surprise theme. Prizes worth ₹50,000.",
      imageGradient: "linear-gradient(135deg, #0a1628 0%, #1a3a5c 50%, #061020 100%)",
      dateEst:       "Sep 2026",
      location:      "Computer Science Block, Lab 3",
      budget:        55000,
      metadata: {
        targetAudience: "Engineering students",
        expectedAttendance: 120,
        potentialSponsors: "TechCorp India, HackerEarth",
        riskLevel: "low",
        lastUpdatedBy: "Aarav Sharma",
      },
      flowState: makeFlowState({
        submitter: { name: "Aarav Sharma", initial: "A", timestamp: "APR 05, 10:00" },
        reviewer:  { name: "Not Assigned", initial: "—", timestamp: "PENDING" },
        approver:  { name: "Not Assigned", initial: "—", timestamp: "PENDING" },
        activeLabel: "Under Review",
      }),
      authors: { create: [{ name: "Aarav Sharma", role: "Student Organiser", initial: "A", isPrimary: true }] },
      tags:    { create: [{ label: "Student" }, { label: "Hackathon" }, { label: "Tech" }] },
    },
  });
  await createStudentChains(sp1.id, 0, 0); // Finance active at MEMBER step

  // Student proposal 2: Finance approved, On-site Execution active at LEAD step
  const sp2 = await prisma.proposal.create({
    data: {
      orgId,
      studentId:     studentIds["Priya Patel"],
      type:          ProposalType.EVENT,
      status:        ProposalStatus.DRAFT,
      title:         "Women in Tech Symposium",
      description:   "A half-day symposium featuring panel discussions, networking, and workshops focused on encouraging women into technology careers. Guest speakers from industry and academia.",
      imageGradient: "linear-gradient(135deg, #2d0a3e 0%, #5c1a6e 50%, #1a0525 100%)",
      dateEst:       "Oct 2026",
      location:      "Seminar Hall B",
      budget:        30000,
      metadata: {
        targetAudience: "Students & Faculty",
        expectedAttendance: 80,
        potentialSponsors: "Google India, WiE IEEE",
        riskLevel: "low",
        lastUpdatedBy: "Priya Patel",
      },
      flowState: makeFlowState({
        submitter: { name: "Priya Patel",  initial: "P", timestamp: "MAR 20, 14:00" },
        reviewer:  { name: "Meera Iyer",   initial: "M", timestamp: "APR 01, 11:00" },
        approver:  { name: "Not Assigned", initial: "—", timestamp: "PENDING" },
        activeLabel: "Under Review",
      }),
      authors: { create: [{ name: "Priya Patel", role: "Student Organiser", initial: "P", isPrimary: true }] },
      tags:    { create: [{ label: "Student" }, { label: "Symposium" }, { label: "Women in Tech" }] },
    },
  });
  await createStudentChains(sp2.id, 1, 1); // Finance approved; On-site active at LEAD step

  // Student proposal 3: Council approved (all approved)
  const sp3 = await prisma.proposal.create({
    data: {
      orgId,
      studentId:     studentIds["Rohan Verma"],
      type:          ProposalType.EVENT,
      status:        ProposalStatus.APPROVED,
      title:         "Annual Business Plan Competition",
      description:   "A two-round business plan competition open to all MBA and BBA students. Round 1 is written submissions; Round 2 is live pitches to a panel of industry judges.",
      imageGradient: "linear-gradient(135deg, #0f2a1a 0%, #1e4a30 50%, #0a1f12 100%)",
      dateEst:       "Nov 2026",
      location:      "Management Block, Seminar Hall",
      budget:        45000,
      metadata: {
        targetAudience: "MBA & BBA students",
        expectedAttendance: 60,
        potentialSponsors: "KPMG, Deloitte India",
        riskLevel: "low",
        lastUpdatedBy: "Rohan Verma",
      },
      flowState: makeFlowState({
        submitter: { name: "Rohan Verma",  initial: "R", timestamp: "FEB 10, 09:00" },
        reviewer:  { name: "Meera Iyer",   initial: "M", timestamp: "FEB 20, 14:00" },
        approver:  { name: "Aryan Kapoor", initial: "A", timestamp: "MAR 01, 10:00" },
        activeLabel: "Approved",
      }),
      authors: { create: [{ name: "Rohan Verma", role: "Student Organiser", initial: "R", isPrimary: true }] },
      tags:    { create: [{ label: "Student" }, { label: "Competition" }, { label: "Business" }] },
    },
  });
  await createStudentChains(sp3.id, STUDENT_DEPT_ORDER.length, 0); // all depts approved

  console.log(`DUMMY org seeded: 7 departments, ${staffDefs.length} staff, ${studentDefs.length} students, 3 org + 3 student proposals ✓`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
