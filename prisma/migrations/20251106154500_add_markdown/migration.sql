-- CreateTable
CREATE TABLE "notes" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notes_profile_id_idx" ON "notes"("profile_id");

-- CreateIndex
CREATE INDEX "notes_created_at_idx" ON "notes"("created_at");

-- CreateIndex
CREATE INDEX "notes_title_idx" ON "notes"("title");

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
