import Link from "next/link";
import {
  RiGiftLine,
  RiMessage3Line,
  RiMusicLine,
  RiShakeHandsFill,
} from "react-icons/ri";

const offerings = [
  {
    title: "Exclusive Music",
    description: "Hear unreleased tracks and alternate versions before public drops.",
    icon: RiMusicLine,
  },
  {
    title: "Have Your Say",
    description: "Vote in polls, share feedback, and shape upcoming releases.",
    icon: RiMessage3Line,
  },
  {
    title: "Giveaways",
    description: "Access member-only merch drops, ticket opportunities, and rewards.",
    icon: RiGiftLine,
  },
  {
    title: "Real Community",
    description: "Build real connections with fans who share your energy and values.",
    icon: RiShakeHandsFill,
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-stone-950 text-white">
      <section className="mx-auto w-full max-w-7xl px-6 py-14">
        <div className="rounded-[2rem] border border-stone-800 bg-gradient-to-r from-[#F839A9]/20 via-stone-900 to-stone-950 p-8 shadow-2xl lg:p-12">
          <p className="text-xs uppercase tracking-[0.35em] text-[#80c8ff]">About World. New.</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight lg:text-5xl">
            A music community built for connection, not just consumption.
          </h1>
          <p className="mt-5 max-w-3xl text-base text-stone-300 lg:text-lg">
            World. New. is where the artist journey and community journey move together.
            You get closer to the music, closer to the process, and closer to people who
            genuinely care about growth, creativity, and shared momentum.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-6 pb-8 md:grid-cols-2 xl:grid-cols-4">
        {offerings.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.title}
              className="rounded-[1.5rem] border border-stone-800 bg-stone-900/80 p-6 shadow-sm"
            >
              <div className="mb-4 inline-flex rounded-full border border-[#F839A9]/40 bg-[#F839A9]/10 p-3 text-[#F839A9]">
                <Icon className="text-2xl" />
              </div>
              <h2 className="text-xl font-semibold">{item.title}</h2>
              <p className="mt-3 text-sm text-stone-300">{item.description}</p>
            </article>
          );
        })}
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-6 pb-16 lg:grid-cols-2">
        <article className="rounded-[1.75rem] border border-stone-800 bg-stone-900 p-7">
          <h3 className="text-2xl font-semibold">Free and Paid Memberships</h3>
          <p className="mt-3 text-sm text-stone-300">
            Free members stay connected with updates and conversation. Paid members unlock premium
            releases, deeper artist content, and priority access experiences.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-stone-700 bg-stone-950 p-4">
              <p className="text-sm font-semibold text-stone-100">Free</p>
              <p className="mt-2 text-sm text-stone-400">Community updates, selected discussions, and previews.</p>
            </div>
            <div className="rounded-xl border border-[#F839A9]/40 bg-[#F839A9]/10 p-4">
              <p className="text-sm font-semibold text-white">Paid</p>
              <p className="mt-2 text-sm text-stone-200">Exclusive tracks, behind-the-scenes, and premium access.</p>
            </div>
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-stone-800 bg-stone-900 p-7">
          <h3 className="text-2xl font-semibold">Why Join?</h3>
          <p className="mt-3 text-sm text-stone-300">
            Because music is better when you are part of the story. World. New. gives fans
            a place to participate, not just observe.
          </p>
          <p className="mt-5 rounded-xl border border-stone-700 bg-stone-950 p-4 text-sm text-stone-200">
            Welcome to World. New. where music meets community.
          </p>
          <div className="mt-5">
            <Link
              href="/register"
              className="inline-flex rounded-full bg-[#F839A9] px-5 py-2 text-sm font-semibold text-white hover:bg-[#F839A9]"
            >
              Join The Community
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
