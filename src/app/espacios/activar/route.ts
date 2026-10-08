import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/context";

/** Cambia el espacio de trabajo activo. Solo acepta espacios a los que el usuario pertenece. */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  const back = new URL("/dashboard", request.url);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.redirect(back, { status: 303 });

  const { data } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).eq("workspace_id", id).maybeSingle();
  const res = NextResponse.redirect(back, { status: 303 });
  if (data) {
    res.cookies.set(ACTIVE_WORKSPACE_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return res;
}
