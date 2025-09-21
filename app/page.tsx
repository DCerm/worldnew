// components/Header.tsx
import Header from "./home/header";
import IntroVideo from "./home/introVideo";
import GetNotified from "./home/getNotified";
import Membership from './home/membership';
import Footer from './home/footer';

export default function Home() {
  return (
    <div className="py-1.5 px-2.5">
      <Header />
      <IntroVideo />
      <GetNotified />
      <Membership />
      <Footer />
    </div>
  );
}
