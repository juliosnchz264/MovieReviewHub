import { Suspense } from "react";
import { ProfileRedirect } from "./ProfileRedirect";

export default function ProfileRedirectPage() {
  return (
    <Suspense fallback={null}>
      <ProfileRedirect />
    </Suspense>
  );
}
