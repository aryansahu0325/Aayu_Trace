import { Navigation } from "@/components/Navigation";
import FamilyManagement from "@/components/FamilyManagement";

const FamilySettings = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Family Sharing</h1>
          <p className="text-muted-foreground mt-2">
            Share household products and expiry tracking with your family members.
          </p>
        </div>
        <FamilyManagement />
      </main>
    </div>
  );
};

export default FamilySettings;