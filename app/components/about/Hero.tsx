export function AboutHero() {
	return (
		<section className="relative bg-gradient-to-b from-gray-50 to-white py-24 sm:py-32 overflow-hidden">
			<div
				aria-hidden="true"
				className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
			>
				<div
					className="w-[80vw] h-[80vw] max-w-4xl max-h-4xl bg-gradient-to-r from-buyer-orange-200 to-seller-purple-200 opacity-30 blur-3xl"
					style={{
						clipPath:
							"polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
					}}
				/>
			</div>
			<div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center">
				<p className="text-base font-semibold leading-7 text-primary">
					About REOP
				</p>
				<h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
					Reimagining Real Estate
				</h1>
				<p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
					REOP transforms traditional real estate by putting you in control.
					Create buyer listings that attract perfect matches, list properties
					quietly without commitment, and access exclusive lending and insurance
					deals—all through one seamless platform.
				</p>
			</div>
		</section>
	);
}
