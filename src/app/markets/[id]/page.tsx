/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ethers } from "ethers";
import { useContracts } from "@/hooks/useContracts";
import WalletConnectButton from "@/components/ui/WalletConnectButton";

const MARKET_STATUS = { 0: "Active", 1: "Resolved", 2: "Cancelled" };
const MAX_PRICE = 1000000n; // 1,000,000 gwei

interface OrderInfo {
  type: string;
  isBuy: boolean;
  price?: string;
  amount: string;
  txHash?: string;
  error?: string;
  estimatedProbability?: string;
}

export default function MarketDetailPage() {
  const router = useRouter();
  const { id: rawId } = useParams<{ id: string }>();
  const marketId = Number(rawId);
  const validMarket = Number.isFinite(marketId) && marketId > 0;

  // Wallet state
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const contracts = useContracts(signer);

  // Market and contract state
  const [marketInfo, setMarketInfo] = useState<any>(null);
  const [userBalance, setUserBalance] = useState<bigint>(0n);
  const [bestPrices, setBestPrices] = useState({ bid: 0n, ask: MAX_PRICE });
  const [userPosition, setUserPosition] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshingBalance, setRefreshingBalance] = useState(false);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);

  // Form state
  const [depositEth, setDepositEth] = useState("0.001");
  const [price, setPrice] = useState("500000");
  const [amount, setAmount] = useState("1");
  const [isBuy, setIsBuy] = useState(true);
  const [orderType, setOrderType] = useState<"limit" | "market">("limit");

  const formatEth = (wei: bigint | string) => ethers.formatEther(wei);
  const formatGwei = (wei: bigint | string) => {
    const weiValue = typeof wei === 'string' ? BigInt(wei) : wei;
    return ethers.formatUnits(weiValue, 'gwei');
  };
  
  const getProbability = (gweiPrice: string | bigint) => {
    const priceValue = typeof gweiPrice === 'string' ? BigInt(gweiPrice) : gweiPrice;
    // 计算概率为 (price / MAX_PRICE) * 100%
    const probability = (Number(priceValue * 100n) / Number(MAX_PRICE));
    const clampedProbability = Math.max(0, Math.min(100, probability));
    return clampedProbability.toFixed(1);
  };

  const getExchangeContract = async () => {
    if (!contracts?.polyPredictMarket) return null;
    
    const exchangeAddress = await contracts.polyPredictMarket.getExchangeAddress();
    return new ethers.Contract(
      exchangeAddress,
      [
        "function getBestPrices(uint256) external view returns (uint256, uint256)",
        "function getPosition(address, uint256) external view returns (int256)"
      ],
      signer
    );
  };

  /* --- Data Loading --- */
  const loadMarketInfo = async () => {
    if (!contracts?.predictionMarket || !validMarket) return;
    try {
      const info = await contracts.predictionMarket.getMarket(marketId);
      setMarketInfo({
        question: info.question,
        outcomes: info.outcomes,
        endTime: Number(info.endTime),
        status: Number(info.status),
        resolvedIdx: Number(info.resolvedOutcomeIndex),
        creator: info.creator
      });
    } catch (e) {
      console.error("Failed to load market info:", e);
      setError("Market not found or loading failed");
    }
  };

  const loadUserBalance = async () => {
    if (!address || !contracts?.tokenManager) return;
    try {
      const balance = await contracts.tokenManager.getAvailableBalance(address);
      setUserBalance(balance);
    } catch (e) {
      console.error("Failed to load balance:", e);
    }
  };

  const refreshBalance = async () => {
    setRefreshingBalance(true);
    try {
      await loadUserBalance();
    } catch (e) {
      console.error("Failed to refresh balance:", e);
      setError("Failed to refresh balance");
    } finally {
      setRefreshingBalance(false);
    }
  };

  const loadBestPrices = async () => {
    if (!validMarket) return;
    const exchange = await getExchangeContract();
    if (!exchange) return;
    
    try {
      const [bid, ask] = await exchange.getBestPrices(marketId);
      setBestPrices({ bid, ask });
    } catch (e) {
      console.error("Failed to load best prices:", e);
    }
  };

  const loadUserPosition = async () => {
    if (!address || !validMarket) return;
    const exchange = await getExchangeContract();
    if (!exchange) return;
    
    try {
      const position = await exchange.getPosition(address, marketId);
      setUserPosition(Number(position));
    } catch (e) {
      console.error("Failed to load position:", e);
    }
  };

  const refreshData = async () => {
    await Promise.all([
      loadMarketInfo(),
      loadUserBalance(),
      loadBestPrices(),
      loadUserPosition()
    ]);
  };

  /* --- Transaction Handler --- */
  const handleTx = async (label: string, fn: () => Promise<ethers.TransactionResponse>) => {
    setLoading(true);
    setError(null);
    setOrderInfo(null);
    
    try {
      const tx = await fn();
      
      // Show transaction hash immediately
      setOrderInfo(prevInfo => ({
        ...prevInfo!,
        txHash: tx.hash
      }));
      
      await tx.wait();
      
      await refreshData();
    } catch (e: any) {
      setError(e.shortMessage ?? e.message);
      setOrderInfo(prevInfo => prevInfo ? {
        ...prevInfo,
        error: e.shortMessage ?? e.message
      } : null);
    } finally {
      setLoading(false);
    }
  };

  /* --- Actions --- */
  const deposit = () => handleTx("Deposit", async () => {
    if (!contracts?.tokenManager) throw new Error("TokenManager not available");
    return contracts.tokenManager.deposit({ value: ethers.parseEther(depositEth) });
  });

  const placeOrder = () => {
    const priceBigInt = BigInt(price);
    const amountBigInt = BigInt(amount);
    
    // Create order info for display
    const orderInfoObj: OrderInfo = {
      type: orderType,
      isBuy: isBuy,
      amount: amount,
      estimatedProbability: orderType === "limit" ? getProbability(price) : undefined
    };
    
    if (orderType === "limit") {
      orderInfoObj.price = price;
    }
    
    setOrderInfo(orderInfoObj);
    
    handleTx("Order", async () => {
      if (!contracts?.tokenManager || !validMarket) throw new Error("Invalid contract or market");
      
      if (orderType === "limit") {
        return contracts.tokenManager.placeOrderWithFunds(marketId, isBuy, priceBigInt, amountBigInt);
      } else {
        return contracts.tokenManager.placeMarketOrderWithFunds(marketId, isBuy, amountBigInt);
      }
    });
  };

  const claimProfit = () => handleTx("Claim", async () => {
    if (!contracts?.tokenManager) throw new Error("TokenManager not available");
    return contracts.tokenManager.claimProfit(marketId);
  });

  /* --- Effects --- */
  useEffect(() => {
    if (signer && address) {
      refreshData();
      const interval = setInterval(loadBestPrices, 30000);
      return () => clearInterval(interval);
    }
  }, [signer, address]);

  const onConnect = (prov: ethers.BrowserProvider, sgnr: ethers.Signer, addr: string) => {
    setSigner(sgnr);
    setAddress(addr);
  };

  /* --- Render --- */
  if (!validMarket) return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-6 rounded-lg shadow-sm">
          <p className="font-medium">Invalid market ID.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header with Navigation & Wallet */}
          <div className="flex justify-between items-center">
            <button 
              onClick={() => router.back()} 
              className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Markets
            </button>
            <WalletConnectButton onConnect={onConnect} />
          </div>

          {/* Market Information Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            {marketInfo ? (
              <>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">{marketInfo.question}</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Outcomes</p>
                      <p className="text-lg text-gray-900">{marketInfo.outcomes.join(' / ')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">End Time</p>
                      <p className="text-lg text-gray-900">
                        {new Date(marketInfo.endTime * 1000).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Status</p>
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        marketInfo.status === 0 ? 'bg-green-100 text-green-800' :
                        marketInfo.status === 1 ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {MARKET_STATUS[marketInfo.status]}
                      </span>
                    </div>
                    {marketInfo.status === 1 && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">Resolved Outcome</p>
                        <p className="text-lg text-green-600 font-medium">
                          {marketInfo.outcomes[marketInfo.resolvedIdx]}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-6"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            )}
          </div>

          {/* Market Prices */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Market Prices</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                <p className="text-sm text-gray-600 font-medium mb-1">Best Bid</p>
                <p className="text-3xl font-bold text-green-700 mb-2">
                  {formatGwei(bestPrices.bid)} <span className="text-lg text-gray-600">gwei</span>
                </p>
                <p className="text-sm text-gray-600">
                  {bestPrices.bid > 0n ? `Probability: ${getProbability(bestPrices.bid)}%` : 'No bids'}
                </p>
              </div>
              <div className="bg-red-50 p-6 rounded-xl border border-red-200">
                <p className="text-sm text-gray-600 font-medium mb-1">Best Ask</p>
                <p className="text-3xl font-bold text-red-700 mb-2">
                  {formatGwei(bestPrices.ask)} <span className="text-lg text-gray-600">gwei</span>
                </p>
                <p className="text-sm text-gray-600">
                  {bestPrices.ask < MAX_PRICE ? `Probability: ${getProbability(bestPrices.ask)}%` : 'No asks'}
                </p>
              </div>
            </div>
          </div>

          {/* Balance & Position */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Account Balance</h3>
                <button
                  onClick={refreshBalance}
                  disabled={refreshingBalance}
                  className={`inline-flex items-center px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    refreshingBalance 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                  }`}
                >
                  {refreshingBalance ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"></circle>
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    '⟳'
                  )}
                  <span className="ml-1.5">{refreshingBalance ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>
              <p className="text-4xl font-bold text-gray-900">
                {formatEth(userBalance)} <span className="text-lg text-gray-600">ETH</span>
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Position</h3>
              <p className={`text-4xl font-bold ${
                userPosition > 0 ? 'text-green-600' : 
                userPosition < 0 ? 'text-red-600' : 
                'text-gray-900'
              }`}>
                {userPosition || '0'}
                <span className="text-lg font-medium text-gray-600 ml-2">
                  {userPosition > 0 ? '(Long)' : userPosition < 0 ? '(Short)' : ''}
                </span>
              </p>
            </div>
          </div>

          {/* Deposit ETH */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Deposit ETH</h3>
            <div className="flex space-x-4">
              <input
                type="number"
                value={depositEth}
                onChange={(e) => setDepositEth(e.target.value)}
                className="flex-grow px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="0.001"
              />
              <button 
                onClick={deposit} 
                disabled={loading} 
                className={`px-8 py-3 rounded-lg font-medium text-white transition-colors ${
                  loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {loading ? 'Processing...' : 'Deposit'}
              </button>
            </div>
          </div>

          {/* Order Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Place Order</h3>
            
            <div className="space-y-6">
              {/* Order Type */}
              <div className="flex gap-6">
                {["limit", "market"].map(type => (
                  <label key={type} className="flex items-center cursor-pointer">
                    <input 
                      type="radio" 
                      checked={orderType === type} 
                      onChange={() => setOrderType(type as any)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <span className="ml-3 text-gray-700 capitalize">{type} Order</span>
                  </label>
                ))}
              </div>
              
              {/* Buy/Sell */}
              <div className="flex gap-6">
                {[{ value: true, label: "Buy (Long)" }, { value: false, label: "Sell (Short)" }].map(({ value, label }) => (
                  <label key={String(value)} className="flex items-center cursor-pointer">
                    <input 
                      type="radio" 
                      checked={isBuy === value} 
                      onChange={() => setIsBuy(value)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <span className="ml-3 text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
              
              {/* Price Input */}
              {orderType === "limit" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (gwei)
                  </label>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="500000"
                  />
                  <p className="mt-2 text-sm text-gray-600">
                    Probability: {getProbability(price)}%
                  </p>
                </div>
              )}
              
              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="1"
                />
              </div>
              
              {/* Submit Button */}
              <button
                onClick={placeOrder}
                disabled={loading}
                className={`w-full py-4 rounded-lg font-semibold text-white transition-colors ${
                  loading ? 'bg-gray-400 cursor-not-allowed' :
                  isBuy ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {loading ? 'Processing...' : `${isBuy ? 'Buy' : 'Sell'}`}
              </button>
            </div>
          </div>

          {/* Order Information */}
          {orderInfo && (
            <div className={`rounded-xl shadow-sm border p-8 ${
              orderInfo.error ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
            }`}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h3>
              <div className="space-y-3">
                <p className="text-gray-700">
                  <span className="font-medium">Type:</span> {orderInfo.type} order
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Side:</span> {orderInfo.isBuy ? 'Buy (Long)' : 'Sell (Short)'}
                </p>
                {orderInfo.price && (
                  <p className="text-gray-700">
                    <span className="font-medium">Price:</span> {formatGwei(orderInfo.price)} gwei
                  </p>
                )}
                <p className="text-gray-700">
                  <span className="font-medium">Amount:</span> {orderInfo.amount}
                </p>
                {orderInfo.estimatedProbability && (
                  <p className="text-gray-700">
                    <span className="font-medium">Estimated Probability:</span> {orderInfo.estimatedProbability}%
                  </p>
                )}
                {orderInfo.txHash && (
                  <p className="text-gray-700 break-all">
                    <span className="font-medium">Transaction Hash:</span> {orderInfo.txHash}
                  </p>
                )}
                {orderInfo.error && (
                  <p className="text-red-700">
                    <span className="font-medium">Error:</span> {orderInfo.error}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Claim Profit */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Claim Profit</h3>
            <button
              onClick={claimProfit}
              disabled={loading || marketInfo?.status !== 1}
              className={`w-full py-4 rounded-lg font-semibold text-white transition-colors ${
                loading || marketInfo?.status !== 1 
                  ? 'bg-purple-300 cursor-not-allowed' 
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {loading ? 'Processing...' : 'Claim Profit'}
            </button>
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