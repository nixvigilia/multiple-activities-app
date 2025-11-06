import {redirect} from "next/navigation";
import Link from "next/link";
import {createClient} from "@/utils/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {LogoutButton} from "@/components/logout-button";
import {DeleteAccountButton} from "@/components/delete-account-button";
import {
  CheckSquare,
  Image as ImageIcon,
  UtensilsCrossed,
  Sparkles,
} from "lucide-react";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">
            Welcome to Multiple Activities App
          </CardTitle>
          <CardDescription>
            Navigate to activities or manage your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Link href="/todos">
              <Card className="h-full hover:shadow-lg transition-all duration-200 hover:border-primary cursor-pointer group">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                    <CheckSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Activity 1</h3>
                    <p className="text-sm text-muted-foreground">Todo List</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/photos">
              <Card className="h-full hover:shadow-lg transition-all duration-200 hover:border-primary cursor-pointer group">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                    <ImageIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Activity 2</h3>
                    <p className="text-sm text-muted-foreground">
                      Photo Gallery
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/food-review">
              <Card className="h-full hover:shadow-lg transition-all duration-200 hover:border-primary cursor-pointer group">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
                    <UtensilsCrossed className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Activity 3</h3>
                    <p className="text-sm text-muted-foreground">Food Review</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/pokemon-review">
              <Card className="h-full hover:shadow-lg transition-all duration-200 hover:border-primary cursor-pointer group">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30 group-hover:bg-yellow-200 dark:group-hover:bg-yellow-900/50 transition-colors">
                    <Sparkles className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Activity 4</h3>
                    <p className="text-sm text-muted-foreground">
                      Pokemon Review
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
          <div className="flex gap-2 pt-4 border-t">
            <LogoutButton />
            <DeleteAccountButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
