"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ethers } from "ethers";
import { useContracts } from "@/hooks/useContracts";
import WalletConnectButton from "@/components/ui/WalletConnectButton";

export default function MarketsPage() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCancelledMarkets, setShowCancelledMarkets] = useState(false); // 默认关闭
  const [showResolvedMarkets, setShowResolvedMarkets] = useState(false); // 默认关闭
  
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
      const marketsList = [];
      let id = 1;
      let firstNonExisting = false;
      
      while (!firstNonExisting) {
        try {
          console.log(`Attempting to load market ID: ${id}`);
          // Use your contract's getMarket function from PredictionMarket.sol
          const market = await contracts.predictionMarket.getMarket(id);
          
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
      setError(`Failed to load markets: ${error.message || "Unknown error"}`);
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
      const errorMessage = error.reason || error.message || "Unknown error";
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
  const handleWalletConnect = (prov, sgnr, addr) => {
    console.log("Wallet connected:", addr);
    setProvider(prov);
    setSigner(sgnr);
    setAddress(addr);
  };

  // Load markets and check admin status when signer changes
  useEffect(() => {
    if (signer) {
      loadMarkets();
      checkAdminStatus();
    }
  }, [signer]);

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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Prediction Markets</h1>
      
      <div className="mb-6">
        <WalletConnectButton onConnect={handleWalletConnect} />
        
        {address && (
          <div className="mt-2 text-sm text-gray-600">
            Connected: {address.substring(0, 6)}...{address.substring(address.length - 4)}
            {isAdmin && <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">Admin</span>}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}

      {/* Market filter toggles */}
      {markets.length > 0 && (
        <div className="flex mb-4 items-center">
          <label className="inline-flex items-center cursor-pointer mr-6">
            <input
              type="checkbox"
              checked={showCancelledMarkets}
              onChange={() => setShowCancelledMarkets(!showCancelledMarkets)}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ml-3 text-sm font-medium text-gray-900">Show Cancelled Markets</span>
          </label>
          
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showResolvedMarkets}
              onChange={() => setShowResolvedMarkets(!showResolvedMarkets)}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ml-3 text-sm font-medium text-gray-900">Show Resolved Markets</span>
          </label>
          
          <button
            onClick={handleRefresh}
            className="ml-auto bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-1 px-3 rounded text-sm"
          >
            Refresh Markets
          </button>
        </div>
      )}

      {isAdmin && markets.length === 0 && !isLoading && (
        <div className="mb-6">
          <button
            onClick={createDefaultMarket}
            disabled={isCreating}
            className={`bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isCreating ? 'Creating Market...' : 'Create Default Market'}
          </button>
          <p className="mt-2 text-sm text-gray-600">
            As an admin, you can create a default market to get started
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <p>Loading markets...</p>
        </div>
      ) : (
        <>
          {filteredMarkets.length === 0 && !isLoading ? (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
              <p>No markets found. Connect your wallet{isAdmin ? ' and create a market' : ' or check back later'}.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMarkets.map((market) => (
                <Link 
                  href={`/markets/${market.id}`}
                  key={market.id}
                  className={`block border rounded shadow hover:shadow-md transition-shadow ${market.status === 2 ? 'opacity-70 border-red-300' : ''}`}
                >
                  <div className="p-4">
                    <h2 className="text-lg font-semibold mb-2 line-clamp-2">
                      {market.question}
                      {market.status === 2 && (
                        <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded">Cancelled</span>
                      )}
                    </h2>
                    <div className="flex justify-between text-sm">
                      <span className={
                        market.status === 1 ? 'text-green-600' : 
                        market.status === 2 ? 'text-red-600' : 
                        'text-blue-600'
                      }>
                        {market.status === 1 
                          ? `Resolved: ${market.outcomes[market.outcomeIndex]}` 
                          : market.status === 2
                            ? "Cancelled"
                            : "Active"}
                      </span>
                      <span>
                        {new Date(market.endTime * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {market.status === 2 && (
                      <div className="mt-2 text-xs text-red-600">
                        This market has been cancelled by the admin. All funds have been returned.
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
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
  );
}