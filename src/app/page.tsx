/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import WalletConnectButton from "@/components/ui/WalletConnectButton";
import Link from "next/link";
import { ethers } from "ethers";
import { useState } from "react";

export default function HomePage() {
  const [address, setAddress] = useState<string | null>(null);

  const handleWalletConnect = (
    prov: ethers.BrowserProvider,
    sgnr: ethers.Signer,
    addr: string,
  ) => {
    setAddress(addr);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-indigo-600">PolyPredict</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link href="/" className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Home
                </Link>
                <Link href="/markets" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Markets
                </Link>
                <Link href="/profile" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Profile
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <WalletConnectButton onConnect={handleWalletConnect} />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            Welcome to PolyPredict
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            A decentralized prediction market where you can bet on future outcomes with confidence.
          </p>
        </div>

        {/* Tutorial Section */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-12">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              How to Use PolyPredict
            </h3>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-8">
              {/* Step 1 */}
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    1
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-gray-900">Connect Your Wallet</h4>
                  <p className="mt-2 text-base text-gray-500">
                    Connect your Web3 wallet (like MetaMask) to start trading. Click the "Connect Wallet" button in the top right corner.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    2
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-gray-900">Deposit Funds</h4>
                  <p className="mt-2 text-base text-gray-500">
                    Navigate to any market page and deposit ETH to start trading. Your funds will be held securely in the smart contract.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    3
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-gray-900">Browse Markets</h4>
                  <p className="mt-2 text-base text-gray-500">
                    Visit the Markets page to see available prediction markets. Each market represents a binary question with Yes/No outcomes.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    4
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-gray-900">Place Orders</h4>
                  <p className="mt-2 text-base text-gray-500">
                    Choose a market and place buy (long) or sell (short) orders. Set your price and amount, then confirm the transaction.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    5
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-gray-900">Track Performance</h4>
                  <p className="mt-2 text-base text-gray-500">
                    Visit your Profile page to view all your orders, positions, and trading history across different markets.
                  </p>
                </div>
              </div>

              {/* Step 6 */}
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    6
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-gray-900">Claim Profits</h4>
                  <p className="mt-2 text-base text-gray-500">
                    When a market resolves, return to the market page or your profile to claim your profits if your prediction was correct.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/markets" className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg shadow hover:shadow-md transition">
            <div>
              <span className="rounded-lg inline-flex p-3 bg-indigo-100 text-indigo-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </span>
            </div>
            <div className="mt-8">
              <h3 className="text-lg font-medium">
                <span className="absolute inset-0" aria-hidden="true"></span>
                Browse Markets
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Explore active prediction markets and start trading
              </p>
            </div>
          </Link>

          <Link href="/profile" className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg shadow hover:shadow-md transition">
            <div>
              <span className="rounded-lg inline-flex p-3 bg-indigo-100 text-indigo-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
            </div>
            <div className="mt-8">
              <h3 className="text-lg font-medium">
                <span className="absolute inset-0" aria-hidden="true"></span>
                View Profile
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Check your orders, positions, and trading history
              </p>
            </div>
          </Link>

          <div className="relative group bg-white p-6 rounded-lg shadow">
            <div>
              <span className="rounded-lg inline-flex p-3 bg-indigo-100 text-indigo-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v8m0 0V5m0 16H9" />
                </svg>
              </span>
            </div>
            <div className="mt-8">
              <h3 className="text-lg font-medium">
                Balance: {address ? "0.0 ETH" : "Not Connected"}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {address ? "Your current trading balance" : "Connect wallet to view balance"}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white mt-24">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            © 2024 PolyPredict. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}