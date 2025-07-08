import { AddressFinderBrain } from "~/components/address-finder/AddressFinderBrain";
import { AddressFinderDebug } from "~/components/address-finder/AddressFinderDebug";
import { AddressFinderUI } from "~/components/address-finder/AddressFinderUI";

export default function AddressFinder() {
	return (
		<AddressFinderBrain>
			{(brainState) => (
				<>
					<AddressFinderUI brainState={brainState} />
					<AddressFinderDebug brainState={brainState} />
				</>
			)}
		</AddressFinderBrain>
	);
}
