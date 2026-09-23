import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { disabled?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // no body means "revoke" (disable) by default
  }

  const disabled = typeof body.disabled === "boolean" ? body.disabled : true;

  try {
    const app = await prisma.app.update({
      where: { id: params.id },
      data: { disabled },
    });

    return NextResponse.json({
      success: true,
      app: { id: app.id, name: app.name, disabled: app.disabled },
    });
  } catch {
    return NextResponse.json({ success: false, error: "App not found" }, { status: 404 });
  }
}
