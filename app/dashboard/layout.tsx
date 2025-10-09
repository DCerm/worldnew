'use client';
import Link from "next/link";
import { useState, useEffect } from "react";
import { RiHome4Line, RiAlbumLine, RiUser2Line, RiChat3Line, RiMusic2Line, RiDoorOpenLine, RiDoorClosedLine, RiNotification3Line } from "react-icons/ri";

export default function RootLayout({children,}: Readonly<{children: React.ReactNode;}>) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const toggleSidebar = () => setSidebarOpen((prev) => !prev);
    
    const handleResize = () => {
    const mobile = window.innerWidth < 1024; // lg breakpoint
    setIsMobile(mobile);
    if (mobile) setSidebarOpen(false);
    };

    useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    }, []);


    return (
        <>
        <div className="flex lg:-space-x-4 min-h-screen bg-gray-100 text-gray-900">
            {/* Sidebar */}
            <aside
                className={`bg-black text-white flex flex-col rounded-r-2xl fixed lg:relative z-40 h-screen transition-all duration-300 
                ${
                    isMobile
                    ? sidebarOpen
                        ? "w-64 left-0"
                        : "w-0 -left-64"
                    : sidebarOpen
                    ? "w-64"
                    : "w-24"
                }`}
            >
                {/* Header + Toggle for desktop */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                {sidebarOpen && !isMobile && (
                    <span className="text-xl font-bold hidden lg:block">Dashboard</span>
                )}
                <button
                    onClick={toggleSidebar}
                    className="text-white text-xl hidden lg:block"
                >
                    {sidebarOpen ? (
                    <RiDoorOpenLine />
                    ) : (
                    <RiDoorClosedLine />
                    )}
                </button>
                </div>
        
                {/* Nav links */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                <Link
                    href="/dashboard"
                    className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700"
                >
                    <RiHome4Line />
                    {(sidebarOpen || isMobile) && <span>Overview</span>}
                </Link>
                <Link
                    href="/media"
                    className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700"
                >
                    <RiMusic2Line />
                    {(sidebarOpen || isMobile) && <span>Music + Videos</span>}
                </Link>
                <Link
                    href="#"
                    className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700"
                >
                    <RiChat3Line />
                    {(sidebarOpen || isMobile) && <span>Chat / Forum</span>}
                </Link>
                <Link
                    href="#"
                    className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700"
                >
                    <RiUser2Line />
                    {(sidebarOpen || isMobile) && <span>Profile</span>}
                </Link>
                <Link
                    href="/dashboard/music"
                    className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700"
                >
                    <RiAlbumLine />
                    {(sidebarOpen || isMobile) && <span>Audio Albums</span>}
                </Link>
                </nav>
        
                {/* Footer */}
                <div className="p-4 border-t border-gray-700">
                <button className="w-full flex items-center space-x-2 text-red-500 bg-gray-800 p-2 rounded hover:bg-gray-700">
                    <i className="ri-logout-box-line"></i>
                    {(sidebarOpen || isMobile) && <span>Log out</span>}
                </button>
                </div>
            </aside>
    
            {/* Overlay for mobile */}
            {sidebarOpen && isMobile && (
                <div
                className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                onClick={toggleSidebar}
                ></div>
            )}

            {/* Main Content */}
            <div
                className={`flex flex-col flex-1 transition-all duration-300 ${
                isMobile ? "" : sidebarOpen ? "lg:ml-64" : "lg:ml-24"
                }`}
            >
                {/* Mobile Header */}
                <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white shadow">
                <button onClick={toggleSidebar} className="text-2xl">
                    <i className="ri-menu-line"></i>
                </button>
                <div className="flex items-center space-x-4">
                    <button className="text-2xl">
                    <RiNotification3Line />
                    </button>
                    <img
                    src="https://res.cloudinary.com/dzfqshhzu/image/upload/v1758472075/worldnew/worldnewbanner_qj2qot.webp"
                    alt="profile"
                    className="w-8 h-8 rounded-full border"
                    />
                </div>
                </header>

                <div className="">{children}</div>
            </div>
        </div>
        </>
    )
}