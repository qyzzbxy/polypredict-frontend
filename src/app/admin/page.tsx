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

  // ...前略保持不变...

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
              className={`p-3 border rounded cursor-pointer ${selectedMarketId === market.id ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-50'}`}
              onClick={() => setSelectedMarketId(market.id)}
            >
              <div className="flex justify-between">
                <span className="font-semibold">#{market.id}: {market.question}</span>
                <span className={`text-sm ${isEnded ? 'text-green-600' : 'text-orange-500'}`}>
                  {isEnded ? 'Ended' : 'Active'}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-1">
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
        <div className="mt-4 p-4 border-t">
          <h3 className="font-medium mb-2">Select winning outcome for market #{selectedMarketId}:</h3>
          
          <div className="flex space-x-2">
            {market.outcomes.map((outcome, index) => (
              <button
                key={index}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                onClick={() => resolveMarket(selectedMarketId, index)}
              >
                {outcome} ({index})
              </button>
            ))}
            <button 
              className="ml-auto bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              onClick={() => setSelectedMarketId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      );
    } else if (view === "cancel") {
      return (
        <div className="mt-4 p-4 border-t">
          <h3 className="font-medium mb-2">Confirm cancellation of market #{selectedMarketId}?</h3>
          <p className="text-sm text-gray-600 mb-4">
            This will refund all user funds and cannot be undone.
          </p>
          <div className="flex space-x-2">
            <button
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
              onClick={() => cancelMarket(selectedMarketId)}
            >
              Confirm Cancel
            </button>
            <button 
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      <WalletConnectButton
        onConnect={(_prov, sgnr, _addr) => {
          setSigner(sgnr);
        }}
      />

      {!loggedIn ? (
        <div className="mt-6 border p-4 rounded shadow w-full max-w-md">
          <h2 className="text-lg font-semibold mb-2">Login</h2>
          <input
            type="text"
            placeholder="Username"
            className="border p-2 w-full mb-2 rounded"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="border p-2 w-full mb-4 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={handleLogin}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full"
          >
            Login
          </button>
        </div>
      ) : (
        <div className="mt-6">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
              <p>{error}</p>
            </div>
          )}
          
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => {
                setView("create");
                setSelectedMarketId(null);
              }}
              className={`px-4 py-2 rounded ${
                view === "create" 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              Create Market
            </button>
            <button
              onClick={() => {
                setView("resolve");
                setSelectedMarketId(null);
                loadMarkets();
              }}
              className={`px-4 py-2 rounded ${
                view === "resolve" 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              Resolve Market
            </button>
            <button
              onClick={() => {
                setView("cancel");
                setSelectedMarketId(null);
                loadMarkets();
              }}
              className={`px-4 py-2 rounded ${
                view === "cancel" 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              Cancel Market
            </button>
          </div>
          
          {view === "create" && (
            <div className="border p-4 rounded shadow w-full max-w-md">
              <h2 className="text-lg font-semibold mb-2">Create New Market</h2>
              <input
                type="text"
                placeholder="Question"
                className="border p-2 w-full mb-2 rounded"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <input
                type="text"
                placeholder="Outcomes (comma-separated)"
                className="border p-2 w-full mb-2 rounded"
                value={outcomes}
                onChange={(e) => setOutcomes(e.target.value)}
              />
              <input
                type="text"
                placeholder="Duration (seconds)"
                className="border p-2 w-full mb-4 rounded"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              <button
                onClick={createMarket}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full"
              >
                Create Market
              </button>
            </div>
          )}

          {view === "resolve" && (
            <div className="border p-4 rounded shadow w-full max-w-md">
              <h2 className="text-lg font-semibold mb-2">Resolve Market</h2>
              <p className="text-sm text-gray-600 mb-4">
                Select a market and choose the winning outcome. Only ended markets can be resolved.
              </p>
              
              {renderMarketList()}
              {renderMarketActions()}
            </div>
          )}

          {view === "cancel" && (
            <div className="border p-4 rounded shadow w-full max-w-md">
              <h2 className="text-lg font-semibold mb-2">Cancel Market</h2>
              <p className="text-sm text-gray-600 mb-4">
                Select a market to cancel. This will refund all user funds.
              </p>
              {renderMarketList()}
              {renderMarketActions()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}