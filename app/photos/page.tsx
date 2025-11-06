import {redirect} from "next/navigation";
import {createClient} from "@/utils/supabase/server";
import {PhotoGallery} from "@/components/photo-gallery";
import {BackButton} from "@/components/back-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {getPhotos} from "@/app/actions/photos";

export default async function PhotosPage() {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch initial photos on the server
  const {data: initialPhotos} = await getPhotos();

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-7xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold">Photo Gallery</CardTitle>
              <CardDescription>
                Upload, manage, and organize your photos
              </CardDescription>
            </div>
            <BackButton />
          </div>
        </CardHeader>
        <CardContent>
          <PhotoGallery initialPhotos={initialPhotos || []} />
        </CardContent>
      </Card>
    </div>
  );
}

