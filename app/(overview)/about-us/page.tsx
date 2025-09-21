import Image from "next/image";
import { Slide } from "../ui/animations";
import { H1, H2, H4 } from "../ui/headings";
import { RegistrationForm } from "../ui/forms";
import { FaCertificate, FaChartLine, FaHandshake, FaLeaf } from 'react-icons/fa';


export default function Page() {
    return (
        <>
        <div className="bg-greener py-10 -mt-20" />
        <div className="px-5 py-20 lg:px-0 lg:py-32 bg-green/20 text-whit">
            <div className="lg:pl-10p">
                <H2 className="lg:w-1/2  mb-10" text="Bridging the Gap Between Farmers and Buyers Globally" />
                <p className="lg:w-3/5 text-lg">We make the flow of fresh, high-quality farm produce seamless, 
                    transparent, and profitable for all. We serve as a trusted farm produce aggregator—purchasing directly 
                    from local farmers and connecting them to both local and international buyers.
                </p>
            </div>

            <div className="lg:flex pt-5 lg:p-5 lg:mt-10 gap-4 items-en">
                <div className="p-4 bg-green text-white rounded-xl flex items-center">
                    <h3 className="vtx lg:text-2xl font-bold hidden lg:block">Our Mission:</h3>
                    <h3 className="lg:hidden text-xl text-center font-bold">Our Mission:</h3>
                </div>
                <div className="mt-4 lg:mt-0 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="flex flex-col items-center gap-2 text-white bg-green rounded-xl lg:max-h-[350px] overflow-hidden">
                        <div className=" p-4 text-center">
                            <H4 className="" text="Empower Farmers" />
                            <p className="mt-2.5 text-md">Empower farmers by giving them fair market access and competitive pricing.</p>
                        </div>
                        <Image className="w-full rounded-xl " width={2000} height={1121} 
                            src="https://res.cloudinary.com/dzfqshhzu/image/upload/v1757702109/FarmTrustNetwork/african-people-harvesting-vegetables_23-2151441189_cjfhpu.jpg"
                            alt=""
                        />
                    </div>

                    <div className="flex flex-col items-center gap-2 text-white bg-green rounded-xl lg:max-h-[350px] overflow-hidden">
                        <div className=" p-4 text-center">
                            <H4 className="" text="Supply Fresh Produce" />
                            <p className="mt-2.5 text-md">Support businesses and households with consistent, reliable supply of fresh agricultural produce.</p>
                        </div>
                        <Image className="w-full rounded-xl " width={749} height={1110} 
                            src="https://res.cloudinary.com/dzfqshhzu/image/upload/v1757701152/FarmTrustNetwork/farmer-is-collecting-orange_1150-5723_mhkyuf.jpg"
                            alt=""
                        />
                    </div>

                    <div className="flex flex-col items-center gap-2 text-white bg-green rounded-xl lg:max-h-[350px] overflow-hidden">
                        <div className=" p-4 text-center">
                            <H4 className="" text="Promote Food Security" />
                            <p className="mt-2.5 text-md">Promote food security and sustainable agriculture across communities.</p>
                        </div>
                        <Image className="w-full rounded-xl " width={749} height={1110} 
                            src="https://res.cloudinary.com/dzfqshhzu/image/upload/v1757701489/FarmTrustNetwork/happy-cheerful-african-american-farm-worker-holding-crate-full-local-eco-friendly-ripe-leafy-greens-from-sustainable-crop-harvest-entrepreneurial-bio-permaculture-greenhouse-farm_482257-64585_avturx.jpg"
                            alt=""
                        />
                    </div>

                </div>
            </div>
        </div>



        {/**WHY CHOOSE US           WHY CHOOSE US               WHY CHOOSE US           WHY CHOOSE US */}
        <section className="flex flex-col items-center justify-between bg-sand/20 gap-8 lg:gap-10">
            <H2 className='' text="Why Choose Us?" />
            <div className=" grid grid-cols-2 lg:grid-cols-4 gap-2">
                
                <div className="text-center p-4 lg:p-8 shadow-md bg-white rounded-xl flex flex-col items-center gap-2">
                    <FaCertificate className="text-25px text-green" />
                    <H4 className="" text="Direct Sourcing" />
                    <p className="text-lg">We cut out unnecessary middlemen, ensuring farmers earn more and buyers pay fair prices.</p>
                </div>
                <div className="text-center p-4 lg:p-8 shadow-md bg-white rounded-xl flex flex-col items-center gap-2">
                    <FaHandshake className="text-25px text-green" />
                    <H4 className="" text="Quality Assurance" />
                    <p className="text-lg">Every product passes through strict handling and storage processes.</p>
                </div>
                <div className="text-center p-4 lg:p-8 shadow-md bg-white rounded-xl flex flex-col items-center gap-2">
                    <FaChartLine className="text-25px text-green" />
                    <H4 className="" text="Market Reach" />
                    <p className="text-lg">Our platform connects rural farmers to both domestic and international markets.</p>
                </div>
                <div className="text-center p-4 lg:p-8 shadow-md bg-white rounded-xl flex flex-col items-center gap-2">
                    <FaLeaf className="text-25px text-green" />
                    <H4 className="" text="Sustainability" />
                    <p className="text-lg">We champion ethical farming, traceability, and environmentally conscious supply chains.</p>
                </div>
            </div>
            
        </section>

        {/**JOIN OUR NETWORK            JOIN OUR NETWORK            JOIN OUR NETWORK            JOIN OUR NETWORK */}
            <section className="h-[90vh] bg-green/20 text-greener flex flex-col lg:items-center justify-center gap-4 lg:gap-10">
                <Slide content={<H1 className="" text="Join Our Network" />} />
                <p className="lg:text-center lg:px-10p lg:text-25px">At FarmTrust Network, we are not just moving produce—we are building a more connected, fair, and sustainable agricultural ecosystem.</p>
                <div className="mt-0" />
                <RegistrationForm />
            </section>

        </>
    )
}