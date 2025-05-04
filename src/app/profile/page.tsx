/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import { useContracts } from "@/hooks/useContracts";
import WalletConnectButton from "@/components/ui/WalletConnectButton";
import PolyPredictMarketAbi from "@/abi/PolyPredictMarket.json";
import CLOBExchangeAbi from "@/abi/CLOBExchange.json";
import { CONTRACT_ADDRESSES } from "@/constants/contracts";

interface Order {
  id: number;
  marketId: number;
  isBuy: boolean;
  price: bigint;
  amount: bigint;
  filled: bigint;
  isActive: boolean;
  isResolved: boolean;
  timestamp: number;
  trader: string;
}

interface DebugLog {
  step: string;
  data: any;
  error?: string;
  timestamp: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const contracts = useContracts(signer);

  // User data state
  const [userBalance, setUserBalance] = useState<bigint>(0n);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const formatEth = (wei: bigint | string) => ethers.formatEther(wei);
  const formatGwei = (wei: bigint | string) => ethers.formatUnits(wei, 'gwei');

  // Debug logging function
  const addDebugLog = (step: string, data: any, error?: string) => {
    const newLog: DebugLog = {
      step,
      data,
      error,
      timestamp: new Date().toLocaleTimeString()
    };
    setDebugLogs(prev => [...prev, newLog]);
  };

  /* --- Contract Resolution --- */
  const getPolyPredictContract = () => {
    addDebugLog("Resolving PolyPredict Contract", {
      hasContractsHook: !!contracts?.polyPredictMarket,
      hasSigner: !!signer,
      contractAddress: CONTRACT_ADDRESSES.POLY_PREDICT_MARKET
    });

    if (!contracts?.polyPredictMarket && signer) {
      const contract = new ethers.Contract(CONTRACT_ADDRESSES.POLY_PREDICT_MARKET, PolyPredictMarketAbi, signer);
      addDebugLog("Created direct PolyPredict contract", { address: contract.address });
      return contract;
    }
    return contracts?.polyPredictMarket;
  };

  const getExchangeContract = async () => {
    const polyPredict = getPolyPredictContract();
    if (!polyPredict) {
      addDebugLog("Failed to get PolyPredict contract", {}, "No PolyPredict contract");
      return null;
    }
    
    try {
      const exchangeAddress = await polyPredict.getExchangeAddress();
      addDebugLog("Got Exchange Address", { address: exchangeAddress });
      
      const contract = new ethers.Contract(exchangeAddress, CLOBExchangeAbi, signer);
      addDebugLog("Created Exchange contract", { 
        address: contract.address,
        abi: "CLOBExchangeAbi loaded"
      });
      
      return contract;
    } catch (e) {
      addDebugLog("Error getting Exchange contract", { error: e }, e.message);
      return null;
    }
  };

  /* --- Data Loading --- */
  const loadUserBalance = async () => {
    if (!address || !contracts?.tokenManager) {
      addDebugLog("Cannot load user balance", {
        hasAddress: !!address,
        hasTokenManager: !!contracts?.tokenManager
      });
      return;
    }

    try {
      const balance = await contracts.tokenManager.getAvailableBalance(address);
      setUserBalance(balance);
      addDebugLog("Loaded user balance", { balance: balance.toString() });
    } catch (e) {
      console.error("Failed to load balance:", e);
      addDebugLog("Failed to load balance", {}, e.message);
    }
  };

  // Step 1: Check contracts and address
  const debugStep1_VerifyContracts = async () => {
    const polyPredict = getPolyPredictContract();
    
    const debugInfo = {
      address: address,
      hasSigner: !!signer,
      hasPolyPredict: !!polyPredict,
      polyPredictAddress: polyPredict?.address,
      CONTRACT_ADDRESSES: CONTRACT_ADDRESSES,
      contracts: {
        polyPredictMarket: !!contracts?.polyPredictMarket,
        tokenManager: !!contracts?.tokenManager,
        predictionMarket: !!contracts?.predictionMarket
      }
    };
    
    addDebugLog("Step 1: Verify Contracts", debugInfo);
    
    if (polyPredict) {
      try {
        const exchangeAddr = await polyPredict.getExchangeAddress();
        const tokenManagerAddr = await polyPredict.getTokenManagerAddress();
        
        addDebugLog("Step 1: Contract Addresses", {
          exchangeAddress: exchangeAddr,
          tokenManagerAddress: tokenManagerAddr
        });
      } catch (e) {
        addDebugLog("Step 1: Error getting addresses", {}, e.message);
      }
    }
  };

