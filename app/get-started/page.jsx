import {H1} from "../ui/headings";
import {Slide} from "../ui/animations";
import { RegistrationForm } from '../ui/forms';

export default function Page() {
    return (
        <>
            <div className="bg-greener py-10 -mt-20 border-b" />
            <section className="h-[90vh] bg-greener text-white flex flex-col lg:items-center justify-center gap-4 lg:gap-10">
                <Slide content={<H1 className="" text="Join Our Network" />} />
                <p className="lg:text-center lg:px-10p lg:text-25px">Whether you&apos;re a farmer looking for reliable markets or a buyer seeking consistent quality, Farm Trust Network is your trusted partner in agriculture.</p>
                <div className="mt-0" />
                <RegistrationForm />
            </section>

        </>
    )
}