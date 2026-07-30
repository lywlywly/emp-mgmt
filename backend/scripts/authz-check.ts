/**
 * Authorization review (Phase 7): systematic broken-access-control probes.
 *
 * Seeds temp data, exercises every protected surface via HTTP, prints the
 * actual status code per scenario, then deletes all its test data.
 *
 * Run against a running server:
 *   node --env-file=.env --import tsx src/index.ts        # in one shell
 *   node --env-file=.env --import tsx scripts/authz-check.ts   # in another
 */
import mongoose from "mongoose";
import { UserModel } from "../src/models/User";
import { OnboardingApplicationModel } from "../src/models/OnboardingApplication";
import { EmployeeProfileModel } from "../src/models/EmployeeProfile";
import { OptWorkflowModel } from "../src/models/OptWorkflow";
import { FileMetadataModel } from "../src/models/FileMetadata";
import { hashPassword } from "../src/auth/password";

const BASE = process.env.AUTHZ_BASE ?? "http://localhost:4000";
const USERNAMES = ["authz_hr", "authz_a", "authz_b"];

let passed = 0;
let failed = 0;
function check(name: string, actual: number, expected: number | number[]) {
  const exp = Array.isArray(expected) ? expected : [expected];
  const ok = exp.includes(actual);
  if (ok) passed++;
  else failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  [${actual}]  ${name}${ok ? "" : `  (expected ${exp.join("/")})`}`);
}

// ---- HTTP helpers --------------------------------------------------------
async function login(username: string, password: string): Promise<string> {
  const r = await fetch(`${BASE}/trpc/auth.login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const sc = r.headers.get("set-cookie");
  if (!sc) throw new Error(`login failed for ${username} (status ${r.status})`);
  return sc.split(";")[0];
}
const hdr = (cookie: string | null): Record<string, string> => (cookie ? { Cookie: cookie } : {});

