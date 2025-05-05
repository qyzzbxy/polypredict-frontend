"use client";

import WalletConnectButton from "@/components/ui/WalletConnectButton";
import Link from "next/link";
import { ethers } from "ethers";
import { useState } from "react";

export default function HomePage() {
  const [address, setAddress] = useState<string | null>(null);

  const handleWalletConnect = (
    _prov: ethers.BrowserProvider,
    _sgnr: ethers.Signer,
    addr: string,
  ) => {
    setAddress(addr);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Wallet Button - Floating */}
        <div className="fixed top-24 right-6 z-50">
          <WalletConnectButton onConnect={handleWalletConnect} />
        </div>

        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg mb-6">
              <span className="text-3xl font-bold text-white">U</span>
            </div>
            <h1 className="text-5xl font-bold text-gray-900 sm:text-6xl lg:text-7xl">
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Ubet</span>
            </h1>
          </div>
          <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-600 sm:text-2xl">
            A decentralized prediction market platform where you can trade on future outcomes with confidence
          </p>
          <div className="mt-10">
            <Link 
              href="/markets"
              className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
            >
              Explore Markets
              <svg className="ml-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Tutorial Section */}
        <div className="max-w-4xl mx-auto mb-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How Ubet Works
          </h2>
          <div className="space-y-8">
            {[
              {
                step: 1,
                title: "Connect Your Wallet",
                description: "Connect your Web3 wallet (like MetaMask) to start trading. Click the 'Connect Wallet' button in the top right corner."
              },
              {
                step: 2,
                title: "Deposit Funds",
                description: "Navigate to any market page and deposit ETH to start trading. Your funds will be held securely in the smart contract."
              },
              {
                step: 3,
                title: "Browse Markets",
                description: "Visit the Markets page to see available prediction markets. Each market represents a binary question with Yes/No outcomes."
              },
              {
                step: 4,
                title: "Place Orders",
                description: "Choose a market and place buy (long) or sell (short) orders. Set your price and amount, then confirm the transaction."
              },
              {
                step: 5,
                title: "Track Performance",
                description: "Visit your Profile page to view all your orders, positions, and trading history across different markets."
              },
              {
                step: 6,
                title: "Claim Profits",
                description: "When a market resolves, return to the market page or your profile to claim your profits if your prediction was correct."
              }
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {item.step}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-20">
          <Link href="/markets" className="group block">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 hover:shadow-lg hover:border-indigo-200 transition-all">
              <div className="w-14 h-14 rounded-lg bg-indigo-100 flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition">
                <svg className="w-8 h-8 text-indigo-600 group-hover:text-white transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">Browse Markets</h3>
              <p className="text-gray-600">Explore active prediction markets and start trading</p>
            </div>
          </Link>

          <Link href="/profile" className="group block">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 hover:shadow-lg hover:border-purple-200 transition-all">
              <div className="w-14 h-14 rounded-lg bg-purple-100 flex items-center justify-center mb-6 group-hover:bg-purple-600 transition">
                <svg className="w-8 h-8 text-purple-600 group-hover:text-white transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">Your Profile</h3>
              <p className="text-gray-600">Check your orders, positions, and trading history</p>
            </div>
          </Link>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">Trading Balance</h3>
            <p className="text-3xl font-bold text-indigo-600 mb-2">
              {address ? "0.0 ETH" : "---"}
            </p>
            <p className="text-gray-600">
              {address ? "Your current trading balance" : "Connect wallet to view balance"}
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Platform Stats</h2>
            <p className="text-gray-600">Real-time statistics about Ubet</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-indigo-600 mb-2">$2.4M</div>
              <div className="text-gray-600">Total Trading Volume</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">156</div>
              <div className="text-gray-600">Active Markets</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-indigo-600 mb-2">5,247</div>
              <div className="text-gray-600">Total Traders</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500">
            © 2024 Ubet. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}