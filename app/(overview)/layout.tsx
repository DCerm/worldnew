import Menu from '../ui/mainMenu';
import Footer from '../ui/footer';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>

       
      <div className="">
        <Menu />
        {children}
        <Footer />
      </div>
    </>
  );
}
