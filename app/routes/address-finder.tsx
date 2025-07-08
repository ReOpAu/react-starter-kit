import { AddressFinderBrain } from "~/components/address-finder/AddressFinderBrain";
import { AddressFinderUI } from "~/components/address-finder/AddressFinderUI";
import { AddressFinderDebug } from "~/components/address-finder/AddressFinderDebug";

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
