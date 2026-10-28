-- AlterTable
ALTER TABLE "Banner" ADD COLUMN IF NOT EXISTS "seccion" TEXT NOT NULL DEFAULT 'general',
                     ADD COLUMN IF NOT EXISTS "titulo" TEXT,
                     ADD COLUMN IF NOT EXISTS "subtitulo" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Banner_seccion_activo_orden_idx" ON "Banner"("seccion", "activo", "orden");
