"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useContracts } from "@/hooks/useContracts";
import WalletConnectButton from "@/components/ui/WalletConnectButton";

interface Market {
  id: number;
  question: string;
  outcomes: string[];
  endTime: number;
  status: number; // 0: Active, 1: Resolved, 2: Cancelled
  resolvedOutcomeIndex: number;
}

interface ContractMarket {
  question: string;
  outcomes: string[];
  endTime: bigint | number;
  status: bigint | number;
  resolvedOutcomeIndex: bigint | number;
}

export default function AdminPage() {
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [question, setQuestion] = useState("");
  const [outcomes, setOutcomes] = useState("Yes,No");
  const [duration, setDuration] = useState("86400");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);
  const [view, setView] = useState<"create" | "resolve" | "cancel">("create");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contracts = useContracts(signer);

  useEffect(() => {
    if (contracts && signer && loggedIn) {
      loadMarkets();
    }
  }, [contracts, signer, loggedIn, view]);

  const loadMarkets = async () => {
    if (!contracts) {
      setError("Contracts not initialized");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const marketsList: Market[] = [];
      let consecutiveFailures = 0;
      const MAX_CONSECUTIVE_FAILURES = 5;
      
      for (let i = 1; i <= 20; i++) {
        try {
          console.log(`Loading market ID: ${i}`);
          const market: ContractMarket = await contracts.predictionMarket.getMarket(i);
          
          marketsList.push({
            id: i,
            question: market.question,
            outcomes: market.outcomes,
            endTime: Number(market.endTime),
            status: Number(market.status),
            resolvedOutcomeIndex: Number(market.resolvedOutcomeIndex)
          });
          
          consecutiveFailures = 0;
        } catch (err) {
          console.log(`Market ${i} not found:`, err);
          consecutiveFailures++;
          
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            console.log(`Stopping after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`);
            break;
          }
        }
      }

      setMarkets(marketsList);
      
      if (marketsList.length === 0) {
        console.log("No markets found");
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("Failed to load markets:", error.message);
        setError(`Failed to load markets: ${error.message}`);
      } else {
        console.error("Failed to load markets:", error);
        setError("Failed to load markets: Unknown error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    if (username === "admin" && password === "admin") {
      setLoggedIn(true);
    } else {
      alert("Invalid credentials");
    }
  };

  const createMarket = async () => {
    if (!contracts || !signer || !question || !duration) {
      alert("Missing inputs or contract");
      return;
    }

    const outcomeArray = outcomes.split(",").map((s) => s.trim());
    const durationSeconds = Number(duration);

    try {
      const tx = await contracts.polyPredictMarket.createMarket(
        question,
        outcomeArray,
        durationSeconds
      );
      await tx.wait();
      alert("✅ Market created successfully!");
      setQuestion("");
      setOutcomes("Yes,No");
      setDuration("86400");
      loadMarkets();
    } catch (error: unknown) {
      const errorMessage =
        (error as any)?.reason ||
        (error instanceof Error ? error.message : "Unknown error");
      console.error("❌ Failed to create market:", errorMessage);
      alert(`❌ Failed to create market: ${errorMessage}`);
    }
  };

  const resolveMarket = async (marketId: number, outcomeIndex: number) => {
    if (!contracts || !marketId) {
      alert("Missing inputs or contract");
      return;
    }

    const market = markets.find(m => m.id === marketId);
    if (!market) {
      alert("Market not found");
      return;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const isEnded = currentTime >= market.endTime;

    if (!isEnded) {
      alert(`❌ Market #${marketId} has not ended yet. End time: ${new Date(market.endTime * 1000).toLocaleString()}`);
      return;
    }

    try {
      const tx = await contracts.polyPredictMarket.resolveMarket(
        marketId,
        outcomeIndex
      );
      await tx.wait();
      alert(`✅ Market #${marketId} resolved successfully! Outcome: ${market.outcomes[outcomeIndex]}`);
      setSelectedMarketId(null);
      loadMarkets();
    } catch (error: unknown) {
      const errorMessage =
        (error as any)?.reason ||
        (error instanceof Error ? error.message : "Unknown error");
      console.error("❌ Failed to resolve market:", errorMessage);
      alert(`❌ Failed to resolve market: ${errorMessage}`);
    }
  };

  const cancelMarket = async (marketId: number) => {
    if (!contracts || !marketId) {
      alert("Missing inputs or contract");
      return;
    }

    try {
      const tx = await contracts.polyPredictMarket.cancelMarket(marketId);
      await tx.wait();
      alert(`✅ Market #${marketId} cancelled successfully!`);
      setSelectedMarketId(null);
      loadMarkets();
    } catch (error: unknown) {
      const errorMessage =
        (error as any)?.reason ||
        (error instanceof Error ? error.message : "Unknown error");
      console.error("❌ Failed to cancel market:", errorMessage);
      alert(`❌ Failed to cancel market: ${errorMessage}`);
    }
  };

  const renderMarketList = () => {
    const filteredMarkets = markets.filter(m => m.status === 0);
    
    if (isLoading) {
      return <p className="text-gray-500 italic mt-2">Loading markets...</p>;
    }
    
    if (filteredMarkets.length === 0) {
      return <p className="text-gray-500 italic mt-2">No active markets available</p>;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    
    return (
      <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
        {filteredMarkets.map(market => {
          const isEnded = currentTime >= market.endTime;
          
          return (
            <div 
              key={market.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedMarketId === market.id 
                  ? 'bg-indigo-50 border-indigo-500 shadow' 
                  : 'hover:bg-gray-50 border-gray-200'
              }`}
              onClick={() => setSelectedMarketId(market.id)}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900">
                  #{market.id}: {market.question}
                </span>
                <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                  isEnded 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {isEnded ? 'Ended' : 'Active'}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>Outcomes: {market.outcomes.join(", ")}</span>
                <span>
                  {new Date(Number(market.endTime) * 1000).toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMarketActions = () => {
    if (!selectedMarketId) return null;
    
    const market = markets.find(m => m.id === selectedMarketId);
    if (!market) return null;
    
    if (view === "resolve") {
      return (
        <div className="mt-6 p-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">
            Select winning outcome for market #{selectedMarketId}:
          </h3>
          
          <div className="flex space-x-3">
            {market.outcomes.map((outcome, index) => (
              <button
                key={index}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                onClick={() => resolveMarket(selectedMarketId, index)}
              >
                {outcome} ({index})
              </button>
            ))}
            <button 
              className="ml-auto bg-gray-600 hover:bg-gray-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
              onClick={() => setSelectedMarketId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      );
    } else if (view === "cancel") {
      return (
        <div className="mt-6 p-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">
            Confirm cancellation of market #{selectedMarketId}?
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            This will refund all user funds and cannot be undone.
          </p>
          <div className="flex space-x-3">
            <button
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
              onClick={() => cancelMarket(selectedMarketId)}
            >
              Confirm Cancel
            </button>
            <button 
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
              onClick={() => setSelectedMarketId(null)}
            >
              Keep Market
            </button>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Ubet Admin Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Manage your prediction markets
          </p>
        </div>

        {/* Wallet Connection */}
        <div className="flex justify-center mb-8">
          <WalletConnectButton
            onConnect={(_prov, sgnr, _addr) => {
              setSigner(sgnr);
            }}
          />
        </div>

        {!loggedIn ? (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Admin Login
              </h2>
              <input
                type="text"
                placeholder="Username"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-4"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-6"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                onClick={handleLogin}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-3 rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                Login
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-sm">
                <p className="font-medium">{error}</p>
              </div>
            )}
            
            {/* Navigation Tabs */}
            <div className="flex space-x-2 justify-center">
              {[
                { id: 'create', label: 'Create Market', icon: '✨' },
                { id: 'resolve', label: 'Resolve Market', icon: '✅' },
                { id: 'cancel', label: 'Cancel Market', icon: '❌' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setView(tab.id as typeof view);
                    setSelectedMarketId(null);
                    if (tab.id !== 'create') loadMarkets();
                  }}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    view === tab.id 
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md" 
                      : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <span className="inline-flex items-center">
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>
            
            {/* Content Panels */}
            <div className="max-w-3xl mx-auto">
              {view === "create" && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                    Create New Market
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Question
                      </label>
                      <input
                        type="text"
                        placeholder="Enter your prediction question"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Outcomes (comma-separated)
                      </label>
                      <input
                        type="text"
                        placeholder="Yes,No"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={outcomes}
                        onChange={(e) => setOutcomes(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration (seconds)
                      </label>
                      <input
                        type="text"
                        placeholder="86400"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={createMarket}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-all shadow-md hover:shadow-lg mt-2"
                    >
                      Create Market
                    </button>
                  </div>
                </div>
              )}

              {view === "resolve" && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Resolve Market
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Select a market and choose the winning outcome. Only ended markets can be resolved.
                  </p>
                  
                  {renderMarketList()}
                  {renderMarketActions()}
                </div>
              )}

              {view === "cancel" && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Cancel Market
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Select a market to cancel. This will refund all user funds.
                  </p>
                  {renderMarketList()}
                  {renderMarketActions()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}