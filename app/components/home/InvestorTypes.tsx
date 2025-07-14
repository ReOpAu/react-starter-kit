import { Home, Building, CheckCircle2 } from 'lucide-react';

const types = [
  {
    icon: <Home className="w-10 h-10 text-buyer-orange-500" />,
    title: 'Owner Occupiers',
    description: 'Find your dream home with confidence. Access off-market properties and get matched with motivated sellers.',
    features: [
        'Direct access to pre-market listings',
        'Personalized property matching',
        'First-home buyer support',
        'Local market insights'
    ],
  },
  {
    icon: <Building className="w-10 h-10 text-seller-purple-500" />,
    title: 'Property Investors',
    description: 'Discover high-yield investment opportunities. Make data-driven decisions with our comprehensive market analysis.',
    features: [
        'Investment property analysis',
        'Rental yield calculations',
        'Portfolio expansion opportunities',
        'Market trend insights'
    ],
  },
];

export function InvestorTypes() {
  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-base font-semibold leading-7 text-primary">For Every Type of Buyer</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Find Your Perfect Match
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
            Whether you're looking for a home to live in or an investment property, REOP helps you make smarter real estate decisions.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {types.map((type) => (
            <div key={type.title} className="p-8 border border-gray-200/80 rounded-xl shadow-sm bg-white">
              <div className="flex items-center gap-4 mb-4">
                {type.icon}
                <h3 className="text-2xl font-semibold text-gray-800">{type.title}</h3>
              </div>
              <p className="text-gray-600 mb-6">{type.description}</p>
              <ul className="space-y-3">
                {type.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
