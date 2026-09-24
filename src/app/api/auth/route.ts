import { clearTeacherCookie, isTeacher, setTeacherCookie, verifyPin } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";

/** GET /api/auth — apakah sesi guru aktif? */
export async function GET() {
  return ok({ teacher: await isTeacher() });
}

/** POST /api/auth — masuk dengan PIN. Body: { pin } */
export async function POST(request: Request) {
  const body = await readJson<{ pin?: string }>(request);
  const pin = typeof body?.pin === "string" ? body.pin : "";

  if (!verifyPin(pin)) {
    return fail(401, "PIN salah.");
  }

  await setTeacherCookie();
  return ok({ teacher: true });
}

/** DELETE /api/auth — keluar. */
export async function DELETE() {
  await clearTeacherCookie();
  return ok({ teacher: false });
}
