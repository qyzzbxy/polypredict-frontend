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

interface DebugLog {
  step: string;
  data: any;
  error?: string;
  timestamp: string;
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

  // Debug state
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [showDebug, setShowDebug] = useState(false);

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

  const getFullExchangeContract = async () => {
    if (!contracts?.polyPredictMarket) return null;
    
    const exchangeAddress = await contracts.polyPredictMarket.getExchangeAddress();
    return new ethers.Contract(
      exchangeAddress,
      [
        "function getBestPrices(uint256) external view returns (uint256, uint256)",
        "function getPosition(address, uint256) external view returns (int256)",
        "function getUserOrders(address user) external view returns (uint256[] memory)",
        "function getOrder(uint256 orderId) external view returns (uint256 id, uint256 marketId, bool isBuy, uint256 price, uint256 amount, uint256 filled, bool isActive, bool isResolved, uint256 timestamp, address trader)",
        "event OrderPlaced(uint256 indexed orderId, address indexed trader, uint256 indexed marketId, bool isBuy, uint256 price, uint256 amount)",
        "event TradeExecuted(uint256 indexed tradeId, uint256 buyOrderId, uint256 sellOrderId, uint256 price, uint256 amount, uint256 marketId)",
        "event OrderFilled(uint256 indexed orderId, uint256 amount)"
      ],
      signer
    );
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

  /* --- Debug Functions --- */
  const checkOrderAfterSubmission = async (txHash: string) => {
    setShowDebug(true);
    addDebugLog("Starting Post-Order Diagnostic", {
      txHash,
      timestamp: new Date().toISOString(),
      address: address,
      marketId: marketId
    });

    try {
      // 等待交易回执
      const receipt = await signer?.provider?.getTransactionReceipt(txHash);
      addDebugLog("Transaction Receipt", {
        status: receipt?.status,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed?.toString(),
        logs: receipt?.logs?.length
      });

      // 解析交易日志
      if (receipt?.logs) {
        const exchange = await getFullExchangeContract();
        const abi = exchange?.interface;
        
        addDebugLog("Raw Logs", {
          count: receipt.logs.length,
          logs: receipt.logs.map(log => ({
            address: log.address,
            topics: log.topics?.map(t => t.slice(0, 10)),
            data: log.data?.slice(0, 20) + "..."
          }))
        });

        // 尝试解析每个日志
        let foundOrderId = null;
        receipt.logs.forEach((log, index) => {
          try {
            if (abi) {
              const parsed = abi.parseLog(log);
              addDebugLog(`Parsed Log ${index}`, {
                name: parsed?.name,
                orderId: parsed?.args?.orderId?.toString(),
                trader: parsed?.args?.trader,
                marketId: parsed?.args?.marketId?.toString(),
                isBuy: parsed?.args?.isBuy,
                price: parsed?.args?.price?.toString(),
                amount: parsed?.args?.amount?.toString()
              });
              
              if (parsed?.name === "OrderPlaced") {
                foundOrderId = parsed?.args?.orderId;
              }
            }
          } catch (e) {
            addDebugLog(`Log Parse Error ${index}`, {}, e.message);
          }
        });
      }

      const exchange = await getFullExchangeContract();
      if (!exchange) {
        addDebugLog("Exchange Contract Error", {}, "Could not get exchange contract");
        return;
      }

      // 使用多种方式查询 OrderPlaced 事件
      
      // 方法1：正确的过滤器参数顺序
      addDebugLog("Event Filter Details", {
        orderIdIndex: 0,  // indexed parameter index
        traderIndex: 1,   // indexed parameter index  
        marketIdIndex: 2  // indexed parameter index
      });

      // 查询交易所在区块的事件
      try {
        const filterCorrect = exchange.filters.OrderPlaced(null, address, marketId);
        const eventsInTxBlock = await exchange.queryFilter(filterCorrect, receipt?.blockNumber, receipt?.blockNumber);
        
        addDebugLog("Events in Transaction Block (Correct Filter)", {
          blockNumber: receipt?.blockNumber,
          eventCount: eventsInTxBlock.length,
          events: eventsInTxBlock.map(e => ({
            orderId: e.args?.orderId?.toString(),
            trader: e.args?.trader,
            marketId: e.args?.marketId?.toString(),
            isBuy: e.args?.isBuy,
            blockNumber: e.blockNumber,
            transactionHash: e.transactionHash
          }))
        });
      } catch (e) {
        addDebugLog("Event Query Error (Tx Block)", {}, e.message);
      }

      // 方法2：查询更大范围的区块
      try {
        const filterBroader = exchange.filters.OrderPlaced(null, address, marketId);
        const fromBlock = receipt?.blockNumber ? receipt.blockNumber - 10 : -1000;
        const toBlock = receipt?.blockNumber ? receipt.blockNumber + 1 : "latest";
        
        const eventsInRange = await exchange.queryFilter(filterBroader, fromBlock, toBlock);
        
        addDebugLog("Events in Block Range", {
          from: fromBlock,
          to: toBlock,
          eventCount: eventsInRange.length,
          events: eventsInRange.slice(-3).map(e => ({
            orderId: e.args?.orderId?.toString(),
            trader: e.args?.trader,
            marketId: e.args?.marketId?.toString(),
            blockNumber: e.blockNumber,
            transactionHash: e.transactionHash
          }))
        });
      } catch (e) {
        addDebugLog("Event Query Error (Block Range)", {}, e.message);
      }

      // 获取用户订单列表
      try {
        const userOrderIds = await exchange.getUserOrders(address);
        addDebugLog("User Orders", {
          orderCount: userOrderIds.length,
          orderIds: userOrderIds.map(id => id.toString()),
          latestOrders: userOrderIds.slice(-3).map(id => id.toString())
        });

        // 获取最新几个订单的详细信息
        const recentOrders = [];
        for (let i = Math.max(0, userOrderIds.length - 3); i < userOrderIds.length; i++) {
          try {
            const orderId = userOrderIds[i];
            const order = await exchange.getOrder(orderId);
            recentOrders.push({
              id: order.id.toString(),
              marketId: order.marketId.toString(),
              trader: order.trader,
              isBuy: order.isBuy,
              price: order.price.toString(),
              amount: order.amount.toString(),
              filled: order.filled.toString(),
              isActive: order.isActive,
              isResolved: order.isResolved,
              timestamp: order.timestamp.toString(),
              // 验证是否是我们的交易
              isFromThisTx: order.timestamp.toString() === Math.floor(Date.now() / 1000).toString()
            });
          } catch (e) {
            addDebugLog(`Order ${userOrderIds[i]} Error`, {}, e.message);
          }
        }

        addDebugLog("Recent Orders Details", {
          orders: recentOrders,
          count: recentOrders.length
        });
      } catch (e) {
        addDebugLog("User Orders Error", {}, e.message);
      }

      // 检查最佳价格
      try {
        const [bid, ask] = await exchange.getBestPrices(marketId);
        addDebugLog("Best Prices After Order", {
          bid: bid.toString(),
          ask: ask.toString(),
          bidGwei: formatGwei(bid),
          askGwei: formatGwei(ask)
        });
      } catch (e) {
        addDebugLog("Best Prices Error", {}, e.message);
      }

      // 检查用户位置
      try {
        const position = await exchange.getPosition(address, marketId);
        addDebugLog("User Position After Order", {
          position: position.toString(),
          marketId: marketId
        });
      } catch (e) {
        addDebugLog("Position Query Error", {}, e.message);
      }

    } catch (e) {
      addDebugLog("Diagnostic Error", {}, e.message);
    }
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
      
      // Run post-order diagnostic if this was an order transaction
      if (label === "Order") {
        await checkOrderAfterSubmission(tx.hash);
      }
      
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
  if (!validMarket) return <div className="p-6 text-red-600">Invalid market ID.</div>;

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      {/* Wallet & Navigation */}
      <div className="flex justify-between">
        <button onClick={() => router.back()} className="text-sm text-blue-500">← Back</button>
        <WalletConnectButton onConnect={onConnect} />
      </div>

      {/* Market Card */}
      <div className="border rounded p-4 space-y-2">
        {marketInfo ? (
          <>
            <h2 className="text-xl font-bold">{marketInfo.question}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p><span className="font-semibold">Outcomes:</span> {marketInfo.outcomes.join(' / ')}</p>
                <p><span className="font-semibold">Ends:</span> {new Date(marketInfo.endTime * 1000).toLocaleString()}</p>
              </div>
              <div>
                <p><span className="font-semibold">Status:</span> {MARKET_STATUS[marketInfo.status]}</p>
                {marketInfo.status === 1 && (
                  <p><span className="font-semibold">Resolved:</span> {marketInfo.outcomes[marketInfo.resolvedIdx]}</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <p>Loading market...</p>
        )}
      </div>

      {/* Market Prices */}
      <div className="border rounded p-4">
        <h3 className="font-semibold mb-2">Market Prices</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-3 rounded">
            <p className="text-xs text-gray-600">Best Bid</p>
            <p className="text-lg font-semibold text-green-700">{formatGwei(bestPrices.bid)} gwei</p>
            <p className="text-xs text-gray-600">
              {bestPrices.bid > 0n ? `Probability: ${getProbability(bestPrices.bid)}%` : 'No bids'}
            </p>
          </div>
          <div className="bg-red-50 p-3 rounded">
            <p className="text-xs text-gray-600">Best Ask</p>
            <p className="text-lg font-semibold text-red-700">{formatGwei(bestPrices.ask)} gwei</p>
            <p className="text-xs text-gray-600">
              {bestPrices.ask < MAX_PRICE ? `Probability: ${getProbability(bestPrices.ask)}%` : 'No asks'}
            </p>
          </div>
        </div>
      </div>

      {/* Balance & Position */}
      <div className="border rounded p-4 grid grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Balance</h3>
            <button
              onClick={refreshBalance}
              disabled={refreshingBalance}
              className={`px-3 py-1 text-sm rounded ${
                refreshingBalance 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              }`}
            >
              {refreshingBalance ? '🔄' : '⟳ Refresh'}
            </button>
          </div>
          <p className="text-lg font-semibold">{formatEth(userBalance)} ETH</p>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Position</h3>
          <p className={`text-lg font-semibold ${userPosition > 0 ? 'text-green-600' : userPosition < 0 ? 'text-red-600' : ''}`}>
            {userPosition || '0'} {userPosition > 0 ? '(Long)' : userPosition < 0 ? '(Short)' : ''}
          </p>
        </div>
      </div>

      {/* Deposit */}
      <div className="border rounded p-4 space-y-2">
        <h3 className="font-semibold">Deposit ETH</h3>
        <div className="flex space-x-2">
          <input
            type="number"
            value={depositEth}
            onChange={(e) => setDepositEth(e.target.value)}
            className="border p-2 rounded flex-grow"
          />
          <button onClick={deposit} disabled={loading} className="p-2 bg-blue-600 text-white rounded">
            {loading ? 'Processing...' : 'Deposit'}
          </button>
        </div>
      </div>

      {/* Order Form */}
      <div className="border rounded p-4 space-y-4">
        <h3 className="font-semibold">Place Order</h3>
        
        <div className="flex gap-4">
          {["limit", "market"].map(type => (
            <label key={type} className="flex items-center">
              <input type="radio" checked={orderType === type} onChange={() => setOrderType(type as any)} />
              <span className="ml-1 capitalize">{type} Order</span>
            </label>
          ))}
        </div>
        
        <div className="flex gap-4">
          {[{ value: true, label: "Buy (Long)" }, { value: false, label: "Sell (Short)" }].map(({ value, label }) => (
            <label key={String(value)} className="flex items-center">
              <input type="radio" checked={isBuy === value} onChange={() => setIsBuy(value)} />
              <span className="ml-1">{label}</span>
            </label>
          ))}
        </div>
        
        {orderType === "limit" && (
          <div>
            <label className="text-sm text-gray-600">Price (gwei)</label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="border p-2 rounded w-full"
            />
            <div className="text-xs text-gray-500 mt-1">Probability: {getProbability(price)}%</div>
          </div>
        )}
        
        <div>
          <label className="text-sm text-gray-600">Amount</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>
        
        <button
          onClick={placeOrder}
          disabled={loading}
          className={`p-2 text-white rounded w-full ${isBuy ? 'bg-green-600' : 'bg-red-600'}`}
        >
          {loading ? 'Processing...' : `${isBuy ? 'Buy' : 'Sell'}`}
        </button>
      </div>

      {/* Order Info */}
      {orderInfo && (
        <div className={`border rounded p-4 ${orderInfo.error ? 'bg-red-50' : 'bg-blue-50'}`}>
          <h3 className="font-semibold mb-2">Order Information</h3>
          <div className="space-y-1">
            <p><span className="font-semibold">Type:</span> {orderInfo.type} order</p>
            <p><span className="font-semibold">Side:</span> {orderInfo.isBuy ? 'Buy (Long)' : 'Sell (Short)'}</p>
            {orderInfo.price && (
              <p><span className="font-semibold">Price:</span> {formatGwei(orderInfo.price)} gwei</p>
            )}
            <p><span className="font-semibold">Amount:</span> {orderInfo.amount}</p>
            {orderInfo.estimatedProbability && (
              <p><span className="font-semibold">Estimated Probability:</span> {orderInfo.estimatedProbability}%</p>
            )}
            {orderInfo.txHash && (
              <p><span className="font-semibold">Transaction Hash:</span> {orderInfo.txHash.slice(0, 10)}...{orderInfo.txHash.slice(-8)}</p>
            )}
            {orderInfo.error && (
              <p><span className="font-semibold">Error:</span> {orderInfo.error}</p>
            )}
          </div>
        </div>
      )}

      {/* Debug Logs */}
      {showDebug && (
        <div className="border rounded p-4 bg-gray-50 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Debug Logs:</h3>
            <button 
              onClick={() => setShowDebug(false)}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded"
            >
              Hide Logs
            </button>
          </div>
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

      {/* Claim Profit */}
      <div className="border rounded p-4">
        <h3 className="font-semibold mb-2">Claim Profit</h3>
        <button
          onClick={claimProfit}
          disabled={loading || marketInfo?.status !== 1}
          className="p-2 bg-purple-600 text-white rounded w-full"
        >
          {loading ? 'Processing...' : 'Claim Profit'}
        </button>
      </div>

      {/* Error */}
      {error && <div className="text-red-600 p-3 bg-red-50 rounded">Error: {error}</div>}
    </div>
  );
}