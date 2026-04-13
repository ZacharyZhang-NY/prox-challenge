import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getVisualAssetById } from "@/lib/knowledge/visuals";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const asset = getVisualAssetById(id);

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // asset.path is relative to public/, e.g. "manual-pages/owners_manual/page_08.png"
  const filePath = join(process.cwd(), "public", asset.path);

  if (!existsSync(filePath)) {
    return NextResponse.json(
      { error: "File not found", path: asset.path },
      { status: 404 }
    );
  }

  const buffer = readFileSync(filePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
