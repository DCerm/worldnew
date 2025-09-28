import { Slide } from '@/app/ui/animations';

function H1({className, text}: {className: string; text: string}) {
    return (
        <h1 className={ className + ' capitalize text-[13vw] lg:text-3xl leading-none font-bold' } >{text}</h1>
    )
}
function H2({className, text} : {className: string, text: string}) {
    return (
        <Slide content={<h2 className={ className + ' text-[9vw] md:text-[8vw] lg:text-[4vw] leading-none font-semibold' } >{text}</h2>} />
    )
}
function H3({className, text} : {className: string, text: string}) {
    return (
        <h3 className={ className + ' text-25px lg:text-30px font-semibold' }>{text}</h3>
    )
}
function H4({className, text} : {className: string, text: string}) {
    return (
        <h4 className={ className + ' leading-[30px] text-[20px] md:text-[1.3vw] font-semibold' }>{text}</h4>
    )
}

export { H1, H2, H3, H4 }