import { Zap, ShieldCheck, Handshake, BarChart, Map, Sparkles } from 'lucide-react';

const features = [
  {
    icon: <Zap className="w-8 h-8 text-buyer-orange-500" />,
    name: 'Instant Matching',
    description: 'Our AI-powered platform instantly connects buyers with their perfect properties and sellers with qualified buyers.',
  },
  {
    icon: <ShieldCheck className="w-8 h-8 text-seller-purple-500" />,
    name: 'Complete Privacy',
    description: 'List quietly and maintain full control over who sees your property or buyer requirements.',
  },
  {
    icon: <Handshake className="w-8 h-8 text-buyer-orange-500" />,
    name: 'Direct Connections',
    description: 'Connect directly with interested parties, avoiding unnecessary intermediaries and costs.',
  },
    {
    icon: <BarChart className="w-8 h-8 text-seller-purple-500" />,
    name: 'Market Intelligence',
    description: 'Access real-time market insights and property analytics to make informed decisions.',
  },
  {
    icon: <Map className="w-8 h-8 text-buyer-orange-500" />,
    name: 'Location Insights',
    description: 'Get detailed neighborhood analysis and property value trends for any area.',
  },
  {
    icon: <Sparkles className="w-8 h-8 text-seller-purple-500" />,
    name: 'Exclusive Deals',
    description: 'Access special rates on mortgages, insurance, and other essential services through our trusted partners.',
  },
];

export function Features() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-base font-semibold leading-7 text-primary">Complete Platform</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything You Need in One Place
          </h2>
           <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
            REOP goes beyond traditional listings to provide a comprehensive suite of tools and services that make real estate transactions smarter, faster, and more cost-effective.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.name} className="text-center p-6 border border-gray-200/50 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-gray-100 mb-4 mx-auto">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{feature.name}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
