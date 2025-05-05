"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AboutPage() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Trigger animations when component mounts
    setIsLoaded(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-16">
          {/* Hero Section */}
          <div className={`text-center transform transition-all duration-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg mb-6">
                <span className="text-4xl font-bold text-white">U</span>
              </div>
              <h1 className="text-5xl font-bold text-gray-900 sm:text-6xl">
                About <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Ubet</span>
              </h1>
            </div>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-600">
              Revolutionizing prediction markets through decentralized technology and community-driven insights
            </p>
          </div>

          {/* What is Ubet Section */}
          <div className={`bg-white rounded-xl shadow-lg border border-gray-200 p-8 md:p-12 transform transition-all duration-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">What is Ubet?</h2>
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-600 mb-4">
                Ubet is a decentralized prediction market platform that allows users to trade on the outcomes of future events. 
                Built on blockchain technology, we ensure transparency, security, and fair trading for all participants.
              </p>
              <p className="text-gray-600">
                Our platform empowers users to leverage collective intelligence, making informed decisions through market mechanisms. 
                Whether you're interested in politics, sports, economics, or technology, Ubet provides a platform to express your views and potentially profit from accurate predictions.
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Decentralized",
                icon: (
                  <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                ),
                description: "Built on blockchain technology for maximum transparency and security"
              },
              {
                title: "Fair Trading",
                icon: (
                  <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                ),
                description: "Automated market makers ensure fair prices and instant liquidity"
              },
              {
                title: "Multi-Outcome",
                icon: (
                  <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                ),
                description: "Support for multiple outcomes in complex prediction markets"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 transform transition-all duration-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="w-16 h-16 rounded-lg bg-indigo-50 flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* How It Works Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 md:p-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">How It Works</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  step: "1",
                  title: "Connect Wallet",
                  description: "Link your Web3 wallet to start trading"
                },
                {
                  step: "2",
                  title: "Fund Account",
                  description: "Deposit ETH to participate in markets"
                },
                {
                  step: "3",
                  title: "Trade Markets",
                  description: "Buy or sell positions on various events"
                },
                {
                  step: "4",
                  title: "Settle Outcomes",
                  description: "Claim winnings when events resolve"
                }
              ].map((step, index) => (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-8 md:p-12">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Security First</h2>
              <p className="text-lg text-gray-700 mb-6">
                Our smart contracts have been extensively tested and audited to ensure the safety of your funds. 
                All trades are executed automatically and transparently on the blockchain.
              </p>
              <div className="flex flex-wrap gap-4">
                <span className="inline-flex items-center px-4 py-2 rounded-full bg-white border border-indigo-200 text-indigo-700">
                  ✓ Smart Contract Audited
                </span>
                <span className="inline-flex items-center px-4 py-2 rounded-full bg-white border border-indigo-200 text-indigo-700">
                  ✓ Non-custodial
                </span>
                <span className="inline-flex items-center px-4 py-2 rounded-full bg-white border border-indigo-200 text-indigo-700">
                  ✓ 24/7 Monitoring
                </span>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Ready to start trading?</h2>
            <div className="space-x-4">
              <button 
                onClick={() => router.push('/markets')}
                className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
              >
                Explore Markets
              </button>
              <button 
                onClick={() => router.push('/admin')}
                className="inline-flex items-center px-8 py-4 border border-gray-300 text-lg font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-md hover:shadow-lg transition-all"
              >
                Admin Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}