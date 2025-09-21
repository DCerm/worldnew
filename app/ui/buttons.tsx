import Link from 'next/link';


function Button({url, className, text} : {url: string, className: string, text: string}) {
	return (
		<Link href={url} >
			<button className={className + ' text-xl px-10 pt-3 pb-4 rounded-xl bg-green text-black hover:bg-golden'}> {text} </button>  
		</Link>
	)
}
function BigButton({url, className, text} : {url: string, className: string, text: string}) {
	return (
		<Link href={url} >
			<button className={className + ' text-xl font-bold px-50 py-5 rounded-xl hover:bg-white hover:text-black'}> {text} </button>  
		</Link>
	)
}

export { Button, BigButton }