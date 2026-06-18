/**
 * ClinicFlow AI — seed script.
 *
 * Generates demo data: 5 clinics, 50 patients, 50 appointments, 50 calls,
 * 20 missed calls, plus an admin login for each clinic.
 *
 * Usage:
 *   1. Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   2. Apply migrations first (supabase db push / SQL editor).
 *   3. npm run seed
 *
 * This script uses the SERVICE ROLE key and bypasses RLS. Never run it against
 * a database containing real patient data.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Minimal .env.local loader (avoids a dotenv dependency).
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const content = readFileSync(resolve(process.cwd(), file), "utf8");
      for (const line of content.split("\n")) {
        const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      /* file may not exist */
    }
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Helpers ──────────────────────────────────────────────────
const rand = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

function phone() {
  return `+9198${randInt(10000000, 99999999)}`;
}
function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}
function dateInDays(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
function timeSlot() {
  const h = randInt(9, 18);
  const m = rand([0, 30]);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const CLINICS = [
  { name: "Smile Dental Clinic", type: "dental" },
  { name: "HealthFirst Physiotherapy", type: "physio" },
  { name: "GlowSkin Clinic", type: "skin" },
  { name: "ClearView Eye Care", type: "eye" },
  { name: "City Medical Practice", type: "general" },
];

const FIRST = ["Aarav", "Priya", "Rohan", "Ananya", "Vikram", "Sneha", "Arjun", "Kavya", "Rahul", "Meera", "Karan", "Divya", "Aditya", "Pooja", "Sanjay"];
const LAST = ["Sharma", "Patel", "Reddy", "Iyer", "Nair", "Gupta", "Singh", "Mehta", "Rao", "Kapoor"];
const REASONS: Record<string, string[]> = {
  dental: ["Toothache", "Cleaning", "Root canal", "Check-up", "Braces consult"],
  physio: ["Back pain", "Knee rehab", "Sports injury", "Posture review", "Neck pain"],
  skin: ["Acne", "Skin allergy", "Laser consult", "Pigmentation", "Routine check"],
  eye: ["Eye test", "Cataract consult", "Dry eyes", "Glasses fitting", "Redness"],
  general: ["Fever", "General check-up", "Vaccination", "Blood test review", "Cold & cough"],
};
const STATUSES = ["scheduled", "confirmed", "completed", "cancelled", "no_show"] as const;
const SOURCES = ["ai_voice", "missed_call_recovery", "human_callback", "manual"] as const;
const OUTCOMES = ["appointment_booked", "information_requested", "human_transfer", "missed_call", "callback_completed"] as const;

async function main() {
  console.log("Seeding ClinicFlow AI…");

  for (let c = 0; c < CLINICS.length; c++) {
    const def = CLINICS[c];
    const slug = def.name.toLowerCase().replace(/[^a-z]+/g, "");
    const email = `admin@${slug}.com`;

    // Clinic
    const { data: clinic, error: clinicErr } = await db
      .from("clinics")
      .insert({
        name: def.name,
        phone: phone(),
        email,
        address: `${randInt(1, 99)} MG Road, Bengaluru`,
        greeting_message: `Hi! Thanks for calling ${def.name}. How can I help you today?`,
        consultation_fee: rand([300, 500, 700]),
        average_appointment_value: rand([1200, 1500, 1800, 2000]),
      })
      .select("*")
      .single();
    if (clinicErr || !clinic) {
      console.error("clinic insert failed", clinicErr);
      continue;
    }
    console.log(`  ✓ Clinic: ${def.name}`);

    // Admin auth user + profile
    const { data: authUser, error: authErr } = await db.auth.admin.createUser({
      email,
      password: "Password123!",
      email_confirm: true,
    });
    if (authErr) {
      console.warn(`    ! auth user (${email}) — ${authErr.message}`);
    } else if (authUser.user) {
      await db.from("users").insert({
        id: authUser.user.id,
        clinic_id: clinic.id,
        role: "admin",
        full_name: `${rand(FIRST)} ${rand(LAST)}`,
        email,
      });
      console.log(`    ✓ Admin login: ${email} / Password123!`);
    }

    // Patients (10 per clinic = 50 total)
    const patients: { id: string; name: string; phone: string }[] = [];
    for (let i = 0; i < 10; i++) {
      const name = `${rand(FIRST)} ${rand(LAST)}`;
      const { data: p } = await db
        .from("patients")
        .insert({
          clinic_id: clinic.id,
          name,
          phone: phone(),
          email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
          total_calls: randInt(0, 6),
          created_at: isoDaysAgo(randInt(1, 90)),
        })
        .select("id, name, phone")
        .single();
      if (p) patients.push(p);
    }

    // Appointments (10 per clinic = 50 total)
    const usedSlots = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const patient = rand(patients);
      let date = dateInDays(randInt(-30, 20));
      let time = timeSlot();
      let key = `${date}-${time}`;
      let guard = 0;
      while (usedSlots.has(key) && guard++ < 10) {
        date = dateInDays(randInt(-30, 20));
        time = timeSlot();
        key = `${date}-${time}`;
      }
      usedSlots.add(key);

      await db.from("appointments").insert({
        clinic_id: clinic.id,
        patient_id: patient?.id ?? null,
        appointment_date: date,
        appointment_time: time,
        reason: rand(REASONS[def.type]),
        status: rand(STATUSES),
        booking_source: rand(SOURCES),
        estimated_value: Number(clinic.average_appointment_value),
        created_at: isoDaysAgo(randInt(0, 30)),
      });
    }

    // Calls (10 per clinic = 50 total)
    for (let i = 0; i < 10; i++) {
      const patient = rand(patients);
      await db.from("calls").insert({
        clinic_id: clinic.id,
        patient_id: patient?.id ?? null,
        caller_phone: patient?.phone ?? phone(),
        transcript: "AI: Hi! Thanks for calling. How can I help you today?\nCaller: I'd like to book an appointment.",
        duration: randInt(30, 240),
        outcome: rand(OUTCOMES),
        created_at: isoDaysAgo(randInt(0, 30)),
      });
    }

    // Missed calls (4 per clinic = 20 total)
    for (let i = 0; i < 4; i++) {
      const status = rand(["pending", "recovered", "failed"] as const);
      const recovered = status === "recovered";
      await db.from("missed_calls").insert({
        clinic_id: clinic.id,
        caller_phone: phone(),
        missed_at: isoDaysAgo(randInt(0, 20)),
        callback_attempts: status === "pending" ? randInt(0, 1) : randInt(1, 3),
        callback_status: status,
        final_outcome: recovered ? "appointment_booked" : status === "failed" ? "no_answer" : null,
        estimated_revenue: recovered ? Number(clinic.average_appointment_value) : 0,
        revenue_source: "missed_call_recovery",
        next_attempt_at: status === "pending" ? new Date().toISOString() : null,
      });
    }
    console.log(`    ✓ 10 patients, 10 appointments, 10 calls, 4 missed calls`);
  }

  console.log("\nDone! Log in with any admin@<clinic>.com / Password123!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