  // Step 2: Check if getUserOrders exists and works
  const debugStep2_CheckUserOrders = async () => {
    if (!address) {
      addDebugLog("Step 2: No address", {}, "Address not set");
      return;
    }

    const exchange = await getExchangeContract();
    if (!exchange) {
      addDebugLog("Step 2: No exchange contract", {}, "Failed to get exchange");
      return;
    }

    try {
      // Test if getUserOrders exists
      const hasFunction = typeof exchange.getUserOrders === 'function';
      addDebugLog("Step 2: getUserOrders exists", { hasFunction });

      // Call getUserOrders
      const orderIds = await exchange.getUserOrders(address);
      addDebugLog("Step 2: getUserOrders result", {
        orderIdsLength: orderIds ? orderIds.length : 0,
        orderIds: orderIds ? orderIds.map(id => id.toString()) : []
      });

      // Check individual orders
      if (orderIds && orderIds.length > 0) {
        for (let i = 0; i < Math.min(3, orderIds.length); i++) {
          try {
            const order = await exchange.getOrder(orderIds[i]);
            addDebugLog(`Step 2: Order ${orderIds[i]}`, {
              id: order.id.toString(),
              trader: order.trader,
              isActive: order.isActive,
              isResolved: order.isResolved,
              amount: order.amount.toString(),
              filled: order.filled.toString()
            });
          } catch (e) {
            addDebugLog(`Step 2: Error getting order ${orderIds[i]}`, {}, e.message);
          }
        }
      }

    } catch (e) {
      addDebugLog("Step 2: getUserOrders failed", { error: e }, e.message);
    }
  };

  // Step 3: Check events
  const debugStep3_CheckEvents = async () => {
    if (!address) return;

    const exchange = await getExchangeContract();
    if (!exchange) return;

    try {
      // Check OrderPlaced events for user
      const filter = exchange.filters.OrderPlaced(null, address);
      const events = await exchange.queryFilter(filter, -1000); // Last 1000 blocks
      
      addDebugLog("Step 3: OrderPlaced events", {
        eventCount: events.length,
        filter: filter.fragment?.inputs[1].name // Should show "trader"
      });

      // Show first few events
      events.slice(0, 3).forEach((event, index) => {
        addDebugLog(`Step 3: Event ${index}`, {
          orderId: event.args.orderId.toString(),
          marketId: event.args.marketId.toString(),
          trader: event.args.trader,
          isBuy: event.args.isBuy,
          blockNumber: event.blockNumber
        });
      });

    } catch (e) {
      addDebugLog("Step 3: Events check failed", {}, e.message);
    }
  };

  // Main debug function
  const runFullDiagnostic = async () => {
    setDebugLogs([]); // Clear previous logs
    setShowDebug(true);
    
    addDebugLog("Starting Diagnostic", {
      timestamp: new Date().toISOString(),
      address: address,
      signer: !!signer
    });

    await debugStep1_VerifyContracts();
    await debugStep2_CheckUserOrders();
    await debugStep3_CheckEvents();
    
    addDebugLog("Diagnostic Complete", {
      totalLogs: debugLogs.length + 1
    });
  };

