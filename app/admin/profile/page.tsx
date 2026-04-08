import { updateGlobalCoverAction, updateProfileAction } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import {
  DEFAULT_PROFILE_COVER_URL,
  getGlobalProfileCoverUrl,
} from "@/lib/data";

export default async function AdminProfilePage() {
  const user = await requireAdmin();
  const globalCoverUrl = await getGlobalProfileCoverUrl();
  const profileCoverUrl =
    globalCoverUrl ?? user.coverImageUrl ?? DEFAULT_PROFILE_COVER_URL;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-2 py-4 md:px-4">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-stone-950">Artist Profile</h1>
        <p className="mt-2 text-sm text-stone-500">
          Update your profile picture and artist details used across the dashboard.
        </p>

        <form action={updateProfileAction} className="mt-6 space-y-4">
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
          <input
            name="avatarUrl"
            defaultValue={user.avatarUrl ?? ""}
            placeholder="Profile picture URL"
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm"
          />
          <button className="rounded-full bg-[#0091ff] px-5 py-2 text-sm font-semibold text-white">
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
          <input
            name="globalCoverImageUrl"
            defaultValue={globalCoverUrl ?? ""}
            placeholder="Global cover image URL"
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm"
          />
          <button className="rounded-full bg-[#0091ff] px-5 py-2 text-sm font-semibold text-white">
            Save global cover
          </button>
        </form>
      </section>
    </main>
  );
}
