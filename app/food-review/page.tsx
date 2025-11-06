import {redirect} from "next/navigation";
import {createClient} from "@/utils/supabase/server";
import {FoodReviewGallery} from "@/components/food-review-gallery";
import {BackButton} from "@/components/back-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {getFoodPhotos} from "@/app/actions/food-photos";

export default async function FoodReviewPage() {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch initial food photos on the server
  const {data: initialFoodPhotos} = await getFoodPhotos();

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-7xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold">Food Review App</CardTitle>
              <CardDescription>
                Share your food photos and read reviews from others
              </CardDescription>
            </div>
            <BackButton />
          </div>
        </CardHeader>
        <CardContent>
          <FoodReviewGallery initialFoodPhotos={initialFoodPhotos || []} />
        </CardContent>
      </Card>
    </div>
  );
}

