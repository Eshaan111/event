import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Event Society <noreply@eventsociety.org>";

const CLEARANCE_LABELS: Record<string, string> = {
  OMEGA: "Omega — Full System Access",
  ALPHA: "Alpha — Department Admin",
  BETA:  "Beta — Creator",
  GAMMA: "Gamma — Contributor",
  DELTA: "Delta — Read-Only",
};

const ROLE_LABELS: Record<string, string> = {
  HEAD:     "Department Head",
  LEAD:     "Lead",
  MEMBER:   "Member",
  OBSERVER: "Observer",
};

export async function sendDepartmentInvite({
  to,
  inviteeName,
  departmentName,
  role,
  clearance,
  inviteUrl,
  expiresAt,
}: {
  to: string;
  inviteeName?: string | null;
  departmentName: string;
  role: string;
  clearance: string;
  inviteUrl: string;
  expiresAt: Date;
}) {
  const greeting = inviteeName ? `Hi ${inviteeName},` : "Hi,";
  const roleLabel      = ROLE_LABELS[role]      ?? role;
  const clearanceLabel = CLEARANCE_LABELS[clearance] ?? clearance;
  const expiry = expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Invitation — Event Society</title>
  <style>
    body { margin:0; padding:0; background:#f8faf9; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#2a3434; }
    .wrapper { max-width:560px; margin:48px auto; background:#ffffff; border:1px solid rgba(169,180,179,0.2); border-radius:16px; overflow:hidden; }
    .header { background:#40665a; padding:32px 40px; }
    .header h1 { margin:0; color:#defff2; font-size:22px; font-weight:700; letter-spacing:-0.02em; }
    .header p  { margin:6px 0 0; color:rgba(222,255,242,0.65); font-size:11px; letter-spacing:0.15em; text-transform:uppercase; }
    .body { padding:40px; }
    .greeting { font-size:16px; color:#2a3434; margin:0 0 20px; }
    .intro { font-size:14px; line-height:1.7; color:#576160; margin:0 0 28px; }
    .card { background:#f0f4f3; border-radius:12px; padding:24px 28px; margin:0 0 28px; }
    .card-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(169,180,179,0.15); }
    .card-row:last-child { border-bottom:none; padding-bottom:0; }
    .card-label { font-size:10px; text-transform:uppercase; letter-spacing:0.15em; font-weight:700; color:#576160; }
    .card-value { font-size:13px; font-weight:600; color:#2a3434; text-align:right; }
    .cta { display:block; width:100%; box-sizing:border-box; background:linear-gradient(135deg,#40665a,#345a4e); color:#defff2; text-decoration:none; font-size:13px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; text-align:center; padding:18px 32px; border-radius:12px; margin:0 0 28px; }
    .expiry { font-size:11px; color:#a9b4b3; text-align:center; margin:0 0 28px; }
    .footer { border-top:1px solid rgba(169,180,179,0.15); padding:24px 40px; background:#f8faf9; }
    .footer p { margin:0; font-size:11px; color:#a9b4b3; line-height:1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Event Society</h1>
      <p>Structural Interface · Department Invitation</p>
    </div>
    <div class="body">
      <p class="greeting">${greeting}</p>
      <p class="intro">
        You have been invited to join <strong>${departmentName}</strong> within the Event Society organisational structure.
        Your seat has been provisioned with the following permissions.
      </p>
      <div class="card">
        <div class="card-row">
          <span class="card-label">Department</span>
          <span class="card-value">${departmentName}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Role</span>
          <span class="card-value">${roleLabel}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Clearance</span>
          <span class="card-value">${clearanceLabel}</span>
        </div>
      </div>
      <a href="${inviteUrl}" class="cta">Accept Invitation →</a>
      <p class="expiry">This invitation expires on ${expiry}.</p>
    </div>
    <div class="footer">
      <p>
        If you did not expect this invitation, you can safely ignore this email.<br/>
        © Event Society · Structural Interface
      </p>
    </div>
  </div>
</body>
</html>`;

  await resend.emails.send({
    from:    FROM_ADDRESS,
    to,
    subject: `You've been invited to join ${departmentName} — Event Society`,
    html,
  });
}
