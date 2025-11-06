-- CreateTable
CREATE TABLE "pokemon" (
    "id" UUID NOT NULL,
    "pokemon_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "types" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pokemon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pokemon_reviews" (
    "id" UUID NOT NULL,
    "pokemon_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pokemon_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pokemon_pokemon_id_key" ON "pokemon"("pokemon_id");

-- CreateIndex
CREATE UNIQUE INDEX "pokemon_name_key" ON "pokemon"("name");

-- CreateIndex
CREATE INDEX "pokemon_name_idx" ON "pokemon"("name");

-- CreateIndex
CREATE INDEX "pokemon_pokemon_id_idx" ON "pokemon"("pokemon_id");

-- CreateIndex
CREATE INDEX "pokemon_created_at_idx" ON "pokemon"("created_at");

-- CreateIndex
CREATE INDEX "pokemon_reviews_pokemon_id_idx" ON "pokemon_reviews"("pokemon_id");

-- CreateIndex
CREATE INDEX "pokemon_reviews_profile_id_idx" ON "pokemon_reviews"("profile_id");

-- CreateIndex
CREATE INDEX "pokemon_reviews_created_at_idx" ON "pokemon_reviews"("created_at");

-- AddForeignKey
ALTER TABLE "pokemon_reviews" ADD CONSTRAINT "pokemon_reviews_pokemon_id_fkey" FOREIGN KEY ("pokemon_id") REFERENCES "pokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pokemon_reviews" ADD CONSTRAINT "pokemon_reviews_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
