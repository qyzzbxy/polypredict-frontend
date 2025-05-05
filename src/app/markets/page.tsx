"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ethers } from "ethers";
import { useContracts } from "@/hooks/useContracts";
import WalletConnectButton from "@/components/ui/WalletConnectButton";

interface Market {
  id: number;
  question: string;
  outcomes: string[];
  endTime: number;
  status: number;
  resolved: boolean;
  cancelled: boolean;
  outcomeIndex: number;
}

interface ContractMarket {
  question: string;
  outcomes: string[];
  endTime: bigint | number;
  status: bigint | number;
  resolvedOutcomeIndex: bigint | number;
}

export default function MarketsPage() {
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCancelledMarkets, setShowCancelledMarkets] = useState(false);
  const [showResolvedMarkets, setShowResolvedMarkets] = useState(false);
  
  // Default market parameters
  const DEFAULT_QUESTION = "Will ETH price exceed $5,000 by the end of 2025?";
  const DEFAULT_OUTCOMES = ["No", "Yes"];
  // End time: 30 days from now (in seconds)
  const DEFAULT_END_TIME = 30 * 24 * 60 * 60; // 30 days in seconds

  const contracts = useContracts(signer);

  // Load markets - based on PredictionMarket contract implementation
  const loadMarkets = async () => {
    if (!contracts) {
      console.error("Contracts not initialized");
      setError("Please connect your wallet to view markets");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try to get markets with IDs starting from 1
      const marketsList: Market[] = [];
      let id = 1;
      let firstNonExisting = false;
      
      while (!firstNonExisting) {
        try {
          console.log(`Attempting to load market ID: ${id}`);
          // Use your contract's getMarket function from PredictionMarket.sol
          const market: ContractMarket = await contracts.predictionMarket.getMarket(id);
          
          console.log(`Market ${id} data:`, market);
          console.log(`Market ${id} status:`, Number(market.status));
          
          // 在这里确保状态被正确解析
          const status = Number(market.status);
          const resolved = status === 1;
          const cancelled = status === 2;
          
          marketsList.push({
            id: id,
            question: market.question,
            outcomes: market.outcomes,
            endTime: Number(market.endTime),
            status: status,
            resolved: resolved,
            cancelled: cancelled,
            outcomeIndex: Number(market.resolvedOutcomeIndex)
          });
          
          id++;
        } catch (err) {
          console.log(`Market ${id} not found, ending search:`, err);
          firstNonExisting = true;
        }
      }

      setMarkets(marketsList);
      
      if (marketsList.length === 0) {
        console.log("No markets found, may need to create one");
      } else {
        console.log("Loaded markets with statuses:", marketsList.map(m => ({id: m.id, status: m.status, cancelled: m.cancelled})));
      }
    } catch (error) {
      console.error("Failed to load markets:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setError(`Failed to load markets: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a default market
  const createDefaultMarket = async () => {
    if (!contracts || !signer) {
      setError("Please connect your wallet to create a market");
      return;
    }

    if (!isAdmin) {
      setError("Only admin can create markets");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      console.log("Creating default market...");
      
      const tx = await contracts.polyPredictMarket.createMarket(
        DEFAULT_QUESTION,
        DEFAULT_OUTCOMES,
        DEFAULT_END_TIME
      );
      
      console.log("Transaction sent:", tx.hash);
      await tx.wait();
      console.log("Market created successfully!");
      
      // Reload markets after creation
      await loadMarkets();
      
    } catch (error) {
      console.error("Failed to create market:", error);
      const errorReason = error?.reason || (error instanceof Error ? error.message : undefined);
      const errorMessage = errorReason || "Unknown error";
      setError(`Failed to create market: ${errorMessage}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Check if connected wallet is admin
  const checkAdminStatus = async () => {
    if (!contracts || !signer || !address) return;
    
    try {
      const adminAddress = await contracts.polyPredictMarket.admin();
      setIsAdmin(adminAddress.toLowerCase() === address.toLowerCase());
    } catch (error) {
      console.error("Failed to check admin status:", error);
    }
  };

  // Handle wallet connection
  const handleWalletConnect = (_prov: ethers.BrowserProvider, sgnr: ethers.Signer, addr: string) => {
    console.log("Wallet connected:", addr);
    setSigner(sgnr);
    setAddress(addr);
  };

  // Load markets and check admin status when signer changes
  useEffect(() => {
    if (signer && contracts) {
      loadMarkets();
      checkAdminStatus();
    }
  }, [signer, contracts]);

  // 添加一个刷新按钮的处理函数
  const handleRefresh = () => {
    if (signer) {
      loadMarkets();
    }
  };

  // Get filtered markets based on visibility settings
  const getFilteredMarkets = () => {
    let filtered = markets;
    
    // Filter out cancelled markets if not showing them
    if (!showCancelledMarkets) {
      filtered = filtered.filter(market => market.status !== 2);
    }
    
    // Filter out resolved markets if not showing them  
    if (!showResolvedMarkets) {
      filtered = filtered.filter(market => market.status !== 1);
    }
    
    return filtered;
  };

  const filteredMarkets = getFilteredMarkets();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Prediction Markets
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Trade on the outcomes of future events with Ubet's decentralized prediction markets
          </p>
        </div>
        
        {/* Wallet Connection & Status */}
        <div className="flex flex-col items-center mb-8">
          <WalletConnectButton onConnect={handleWalletConnect} />
          
          {address && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Connected: {address.substring(0, 6)}...{address.substring(address.length - 4)}
              </span>
              {isAdmin && (
                <span className="bg-indigo-100 text-indigo-700 text-xs font-medium px-3 py-1 rounded-full">
                  Admin
                </span>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg shadow-sm">
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Market filter toggles */}
        {markets.length > 0 && (
          <div className="flex flex-wrap items-center justify-center mb-8 gap-4">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showCancelledMarkets}
                onChange={() => setShowCancelledMarkets(!showCancelledMarkets)}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-700">Show Cancelled Markets</span>
            </label>
            
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showResolvedMarkets}
                onChange={() => setShowResolvedMarkets(!showResolvedMarkets)}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-700">Show Resolved Markets</span>
            </label>
            
            <button
              onClick={handleRefresh}
              className="ml-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-sm"
            >
              Refresh Markets
            </button>
          </div>
        )}

        {isAdmin && markets.length === 0 && !isLoading && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              No markets found
            </h3>
            <button
              onClick={createDefaultMarket}
              disabled={isCreating}
              className={`bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isCreating ? 'Creating Market...' : 'Create Default Market'}
            </button>
            <p className="mt-4 text-sm text-gray-600">
              As an admin, you can create a default market to get started
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mb-4"></div>
            <p className="text-gray-600">Loading markets...</p>
          </div>
        ) : (
          <>
            {filteredMarkets.length === 0 && !isLoading ? (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 p-6 rounded-lg shadow-sm">
                <p className="font-medium">No markets found</p>
                <p className="mt-1">Connect your wallet{isAdmin ? ' and create a market' : ' or check back later'}.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredMarkets.map((market) => (
                  <Link 
                    href={`/markets/${market.id}`}
                    key={market.id}
                    className={`block rounded-xl shadow-sm hover:shadow-lg transition-all ${
                      market.status === 2 ? 'opacity-70 border-2 border-red-200' : 'border border-gray-200'
                    }`}
                  >
                    <div className="p-6 bg-white rounded-xl">
                      <h2 className="text-lg font-semibold mb-3 line-clamp-2 text-gray-900">
                        {market.question}
                        {market.status === 2 && (
                          <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                            Cancelled
                          </span>
                        )}
                      </h2>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className={`font-medium px-3 py-1 rounded-full ${
                          market.status === 1 ? 'bg-green-100 text-green-700' : 
                          market.status === 2 ? 'bg-red-100 text-red-700' : 
                          'bg-indigo-100 text-indigo-700'
                        }`}>
                          {market.status === 1 
                            ? `Resolved: ${market.outcomes[market.outcomeIndex]}` 
                            : market.status === 2
                              ? "Cancelled"
                              : "Active"}
                        </span>
                        <span className="text-gray-600">
                          {new Date(market.endTime * 1000).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {market.status === 2 && (
                        <div className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded">
                          This market has been cancelled by the admin. All funds have been returned.
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-12 text-center">
              <p className="text-sm text-gray-500">
                Click on any market to view details and place orders
                {(!showCancelledMarkets || !showResolvedMarkets) && (
                  <>
                    <br />
                    <span className="text-gray-400">
                      {markets.filter(m => (!showCancelledMarkets && m.status === 2) || (!showResolvedMarkets && m.status === 1)).length} markets are hidden. Toggle the switches above to view them.
                    </span>
                  </>
                )}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}