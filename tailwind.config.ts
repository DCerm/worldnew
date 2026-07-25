import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      backgroundImage: {
        'hero' : ' url("https://res.cloudinary.com/dzfqshhzu/image/upload/v1758472075/worldnew/worldnewbanner_qj2qot.webp")',
        'abouthero': ' url("/planet-edge.png")'
        
      },
      fontSize: {
        'sm' : '12px',
        'base' : '15px',
        'md' : '16px',
        'lg' : '17px',
        'xl' : '20px',
        '25px': '25px',
        '30px': '30px',
        
      },
      spacing: {
        'pw-full': 'calc(100vw - 20px)',
        'ph-full': 'calc(100vh - 20px)',
        '10p' : '10%',
        '15p' : '15%',
        '20p' : '20%',
      },
      backgroundColor: {
        'dark' : '#1f1f1f',
        
      }
    },
  },
  plugins: [],
} satisfies Config;
