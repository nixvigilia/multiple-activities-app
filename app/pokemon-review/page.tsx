import {redirect} from "next/navigation";
import {createClient} from "@/utils/supabase/server";
import {PokemonReviewGallery} from "@/components/pokemon-review-gallery";
import {BackButton} from "@/components/back-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {getPokemonWithReviews} from "@/app/actions/pokemon";

export default async function PokemonReviewPage() {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch initial Pokemon on the server
  const {data: initialPokemon} = await getPokemonWithReviews();

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-7xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold">Pokemon Review App</CardTitle>
              <CardDescription>
                Search for Pokemon and share your reviews
              </CardDescription>
            </div>
            <BackButton />
          </div>
        </CardHeader>
        <CardContent>
          <PokemonReviewGallery initialPokemon={initialPokemon || []} />
        </CardContent>
      </Card>
    </div>
  );
}

