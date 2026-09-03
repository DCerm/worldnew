import {
  updateGlobalCoverAction,
  updatePasswordAction,
  updateProfileAction,
} from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import {
  DEFAULT_PROFILE_COVER_URL,
  getGlobalProfileCoverUrl,
} from "@/lib/data";
import PasswordField from "@/app/ui/password-field";
import { normalizeOptionalUrl, resolveAvatarUrl } from "@/lib/avatar";

export default async function AdminProfilePage() {
  const user = await requireAdmin();
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
    <main className="mx-auto w-full max-w-3xl space-y-6 px-2 py-4 md:px-4">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-stone-950">Artist Profile</h1>
        <p className="mt-2 text-sm text-stone-500">
          Update your profile picture and artist details used across the dashboard.
        </p>

        <form action={updateProfileAction} className="mt-6 space-y-4">
          <div className="flex items-center gap-4 rounded-2xl border border-[#ffd1e9] bg-[#fff8fc] p-4">
            <img src={profileAvatarUrl} alt="Artist profile picture" className="h-20 w-20 rounded-full object-cover ring-4 ring-white" />
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
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm text-gray-600 placeholder:text-gray-400"
          />
          <textarea
            name="bio"
            defaultValue={user.bio ?? ""}
            rows={4}
            placeholder="Bio"
            className="w-full rounded-3xl border border-stone-200 px-4 py-3 text-sm text-gray-600 placeholder:text-gray-400"
          />
          <button className="rounded-full bg-[#F839A9] px-5 py-2 text-sm font-semibold text-white">
            Save profile
          </button>
        </form>
      </section>

      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-stone-950">Global Cover Picture</h2>
        <p className="mt-2 text-sm text-stone-500">
          This cover image appears on all member and artist profile headers.
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-stone-200">
          <img src={profileCoverUrl} alt="Global cover preview" className="h-44 w-full object-cover" />
        </div>

        <form action={updateGlobalCoverAction} className="mt-4 space-y-3">
          <label className="block text-sm font-semibold text-stone-700">
            Upload global cover image
            <input
              type="file"
              name="globalCoverImageFile"
              accept="image/*"
              className="mt-2 block w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600 file:mr-3 file:rounded-full file:border-0 file:bg-[#F839A9] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
          </label>
          <input
            name="globalCoverImageUrl"
            defaultValue={globalCoverUrl ?? ""}
            placeholder="Global cover image URL"
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm text-gray-600 placeholder:text-gray-400"
          />
          <button className="rounded-full bg-[#F839A9] px-5 py-2 text-sm font-semibold text-white">
            Save global cover
          </button>
        </form>
      </section>

      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-stone-950">Update Password</h2>
        <p className="mt-2 text-sm text-stone-500">
          Set a local app password or rotate your current one.
        </p>

        <form action={updatePasswordAction} className="mt-6 space-y-4">
          <PasswordField
            name="currentPassword"
            placeholder="Current password"
            autoComplete="current-password"
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm text-gray-600 placeholder:text-gray-400"
          />
          <PasswordField
            name="newPassword"
            placeholder="New password"
            autoComplete="new-password"
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm text-gray-600 placeholder:text-gray-400"
          />
          <PasswordField
            name="confirmPassword"
            placeholder="Confirm new password"
            autoComplete="new-password"
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm text-gray-600 placeholder:text-gray-400"
          />
          <button className="rounded-full bg-[#F839A9] px-5 py-2 text-sm font-semibold text-white">
            Update password
          </button>
        </form>
      </section>
    </main>
  );
}
