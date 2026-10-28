-- AlterTable
ALTER TABLE "Banner" ADD COLUMN "seccion" TEXT NOT NULL DEFAULT 'general',
                     ADD COLUMN "titulo" TEXT,
                     ADD COLUMN "subtitulo" TEXT;

-- CreateIndex
CREATE INDEX "Banner_seccion_activo_orden_idx" ON "Banner"("seccion", "activo", "orden");