async function query(path: string, cookie: string | null, input?: unknown): Promise<number> {
  let url = `${BASE}/trpc/${path}`;
  if (input !== undefined) url += `?input=${encodeURIComponent(JSON.stringify(input))}`;
  return (await fetch(url, { headers: hdr(cookie) })).status;
}
async function mutation(path: string, cookie: string | null, body: unknown): Promise<number> {
  return (
    await fetch(`${BASE}/trpc/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...hdr(cookie) },
      body: JSON.stringify(body ?? {}),
    })
  ).status;
}
async function httpGet(pathname: string, cookie: string | null): Promise<number> {
  return (await fetch(`${BASE}${pathname}`, { headers: hdr(cookie) })).status;
}
async function uploadRaw(cookie: string, mime: string, filename: string, bytes: Uint8Array): Promise<{ status: number; id?: string }> {
  const fd = new FormData();
  fd.append("file", new Blob([bytes], { type: mime }), filename);
  const r = await fetch(`${BASE}/files`, { method: "POST", headers: hdr(cookie), body: fd });
  const j = (await r.json().catch(() => ({}))) as { id?: string };
  return { status: r.status, id: j.id };
}
const pdfBytes = () => new TextEncoder().encode("%PDF-1.4\ntrailer<</Root 1 0 R>>\n%%EOF");

// ---- Seed ----------------------------------------------------------------
const personal = (email: string, first: string, last: string) => ({
  firstName: first, lastName: last,
  address: { building: "1", street: "S", city: "C", state: "MA", zip: "02115" },
  cellPhone: "1", email, ssn: "1", dateOfBirth: new Date("1998-01-01"), gender: "male",
  reference: { firstName: "R", lastName: "R", relationship: "P" },
  emergencyContacts: [{ firstName: "E", lastName: "E", relationship: "S" }],
  isPermanentResidentOrCitizen: false,
});

async function cleanup() {
  const users = await UserModel.find({ username: { $in: USERNAMES } }).lean();
  const ids = users.map((u) => u._id);
  const files = await FileMetadataModel.find({ uploadedBy: { $in: ids } }).lean();
  const fs = await import("node:fs");
  const path = await import("node:path");
  for (const f of files) {
    try { fs.unlinkSync(path.resolve(f.path)); } catch { /* ignore */ }
  }
  await OnboardingApplicationModel.deleteMany({ user: { $in: ids } });
  await EmployeeProfileModel.deleteMany({ user: { $in: ids } });
  await OptWorkflowModel.deleteMany({ user: { $in: ids } });
  await FileMetadataModel.deleteMany({ uploadedBy: { $in: ids } });
  await UserModel.deleteMany({ _id: { $in: ids } });
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  try {
    await cleanup();
    await UserModel.create({ username: "authz_hr", email: "hr@authz.test", password: await hashPassword("pw"), role: "hr" });
    const a = await UserModel.create({ username: "authz_a", email: "a@authz.test", password: await hashPassword("pw"), role: "employee" });
    const b = await UserModel.create({ username: "authz_b", email: "b@authz.test", password: await hashPassword("pw"), role: "employee" });

    // A: approved F1 employee with an OPT workflow whose Receipt is approved.
    const receipt = await FileMetadataModel.create({ filename: "r.pdf", originalName: "r.pdf", mimetype: "application/pdf", path: "uploads/authz-r.pdf", size: 10, uploadedBy: a._id });
    await OnboardingApplicationModel.create({ user: a._id, status: "approved", ...personal("a@authz.test", "Aaa", "Aaa"), workAuthorization: { type: "F1(CPT/OPT)", startDate: new Date("2024-01-01"), endDate: new Date(Date.now() + 90 * 86400000) }, documents: { optReceipt: receipt._id } });
    await EmployeeProfileModel.create({ user: a._id, ...personal("a@authz.test", "Aaa", "Aaa"), workAuthorization: { type: "F1(CPT/OPT)", startDate: new Date("2024-01-01"), endDate: new Date(Date.now() + 90 * 86400000) }, documents: { optReceipt: receipt._id } });
    await OptWorkflowModel.create({ user: a._id, optReceipt: { status: "approved", file: receipt._id } });
    // B: rejected application, so B is allowed to (re)submit.
    await OnboardingApplicationModel.create({ user: b._id, status: "rejected", ...personal("b@authz.test", "Bbb", "Bbb"), residencyType: "citizen", isPermanentResidentOrCitizen: true });

    const cookA = await login("authz_a", "pw");
    const cookB = await login("authz_b", "pw");
    const cookHr = await login("authz_hr", "pw");
    const fileA = (await uploadRaw(cookA, "application/pdf", "a.pdf", pdfBytes())).id!;
    const fileB = (await uploadRaw(cookB, "application/pdf", "b.pdf", pdfBytes())).id!;

    const residentBody = (pic: string) => ({ ...personal("ignored@x.test", "Bbb", "Bbb"), dateOfBirth: "1998-01-01", isPermanentResidentOrCitizen: true, residencyType: "citizen", profilePicture: pic });

    console.log("\n### Part 1 — upload error codes (authenticated) ###");
    check("upload disallowed type (text/plain) -> 400", (await uploadRaw(cookA, "text/plain", "x.txt", new TextEncoder().encode("hi"))).status, 400);
    check("upload > 10MB -> 413", (await uploadRaw(cookA, "application/pdf", "big.pdf", new Uint8Array(11 * 1024 * 1024))).status, 413);

    console.log("\n### 1) Unauthenticated (no cookie) -> 401 ###");
    for (const p of ["onboarding.getMine", "opt.getMine", "profile.getMine"]) check(`query ${p}`, await query(p, null), 401);
    for (const p of ["onboarding.submit", "opt.uploadNext", "profile.updateSection"]) check(`mutation ${p}`, await mutation(p, null, {}), 401);
    for (const p of ["invitation.list", "onboarding.listByStatus", "hr.listEmployees", "hr.visaInProgress"]) check(`hr query ${p}`, await query(p, null), 401);
    for (const p of ["invitation.generateAndSend", "onboarding.review", "opt.review", "hr.sendNotification"]) check(`hr mutation ${p}`, await mutation(p, null, {}), 401);
    check("files upload", (await uploadRaw("", "application/pdf", "x.pdf", pdfBytes())).status, 401);
    check("files preview", await httpGet(`/files/${fileA}/preview`, null), 401);
    check("files download", await httpGet(`/files/${fileA}/download`, null), 401);
    check("template download", await httpGet(`/templates/i983/empty`, null), 401);

    console.log("\n### 2) Employee -> HR-only -> 403 ###");
    check("hr.listEmployees", await query("hr.listEmployees", cookA), 403);
    check("hr.getEmployeeProfile(B)", await query("hr.getEmployeeProfile", cookA, { userId: String(b._id) }), 403);
    check("hr.searchEmployees", await query("hr.searchEmployees", cookA, { query: "a" }), 403);
    check("hr.visaInProgress", await query("hr.visaInProgress", cookA), 403);
    check("hr.visaAll", await query("hr.visaAll", cookA, {}), 403);
    check("hr.sendNotification", await mutation("hr.sendNotification", cookA, { userId: String(b._id) }), 403);
    check("invitation.list", await query("invitation.list", cookA), 403);
    check("invitation.generateAndSend", await mutation("invitation.generateAndSend", cookA, { email: "x@y.z", name: "x" }), 403);
    check("onboarding.listByStatus", await query("onboarding.listByStatus", cookA, { status: "pending" }), 403);
    check("onboarding.getById(other)", await query("onboarding.getById", cookA, { id: String(b._id) }), 403);
    check("onboarding.review", await mutation("onboarding.review", cookA, { id: String(b._id), decision: "approve" }), 403);
    check("opt.review(B)", await mutation("opt.review", cookA, { userId: String(b._id), step: "optReceipt", decision: "approve" }), 403);

    console.log("\n### 3) Cross-user (server-enforced) ###");
    check("A previews B's file -> 403", await httpGet(`/files/${fileB}/preview`, cookA), 403);
    check("A downloads B's file -> 403", await httpGet(`/files/${fileB}/download`, cookA), 403);
    check("A previews OWN file -> 200 (control)", await httpGet(`/files/${fileA}/preview`, cookA), 200);
    check("HR previews B's file -> 200 (control)", await httpGet(`/files/${fileB}/preview`, cookHr), 200);
    check("B submit referencing A's file id -> 403", await mutation("onboarding.submit", cookB, residentBody(fileA)), 403);
    check("B submit referencing OWN file id -> 200 (control)", await mutation("onboarding.submit", cookB, residentBody(fileB)), 200);
    check("A opt.uploadNext with B's file id -> 403", await mutation("opt.uploadNext", cookA, { step: "optEad", fileId: fileB }), 403);
    check("A opt.uploadNext with OWN file id -> 200 (control)", await mutation("opt.uploadNext", cookA, { step: "optEad", fileId: fileA }), 200);
    check("A opt.review targeting B (hr-only) -> 403", await mutation("opt.review", cookA, { userId: String(b._id), step: "optReceipt", decision: "approve" }), 403);

    console.log("\nNote: there is no employee-facing endpoint that reads another user's profile by id");
    console.log("      (profile.getMine is self-scoped; getEmployeeProfile is hrProcedure).");
    console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  } finally {
    await cleanup();
    await mongoose.disconnect();
  }
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
