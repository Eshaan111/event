import "dotenv/config";
import { PrismaClient, ProposalType, ProposalStatus, type MemberRole, type Clearance, type OrgRole } from '@prisma/client';
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

  /* 1 ── Met Gala 2026: The Kinetic Silk Road */
  await prisma.proposal.create({
    data: {
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
  first:     string;
  last:      string;
  orgRole:   OrgRole;
  deptKey:   "creative" | "production" | "finance" | "technology";
  deptRole:  MemberRole;
  clearance: Clearance;
};

const MEMBER_DEFS: MemberDef[] = [
  // ── Creative Direction ──────────────────────────────────────
  { first: "Isabelle", last: "Voss",      orgRole: "HEAD_CREATIVES", deptKey: "creative",   deptRole: "HEAD",     clearance: "ALPHA" },
  { first: "Rajan",    last: "Mehta",     orgRole: "PROJECT_LEAD",   deptKey: "creative",   deptRole: "LEAD",     clearance: "BETA"  },
  { first: "Nadia",    last: "Solberg",   orgRole: "ASSOCIATE",      deptKey: "creative",   deptRole: "MEMBER",   clearance: "BETA"  },
  { first: "Felix",    last: "Hartmann",  orgRole: "ASSOCIATE",      deptKey: "creative",   deptRole: "MEMBER",   clearance: "GAMMA" },
  { first: "Chioma",   last: "Adeyemi",   orgRole: "VOLUNTEER",      deptKey: "creative",   deptRole: "OBSERVER", clearance: "DELTA" },

  // ── Production & Logistics ──────────────────────────────────
  { first: "Marco",    last: "Delacroix", orgRole: "HEAD_LOGISTICS", deptKey: "production", deptRole: "HEAD",     clearance: "ALPHA" },
  { first: "Yuna",     last: "Kim",       orgRole: "PROJECT_LEAD",   deptKey: "production", deptRole: "LEAD",     clearance: "BETA"  },
  { first: "Tariq",    last: "AlRashid",  orgRole: "ASSOCIATE",      deptKey: "production", deptRole: "MEMBER",   clearance: "BETA"  },
  { first: "Saoirse",  last: "Murphy",    orgRole: "ASSOCIATE",      deptKey: "production", deptRole: "MEMBER",   clearance: "GAMMA" },
  { first: "Dani",     last: "Reyes",     orgRole: "VOLUNTEER",      deptKey: "production", deptRole: "OBSERVER", clearance: "DELTA" },

  // ── Finance & Strategy ──────────────────────────────────────
  { first: "Priscilla",last: "Okafor",    orgRole: "HEAD_FINANCE",   deptKey: "finance",    deptRole: "HEAD",     clearance: "ALPHA" },
  { first: "Lukas",    last: "Bauer",     orgRole: "SECRETARY",      deptKey: "finance",    deptRole: "LEAD",     clearance: "BETA"  },
  { first: "MeiLing",  last: "Zhou",      orgRole: "ASSOCIATE",      deptKey: "finance",    deptRole: "MEMBER",   clearance: "BETA"  },
  { first: "Arjun",    last: "Patel",     orgRole: "ASSOCIATE",      deptKey: "finance",    deptRole: "MEMBER",   clearance: "GAMMA" },
  { first: "Camille",  last: "Dubois",    orgRole: "VOLUNTEER",      deptKey: "finance",    deptRole: "OBSERVER", clearance: "DELTA" },

  // ── Technology & Innovation ─────────────────────────────────
  { first: "Aleksei",  last: "Volkov",    orgRole: "PRESIDENT",      deptKey: "technology", deptRole: "HEAD",     clearance: "OMEGA" },
  { first: "Hana",     last: "Suzuki",    orgRole: "VICE_PRESIDENT", deptKey: "technology", deptRole: "LEAD",     clearance: "ALPHA" },
  { first: "Kwame",    last: "Asante",    orgRole: "PROJECT_LEAD",   deptKey: "technology", deptRole: "MEMBER",   clearance: "BETA"  },
  { first: "Lena",     last: "Fischer",   orgRole: "ASSOCIATE",      deptKey: "technology", deptRole: "MEMBER",   clearance: "GAMMA" },
  { first: "Omar",     last: "Sharif",    orgRole: "VOLUNTEER",      deptKey: "technology", deptRole: "OBSERVER", clearance: "DELTA" },
];

async function seedMembers() {
  console.log("Seeding departments & members…");

  // ── 1. Wipe existing seed data ────────────────────────────────
  // Approval chains reference departments — delete them first
  await prisma.proposalApprovalChain.deleteMany();

  // Delete departments (cascades DepartmentMember + DepartmentInvite)
  await prisma.department.deleteMany();

  // Delete boilerplate users (and their OrgMembers via cascade SetNull)
  const seedUsers = await prisma.user.findMany({
    where:  { email: { endsWith: "@aetheric.seed" } },
    select: { id: true },
  });
  const seedIds = seedUsers.map((u) => u.id);
  if (seedIds.length > 0) {
    await prisma.orgMember.deleteMany({ where: { userId: { in: seedIds } } });
    await prisma.user.deleteMany({ where: { id: { in: seedIds } } });
  }

  // ── 2. Create 4 departments ───────────────────────────────────
  const [creative, production, finance, technology] = await Promise.all([
    prisma.department.create({ data: { name: "Creative Direction" } }),
    prisma.department.create({ data: { name: "Production & Logistics" } }),
    prisma.department.create({ data: { name: "Finance & Strategy" } }),
    prisma.department.create({ data: { name: "Technology & Innovation" } }),
  ]);

  const deptMap = { creative, production, finance, technology };

  // ── 3. Create users + org memberships + dept memberships ─────
  for (const def of MEMBER_DEFS) {
    const dept      = deptMap[def.deptKey];
    const deptName  = dept.name;
    const roleLabel = orgRoleLabel(def.orgRole);
    // Display name follows the requested convention
    const displayName = `${roleLabel} - ${deptName} - ${def.first} ${def.last}`;
    const email       = slugEmail(def.first, def.last);

    const user = await prisma.user.create({
      data: { name: displayName, email },
    });

    await Promise.all([
      prisma.orgMember.create({
        data: { userId: user.id, name: displayName, email, orgRole: def.orgRole },
      }),
      prisma.departmentMember.create({
        data: {
          departmentId: dept.id,
          userId:       user.id,
          name:         displayName,
          email,
          role:         def.deptRole,
          clearance:    def.clearance,
        },
      }),
    ]);
  }

  console.log(`Seeded 4 departments and ${MEMBER_DEFS.length} members ✓`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
