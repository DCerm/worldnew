import { updatePasswordAction, updateProfileAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DEFAULT_PROFILE_COVER_URL, getGlobalProfileCoverUrl } from "@/lib/data";
import PasswordField from "@/app/ui/password-field";
import { normalizeOptionalUrl, resolveAvatarUrl } from "@/lib/avatar";

export default async function DashboardProfilePage() {
  const user = await requireUser();
  if (user.roles.includes("artist_admin") || user.roles.includes("super_admin")) {
    redirect("/admin/profile");
  }

  const globalCoverUrl = await getGlobalProfileCoverUrl();
  const profileCoverUrl =
    normalizeOptionalUrl(globalCoverUrl) ??
    normalizeOptionalUrl(user.coverImageUrl) ??
    DEFAULT_PROFILE_COVER_URL;
  const profileAvatarUrl = resolveAvatarUrl({
    avatarUrl: user.avatarUrl,
    userId: user.id,
    email: user.email,
  });

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 lg:px-8">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-stone-950">Profile</h1>
        <p className="mt-2 text-sm text-stone-500">Update your profile details and profile picture.</p>

        <div className="mt-4 overflow-hidden rounded-xl border border-stone-200">
          <img src={profileCoverUrl} alt="Profile header cover" className="h-40 w-full object-cover" />
        </div>

        <form action={updateProfileAction} className="mt-6 space-y-4">
          <div className="flex items-center gap-4 rounded-2xl border border-[#ffd1e9] bg-[#fff8fc] p-4">
            <img src={profileAvatarUrl} alt="Profile picture" className="h-20 w-20 rounded-full object-cover ring-4 ring-white" />
            <label className="min-w-0 flex-1 text-sm font-semibold text-stone-700">
              Upload profile picture
              <input
                type="file"
                name="avatarFile"
                accept="image/*"
                className="mt-2 block w-full text-sm text-stone-600 file:mr-3 file:rounded-full file:border-0 file:bg-[#F839A9] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
            </label>
          </div>
          <input
            name="displayName"
            defaultValue={user.displayName}
            placeholder="Display name"
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm"
          />
          <textarea
            name="bio"
            defaultValue={user.bio ?? ""}
            rows={4}
            placeholder="Bio"
            className="w-full rounded-3xl border border-stone-200 px-4 py-3 text-sm"
          />
          <button className="rounded-full bg-[#F839A9] px-5 py-2 text-sm font-semibold text-white">Save profile</button>
        </form>
      </section>

      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-stone-950">Update Password</h2>
        <p className="mt-2 text-sm text-stone-500">
          If you signed in with WordPress only, you can set an app password here.
        </p>

        <form action={updatePasswordAction} className="mt-6 space-y-4">
          <PasswordField
            name="currentPassword"
            placeholder="Current password"
            autoComplete="current-password"
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm"
          />
          <PasswordField
            name="newPassword"
            placeholder="New password"
            autoComplete="new-password"
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm"
          />
          <PasswordField
            name="confirmPassword"
            placeholder="Confirm new password"
            autoComplete="new-password"
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm"
          />
          <button className="rounded-full bg-[#F839A9] px-5 py-2 text-sm font-semibold text-white">
            Update password
          </button>
        </form>
      </section>
    </main>
  );
}
