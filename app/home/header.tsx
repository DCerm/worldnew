import Image from "next/image";
import { 
  RiInstagramLine, 
  RiYoutubeLine, 
  RiTiktokLine, 
  RiTwitterXLine 
} from "react-icons/ri";

export default function Header() {
    return (
        <>
        <header className="p-2 w-full md:w-4/5 mx-auto rounded-xl relative bg-hero h-[350px] lg:h-[400px] bg-center bg-cover">
            <div className="flex items-center justify-between flex-col sm:flex-row gap-3">
            <button className="bg-white p-2 lg:px-6 border-0 rounded-md w-full sm:w-auto text-center ">
                FRANKE&apos; SOCIALS
            </button>
            <button className="bg-white p-2 lg:px-6 border-0 rounded-md w-full sm:w-auto text-center">
                SHOP POOL BOYZ
            </button>
            </div>
        </header>

        {/* Content Card */}
        <div className="p-4 md:p-6 w-11/12 md:w-4/5 z-20 mx-auto flex flex-col md:flex-row items-center justify-between rounded-lg -mt-12 md:-mt-20 bg-white gap-4 md:gap-6">
            {/* Logo */}
            <div className="flex gap-2 lg:gap-4 items-center">
            <div className="rounded-full border-white border-2 md:border-4 relative w-28 h-28 md:w-48 md:h-48 overflow-hidden">
            <Image
                src="https://res.cloudinary.com/dzfqshhzu/image/upload/v1758472075/worldnew/worldnewbanner_qj2qot.webp"
                alt="logo"
                fill
                className="object-cover rounded-full"
            />
            </div>

            {/* Socials */}
            <div className="flex gap-2 md:gap-3 justify-center md:justify-start">
                <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#001f3f] text-white w-8 h-8 flex items-center justify-center rounded hover:bg-transparent hover:text-[#001f3f] transition"
                >
                    <RiInstagramLine size={18} />
                </a>
        
                <a
                    href="https://youtube.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#001f3f] text-white w-8 h-8 flex items-center justify-center rounded hover:bg-transparent hover:text-[#001f3f] transition"
                >
                    <RiYoutubeLine size={18} />
                </a>
        
                <a
                    href="https://tiktok.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#001f3f] text-white w-8 h-8 flex items-center justify-center rounded hover:bg-transparent hover:text-[#001f3f] transition"
                >
                    <RiTiktokLine size={18} />
                </a>
        
                <a
                    href="https://twitter.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#001f3f] text-white w-8 h-8 flex items-center justify-center rounded hover:bg-transparent hover:text-[#001f3f] transition"
                >
                    <RiTwitterXLine size={18} />
                </a>
            </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col md:flex-row gap-2 md:gap-3 w-full md:w-auto">
            <button className="bg-[#001f3f] text-white p-2 rounded-lg px-3 w-full md:w-auto text-center text-sm">
                Upgrade
            </button>
            <button className="bg-[#001f3f] text-white p-2 rounded-lg px-3 w-full md:w-auto text-center text-sm">
                Stream Franke&apos;
            </button>
            </div>
        </div>
        </>
    )
}