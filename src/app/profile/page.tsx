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

export default function ProfilePage() {
  const router = useRouter();
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const contracts = useContracts(signer);

  // User data state
  const [userBalance, setUserBalance] = useState<bigint>(0n);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [positions, setPositions] = useState<Array<[number, number]>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatEth = (wei: bigint | string) => ethers.formatEther(wei);
  const formatGwei = (wei: bigint | string) => ethers.formatUnits(wei, 'gwei');

  /* --- Contract Resolution --- */
  const getPolyPredictContract = () => {
    if (!contracts?.polyPredictMarket && signer) {
      return new ethers.Contract(CONTRACT_ADDRESSES.POLY_PREDICT_MARKET, PolyPredictMarketAbi, signer);
    }
    return contracts?.polyPredictMarket;
  };

  const getExchangeContract = async () => {
    const polyPredict = getPolyPredictContract();
    if (!polyPredict) return null;
    
    try {
      const exchangeAddress = await polyPredict.getExchangeAddress();
      return new ethers.Contract(exchangeAddress, CLOBExchangeAbi, signer);
    } catch (e) {
      console.error("Error getting Exchange contract:", e);
      return null;
    }
  };

  /* --- Data Loading --- */
  const loadUserBalance = async () => {
    if (!address || !contracts?.tokenManager) return;

    try {
      const balance = await contracts.tokenManager.getAvailableBalance(address);
      setUserBalance(balance);
    } catch (e) {
      console.error("Failed to load balance:", e);
    }
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
      const validPositions = positionResults.filter((p): p is [number, number] => p !== null);
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
  }, [signer, address, contracts]);

  const onConnect = (_prov: ethers.BrowserProvider, sgnr: ethers.Signer, addr: string) => {
    setSigner(sgnr);
    setAddress(addr);
  };

  /* --- Render --- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <button 
                onClick={() => router.back()} 
                className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-4"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              <h1 className="text-4xl font-bold text-gray-900">Your Profile</h1>
              <p className="text-lg text-gray-600 mt-2">View your trading activity and positions</p>
            </div>
            <WalletConnectButton onConnect={onConnect} />
          </div>

          {/* Wallet Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Wallet Information</h2>
            {address ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Wallet Address</p>
                  <p className="text-lg text-gray-900 font-mono">{address.slice(0, 6)}...{address.slice(-4)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Available Balance</p>
                  <p className="text-3xl font-bold text-gray-900">{formatEth(userBalance)} ETH</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Please connect your wallet to view your profile</p>
              </div>
            )}
          </div>

          {/* Positions Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Your Positions</h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
                <span className="ml-3 text-gray-600">Loading...</span>
              </div>
            ) : positions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {positions.map(([marketId, position]) => (
                  <div 
                    key={marketId} 
                    className={`p-6 rounded-lg border-2 transition-all ${
                      position > 0 ? 'border-green-200 bg-green-50' : 
                      position < 0 ? 'border-red-200 bg-red-50' : 
                      'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <p className="text-lg font-semibold text-gray-900 mb-2">Market #{marketId}</p>
                    <p className={`text-xl font-bold ${
                      position > 0 ? 'text-green-600' : 
                      position < 0 ? 'text-red-600' : 
                      'text-gray-900'
                    }`}>
                      Position: {position}
                      <span className="text-sm font-medium ml-2">
                        {position > 0 ? '(Long)' : position < 0 ? '(Short)' : ''}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No active positions</p>
              </div>
            )}
          </div>

          {/* Orders History */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Order History</h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
                <span className="ml-3 text-gray-600">Loading...</span>
              </div>
            ) : userOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-4 text-sm font-medium text-gray-600">Order ID</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-600">Market</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-600">Type</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-600">Price</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-600">Amount</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-600">Filled</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-600">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userOrders.map(order => (
                      <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="p-4 text-gray-900">{order.id}</td>
                        <td className="p-4">
                          <button 
                            onClick={() => router.push(`/markets/${order.marketId}`)}
                            className="text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            #{order.marketId}
                          </button>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                            order.isBuy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {order.isBuy ? 'Buy' : 'Sell'}
                          </span>
                        </td>
                        <td className="p-4 text-gray-900">{formatGwei(order.price)} gwei</td>
                        <td className="p-4 text-gray-900">{order.amount.toString()}</td>
                        <td className="p-4 text-gray-900">{order.filled.toString()}</td>
                        <td className="p-4">
                          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                            order.isResolved ? 'bg-purple-100 text-purple-700' :
                            order.isActive ? 'bg-green-100 text-green-700' : 
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {order.isResolved ? 'Settled' : order.isActive ? 'Active' : 'Completed'}
                          </span>
                        </td>
                        <td className="p-4 text-gray-900">{new Date(order.timestamp * 1000).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No orders found</p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-6 rounded-lg shadow-sm">
              <p className="font-medium">Error</p>
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}