  const loadUserOrders = async () => {
    if (!address) return;
    setLoading(true);
    
    try {
      const exchange = await getExchangeContract();
      if (!exchange) return;
      
      // Get user's order IDs
      const orderIds = await exchange.getUserOrders(address);
      
      // Get order details
      const orders: Order[] = [];
      for (const orderId of orderIds) {
        try {
          const order = await exchange.getOrder(orderId);
          orders.push({
            id: Number(order.id),
            marketId: Number(order.marketId),
            isBuy: order.isBuy,
            price: order.price,
            amount: order.amount,
            filled: order.filled,
            isActive: order.isActive,
            isResolved: order.isResolved,
            timestamp: Number(order.timestamp),
            trader: order.trader
          });
        } catch (e) {
          console.error(`Failed to load order ${orderId}:`, e);
        }
      }
      
      // Sort by timestamp (newest first)
      orders.sort((a, b) => b.timestamp - a.timestamp);
      setUserOrders(orders);
      
      // Load positions for unique markets in orders
      const uniqueMarketIds = [...new Set(orders.map(o => o.marketId))];
      const positionPromises = uniqueMarketIds.map(async (marketId) => {
        try {
          const position = await exchange.getPosition(address, marketId);
          const positionValue = Number(position);
          return positionValue !== 0 ? [marketId, positionValue] : null;
        } catch (e) {
          console.error(`Failed to get position for market ${marketId}:`, e);
          return null;
        }
      });
      
      const positionResults = await Promise.all(positionPromises);
      const validPositions = positionResults.filter(p => p !== null);
      setPositions(validPositions);
      
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  /* --- Effects --- */
  useEffect(() => {
    if (signer && address) {
      loadUserBalance();
      loadUserOrders();
    }
  }, [signer, address]);

  const onConnect = (prov: ethers.BrowserProvider, sgnr: ethers.Signer, addr: string) => {
    setSigner(sgnr);
    setAddress(addr);
  };

  /* --- Render --- */
  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <button onClick={() => router.back()} className="text-sm text-blue-500">← Back</button>
          <h1 className="text-2xl font-bold mt-2">Profile</h1>
        </div>
        <WalletConnectButton onConnect={onConnect} />
      </div>

      {/* Debug Button */}
      <div className="border rounded p-4 bg-yellow-50">
        <button 
          onClick={runFullDiagnostic}
          className="p-2 bg-yellow-600 text-white rounded"
        >
          Run Full Diagnostic
        </button>
        {showDebug && (
          <button 
            onClick={() => setShowDebug(false)}
            className="ml-2 p-2 bg-gray-600 text-white rounded"
          >
            Hide Debug Logs
          </button>
        )}
      </div>

      {/* Debug Logs */}
      {showDebug && (
        <div className="border rounded p-4 bg-gray-50 max-h-96 overflow-y-auto">
          <h3 className="font-semibold mb-2">Debug Logs:</h3>
          <pre className="whitespace-pre-wrap text-xs">
            {debugLogs.map((log, index) => (
              <div key={index} className={`mb-2 ${log.error ? 'text-red-600' : 'text-gray-800'}`}>
                <strong>[{log.timestamp}] {log.step}:</strong>
                {'\n'}
                {JSON.stringify(log.data, null, 2)}
                {log.error && '\nERROR: ' + log.error}
                {'\n'}
                {'='.repeat(50)}
              </div>
            ))}
          </pre>
        </div>
      )}

      {/* Wallet Info */}
      <div className="border rounded p-4">
        <h2 className="text-lg font-semibold mb-2">Wallet Information</h2>
        {address ? (
          <div className="space-y-2">
            <p><span className="font-semibold">Address:</span> {address.slice(0, 6)}...{address.slice(-4)}</p>
            <p><span className="font-semibold">Balance:</span> {formatEth(userBalance)} ETH</p>
          </div>
        ) : (
          <p className="text-gray-500">Please connect your wallet</p>
        )}
      </div>

      {/* Positions Summary */}
      <div className="border rounded p-4">
        <h2 className="text-lg font-semibold mb-2">Positions</h2>
        {loading ? (
          <p>Loading...</p>
        ) : positions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {positions.map(([marketId, position]) => (
              <div 
                key={marketId} 
                className={`p-3 rounded border ${position > 0 ? 'border-green-200 bg-green-50' : position < 0 ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}
              >
                <p className="font-semibold">Market #{marketId}</p>
                <p className={`${position > 0 ? 'text-green-600' : position < 0 ? 'text-red-600' : ''}`}>
                  Position: {position} {position > 0 ? '(Long)' : position < 0 ? '(Short)' : '(No Position)'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No positions</p>
        )}
      </div>

      {/* Orders History */}
      <div className="border rounded p-4">
        <h2 className="text-lg font-semibold mb-2">Order History</h2>
        {loading ? (
          <p>Loading...</p>
        ) : userOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Order ID</th>
                  <th className="text-left p-2">Market</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Price</th>
                  <th className="text-left p-2">Amount</th>
                  <th className="text-left p-2">Filled</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {userOrders.map(order => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{order.id}</td>
                    <td className="p-2">
                      <button 
                        onClick={() => router.push(`/markets/${order.marketId}`)}
                        className="text-blue-500 hover:underline"
                      >
                        #{order.marketId}
                      </button>
                    </td>
                    <td className="p-2">
                      <span className={`font-semibold ${order.isBuy ? 'text-green-600' : 'text-red-600'}`}>
                        {order.isBuy ? 'Buy' : 'Sell'}
                      </span>
                    </td>
                    <td className="p-2">{formatGwei(order.price)} gwei</td>
                    <td className="p-2">{order.amount.toString()}</td>
                    <td className="p-2">{order.filled.toString()}</td>
                    <td className="p-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        order.isResolved ? 'bg-purple-100 text-purple-800' :
                        order.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100'
                      }`}>
                        {order.isResolved ? 'Settled' : order.isActive ? 'Active' : 'Completed'}
                      </span>
                    </td>
                    <td className="p-2">{new Date(order.timestamp * 1000).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No orders found</p>
        )}
      </div>

      {/* Error Message */}
      {error && <div className="text-red-600 p-3 bg-red-50 rounded">Error: {error}</div>}
    </div>
  );
}