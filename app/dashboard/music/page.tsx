'use client';


export default function AllMusicPage() {
  const songs = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
        <div className="w-full bg-dark h-screen overflow-y-scroll">
        <main className="flex-1 rounded-lg bg-dark text-white p-6 w-4/5 mx-auto mt-8 w-full">
            <h1 className="text-30px font-bold mb-6">All Music</h1>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {songs.map((i) => (
                <div
                key={i}
                className="bg-gray-800 rounded-lg overflow-hidden hover:scale-105 transition-transform cursor-pointer"
                >
                <img
                    src={`https://picsum.photos/200/200?random=${i}`}
                    alt={`Song ${i}`}
                    className="w-full h-40 object-cover"
                />
                <div className="p-2">
                    <h3 className="font-semibold text-sm">Song {i}</h3>
                    <p className="text-xs text-gray-400">Artist {i}</p>
                </div>
                </div>
            ))}
            </div>
        </main>
        </div>
  );
}