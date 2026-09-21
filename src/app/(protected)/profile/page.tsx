import ProfilePage from "@/features/auth/components/profile-page";
import { PageSuspense } from "@/components/shared/page-suspense";

export const metadata = { title: "My Profile · Club At Ibis Admin" };

export default function Page() {
  return (
    <PageSuspense>
      <ProfilePage />
    </PageSuspense>
  );
}
