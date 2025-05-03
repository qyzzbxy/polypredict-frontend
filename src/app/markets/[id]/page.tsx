/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ethers } from "ethers";
import { useContracts } from "@/hooks/useContracts";
import WalletConnectButton from "@/components/ui/WalletConnectButton";
import TokenManagerAbi from "@/abi/TokenManager.json";
import PolyPredictMarketAbi from "@/abi/PolyPredictMarket.json";
import { CONTRACT_ADDRESSES } from "@/constants/contracts";

// Market status enum
const MarketStatus = {
  0: "Active",
  1: "Resolved",
  2: "Cancelled"
};

/** Market detail page – fully ethers v6 / English UI */
export default function MarketDetailPage() {
  /* ------------- routing ------------- */
  const router = useRouter();
  const { id: rawId } = useParams<{ id: string }>();
  const marketId = Number(rawId);
  const validMarket = Number.isFinite(marketId);

  /* ------------- wallet ------------- */
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  const contracts = useContracts(signer);

  /* ------------- state ------------- */
  const [marketInfo, setMarketInfo] = useState<any>(null);
  const [userBalance, setUserBalance] = useState<bigint>(0n);
  const [tokenManager, setTokenManager] = useState<ethers.Contract | null>(null);
  const [polyPredict, setPolyPredict] = useState<ethers.Contract | null>(null);
  const [exchange, setExchange] = useState<ethers.Contract | null>(null);

  // Best prices
  const [bestBidPrice, setBestBidPrice] = useState<bigint>(0n);
  const [bestAskPrice, setBestAskPrice] = useState<bigint>(BigInt('1000000'));
  
  // User position
  const [userPosition, setUserPosition] = useState<{amount: string}|null>(null);
  
  // User orders
  const [userOrders, setUserOrders] = useState<any[]>([]);

  // Form state
  const [depositEth, setDepositEth] = useState("0.001");
  const [price, setPrice] = useState("500000"); // gwei
  const [amount, setAmount] = useState("1");
  const [isBuy, setIsBuy] = useState(true);
  const [orderType, setOrderType] = useState<"limit" | "market">("limit");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"orders" | "position">("orders");

  const log = (msg: unknown) => {
    const t = typeof msg === "object" ? JSON.stringify(msg) : String(msg);
    console.log(t);
    setLogs((prev) => [...prev, t]);
  };
  
  const formatEth = (wei: bigint | string) => ethers.formatEther(wei);
  const formatGwei = (wei: bigint | string) => {
    try {
      return ethers.formatUnits(wei, 'gwei');
    } catch {
      return "0";
    }
  };

  /* -------- helper: resolve contracts -------- */
  const resolvePolyPredict = async () => {
    if (polyPredict) return polyPredict;
    if (contracts?.polyPredictMarket) {
      setPolyPredict(contracts.polyPredictMarket);
      return contracts.polyPredictMarket;
    }
    if (signer) {
      const instance = new ethers.Contract(
        CONTRACT_ADDRESSES.POLY_PREDICT_MARKET,
        PolyPredictMarketAbi,
        signer
      );
      setPolyPredict(instance);
      return instance;
    }
    return null;
  };

  const resolveTokenManager = async (): Promise<ethers.Contract | null> => {
    if (tokenManager) return tokenManager;
    if (contracts?.tokenManager) {
      setTokenManager(contracts.tokenManager);
      return contracts.tokenManager;
    }
    if (signer) {
      try {
        const tm = new ethers.Contract(CONTRACT_ADDRESSES.TOKEN_MANAGER, TokenManagerAbi, signer);
        await tm.callStatic.getAvailableBalance(address ?? ethers.ZeroAddress);
        setTokenManager(tm);
        return tm;
      } catch {}
    }
    log("❌ TokenManager not resolved");
    return null;
  };

  const resolveExchange = async (): Promise<ethers.Contract | null> => {
    if (exchange) return exchange;
    if (contracts?.exchange) {
      setExchange(contracts.exchange);
      return contracts.exchange;
    }
    if (polyPredict) {
      try {
        const exchangeAddress = await polyPredict.getExchangeAddress();
        const instance = new ethers.Contract(
          exchangeAddress,
          [
            "function getBestPrices(uint256 marketId) external view returns (uint256 bestBidPrice, uint256 bestAskPrice)",
            "function getPosition(address trader, uint256 marketId) external view returns (int256 amount)",
            "function getUserOrders(address user) external view returns (uint256[] memory)",
            "function getOrder(uint256 orderId) external view returns (tuple(uint256 id, address trader, bool isBuy, uint256 price, uint256 amount, uint256 filled, uint256 timestamp, bool isActive, uint256 marketId, bool isResolved) memory)"
          ],
          signer
        );
        setExchange(instance);
        return instance;
      } catch (e) {
        log(`Exchange resolve error: ${(e as Error).message}`);
      }
    }
    return null;
  };

  /* -------- balance -------- */
  const refreshBalance = async () => {
    if (!address) return;
    const tm = await resolveTokenManager();
    if (!tm) return;
    try {
      const bal: bigint = await tm.getAvailableBalance(address);
      setUserBalance(bal);
      log(`Balance updated: ${formatEth(bal)} ETH`);
    } catch (e) {
      log(`Balance fetch error: ${(e as Error).message}`);
    }
  };

  /* -------- market info -------- */
  const loadMarket = async () => {
    if (!contracts?.predictionMarket || !validMarket) return;
    try {
      const info = await contracts.predictionMarket.getMarket(String(marketId));
      setMarketInfo({
        question: info.question,
        outcomes: info.outcomes,
        endTime: Number(info.endTime ?? 0n),
        status: Number(info.status ?? 0n),
        resolvedIdx: Number(info.resolvedOutcomeIndex ?? 0n),
        creator: info.creator,
        creationTime: Number(info.creationTime ?? 0n),
      });
    } catch (e) {
      log(`Market load failed: ${(e as Error).message}`);
    }
  };

  /* -------- market prices -------- */
  const loadBestPrices = async () => {
    if (!validMarket) return;
    const exch = await resolveExchange();
    if (!exch) return;
    
    try {
      const [bid, ask] = await exch.getBestPrices(String(marketId));
      setBestBidPrice(bid);
      setBestAskPrice(ask);
      log(`Best prices updated: Bid=${formatGwei(bid)} gwei, Ask=${formatGwei(ask)} gwei`);
    } catch (e) {
      log(`Price fetch error: ${(e as Error).message}`);
    }
  };

  /* -------- user position -------- */
  const loadUserPosition = async () => {
    if (!address || !validMarket) return;
    const exch = await resolveExchange();
    if (!exch) return;
    
    try {
      const position = await exch.getPosition(address, String(marketId));
      setUserPosition({ amount: position.toString() });
      log(`User position: ${position.toString()}`);
    } catch (e) {
      log(`Position fetch error: ${(e as Error).message}`);
    }
  };

  /* -------- user orders -------- */
  const loadUserOrders = async () => {
    if (!address) return;
    const exch = await resolveExchange();
    if (!exch) return;
    
    try {
      // Get order IDs
      const orderIds = await exch.getUserOrders(address);
      
      // Get order details
      const orders = [];
      for (const id of orderIds) {
        const order = await exch.getOrder(id);
        
        // Only show orders for this market
        if (Number(order.marketId) === marketId) {
          orders.push({
            id: Number(order.id),
            isBuy: order.isBuy,
            price: order.price,
            amount: order.amount,
            filled: order.filled,
            isActive: order.isActive,
            isResolved: order.isResolved,
            timestamp: Number(order.timestamp)
          });
        }
      }
      
      setUserOrders(orders);
      log(`Loaded ${orders.length} orders`);
    } catch (e) {
      log(`Orders fetch error: ${(e as Error).message}`);
    }
  };

  /* -------- unified tx wrapper -------- */
  const withTx = async (label: string, fn: () => Promise<ethers.TransactionResponse>) => {
    setLoading(true);
    setError(null);
    try {
      const tx = await fn();                // broadcast
      log(`${label} tx: ${tx.hash}`);
      const rc = await tx.wait();           // confirm
      if (rc.status !== 1n) throw new Error("Transaction reverted");
      
      // Refresh data
      await refreshBalance();
      await loadBestPrices();
      await loadUserPosition();
      await loadUserOrders();
      
    } catch (e: any) {
      const msg = e.shortMessage ?? e.message;
      setError(msg);
      log(`${label} failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  /* -------- actions -------- */
  const deposit = () =>
    withTx("Deposit", async () => {
      const contract = await resolvePolyPredict();
      if (!contract) throw new Error("PolyPredict contract missing");
      const value = ethers.parseEther(depositEth);
      // static call – pre‑flight check
      await contract.callStatic.deposit({ value });
      return contract.deposit({ value });
    });

  const placeOrder = () =>
    withTx("Order", async () => {
      const contract = await resolvePolyPredict();
      if (!contract) throw new Error("PolyPredict contract missing");
      if (!validMarket) throw new Error("Invalid market");
      
      if (orderType === "limit") {
        return contract.placeOrder(String(marketId), isBuy, price, amount);
      } else {
        return contract.placeMarketOrder(String(marketId), isBuy, amount);
      }
    });

  const cancelOrder = (orderId: number) =>
    withTx("Cancel", async () => {
      const contract = await resolvePolyPredict();
      if (!contract) throw new Error("PolyPredict contract missing");
      return contract.cancelOrder(String(orderId));
    });

  const claimProfit = () =>
    withTx("Claim", async () => {
      const contract = await resolvePolyPredict();
      if (!contract) throw new Error("PolyPredict contract missing");
      return contract.claimProfit(String(marketId));
    });

  /* -------- effects -------- */
  useEffect(() => {
    if (signer && address) {
      loadMarket();
      refreshBalance();
      
      // Resolve contracts and load data
      (async () => {
        await resolvePolyPredict();
        await resolveExchange();
        await loadBestPrices();
        await loadUserPosition();
        await loadUserOrders();
      })();
      
      // Set polling for price updates
      const priceInterval = setInterval(loadBestPrices, 30000); // Every 30 seconds
      
      return () => {
        clearInterval(priceInterval);
      };
    }
  }, [signer, address]);

  /* -------- wallet callback -------- */
  const onConnect = (prov: ethers.BrowserProvider, sgnr: ethers.Signer, addr: string) => {
    setProvider(prov);
    setSigner(sgnr);
    setAddress(addr);
  };

  /* -------- probability helpers -------- */
  const getProbability = (gweiPrice: string | bigint) => {
    try {
      const price = BigInt(gweiPrice);
      const maxPrice = BigInt(1000000);
      return (Number(price) / Number(maxPrice) * 100).toFixed(1);
    } catch {
      return "0.0";
    }
  };

  /* -------- render -------- */
  if (!validMarket) return <div className="p-6">Invalid market ID.</div>;

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      {/* top bar */}
      <div className="flex justify-between">
        <button onClick={() => router.back()} className="text-sm text-blue-500">← Back</button>
        <WalletConnectButton onConnect={onConnect} />
      </div>

      {/* market card */}
      {marketInfo ? (
        <div className="border rounded p-4 space-y-2">
          <h2 className="text-xl font-bold">{marketInfo.question}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><span className="font-semibold">Outcomes:</span> {marketInfo.outcomes.join(' / ')}</p>
              <p><span className="font-semibold">Created:</span> {new Date(marketInfo.creationTime * 1000).toLocaleString()}</p>
              <p><span className="font-semibold">Ends:</span> {new Date(marketInfo.endTime * 1000).toLocaleString()}</p>
            </div>
            <div>
              <p><span className="font-semibold">Status:</span> {MarketStatus[marketInfo.status]}</p>
              {marketInfo.status === 1 && (
                <p><span className="font-semibold">Resolved Outcome:</span> {marketInfo.outcomes[marketInfo.resolvedIdx]}</p>
              )}
              <p><span className="font-semibold">Creator:</span> {marketInfo.creator?.slice(0, 6)}...{marketInfo.creator?.slice(-4)}</p>
            </div>
          </div>
        </div>
      ) : (
        <p>Loading market...</p>
      )}

      {/* market prices */}
      <div className="border rounded p-4">
        <h3 className="font-semibold mb-2">Market Prices</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-3 rounded">
            <p className="text-xs text-gray-600">Best Bid (Buy Price)</p>
            <p className="text-lg font-semibold text-green-700">{formatGwei(bestBidPrice)} gwei</p>
            <p className="text-xs text-gray-600">Implied Probability: {getProbability(bestBidPrice)}%</p>
          </div>
          <div className="bg-red-50 p-3 rounded">
            <p className="text-xs text-gray-600">Best Ask (Sell Price)</p>
            <p className="text-lg font-semibold text-red-700">{formatGwei(bestAskPrice)} gwei</p>
            <p className="text-xs text-gray-600">Implied Probability: {getProbability(bestAskPrice)}%</p>
          </div>
        </div>
      </div>

      {/* User balances and position */}
      <div className="border rounded p-4 grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold mb-2">Balance</h3>
          <p className="text-lg font-semibold">{formatEth(userBalance)} ETH</p>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Current Position</h3>
          {userPosition ? (
            <p className={`text-lg font-semibold ${Number(userPosition.amount) > 0 ? 'text-green-600' : Number(userPosition.amount) < 0 ? 'text-red-600' : ''}`}>
              {userPosition.amount} {Number(userPosition.amount) > 0 ? '(Long)' : Number(userPosition.amount) < 0 ? '(Short)' : '(No Position)'}
            </p>
          ) : (
            <p>Loading...</p>
          )}
        </div>
      </div>

      {/* deposit */}
      <div className="border rounded p-4 space-y-2">
        <h3 className="font-semibold">Deposit ETH</h3>
        <div className="flex space-x-2">
          <input
            type="number"
            min="0.0001"
            step="0.001"
            value={depositEth}
            onChange={(e) => setDepositEth(e.target.value)}
            className="border p-2 rounded flex-grow"
          />
          <button
            onClick={deposit}
            disabled={loading || Number(depositEth) <= 0}
            className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 w-32"
          >
            {loading ? 'Processing...' : 'Deposit'}
          </button>
        </div>
      </div>

      {/* order form */}
      <div className="border rounded p-4 space-y-4">
        <h3 className="font-semibold">Place an Order</h3>
        
        {/* Order type */}
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input 
              type="radio" 
              checked={orderType === "limit"} 
              onChange={() => setOrderType("limit")} 
            />
            <span className="ml-1">Limit Order</span>
          </label>
          <label className="flex items-center">
            <input 
              type="radio" 
              checked={orderType === "market"} 
              onChange={() => setOrderType("market")} 
            />
            <span className="ml-1">Market Order</span>
          </label>
        </div>
        
        {/* Buy/Sell */}
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input type="radio" checked={isBuy} onChange={() => setIsBuy(true)} />
            <span className="ml-1">Buy (Long)</span>
          </label>
          <label className="flex items-center">
            <input type="radio" checked={!isBuy} onChange={() => setIsBuy(false)} />
            <span className="ml-1">Sell (Short)</span>
          </label>
        </div>
        
        {/* Price - only for limit orders */}
        {orderType === "limit" && (
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Price (gwei)</label>
            <input
              placeholder="Price (gwei)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="border p-2 rounded w-full"
            />
            <div className="text-xs text-gray-500">Implied Probability: {getProbability(price)}%</div>
            
            <div className="flex space-x-2 mt-2">
              <button 
                onClick={() => setPrice(formatGwei(bestBidPrice))} 
                className="text-xs bg-gray-100 px-2 py-1 rounded"
              >
                Use Best Bid
              </button>
              <button 
                onClick={() => setPrice(formatGwei(bestAskPrice))} 
                className="text-xs bg-gray-100 px-2 py-1 rounded"
              >
                Use Best Ask
              </button>
            </div>
          </div>
        )}
        
        {/* Amount */}
        <div className="space-y-1">
          <label className="text-sm text-gray-600">Amount</label>
          <input
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>
        
        {/* Submit button */}
        <button
          onClick={placeOrder}
          disabled={loading}
          className={`p-2 text-white rounded hover:bg-opacity-90 disabled:bg-gray-400 w-full ${isBuy ? 'bg-green-600' : 'bg-red-600'}`}
        >
          {loading ? 'Processing...' : `${isBuy ? 'Buy' : 'Sell'} ${orderType === "market" ? '(Market)' : ''}`}
        </button>
      </div>

      {/* Tabs for orders and positions */}
      <div className="border rounded">
        <div className="flex border-b">
          <button 
            className={`py-2 px-4 ${activeTab === "orders" ? 'bg-gray-100 font-semibold' : ''}`}
            onClick={() => setActiveTab("orders")}
          >
            My Orders
          </button>
          <button 
            className={`py-2 px-4 ${activeTab === "position" ? 'bg-gray-100 font-semibold' : ''}`}
            onClick={() => setActiveTab("position")}
          >
            Position Management
          </button>
        </div>
        
        <div className="p-4">
          {activeTab === "orders" ? (
            <div>
              <h3 className="font-semibold mb-2">My Orders</h3>
              {userOrders.length > 0 ? (
                <div className="space-y-2">
                  {userOrders.map(order => (
                    <div key={order.id} className="border p-2 rounded flex justify-between items-center">
                      <div>
                        <span className={`font-semibold ${order.isBuy ? 'text-green-600' : 'text-red-600'}`}>
                          {order.isBuy ? 'Buy' : 'Sell'}
                        </span>
                        <span className="mx-1">@</span>
                        <span>{formatGwei(order.price)} gwei</span>
                        <div className="text-sm text-gray-600">
                          Amount: {order.amount.toString()} | Filled: {order.filled.toString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(order.timestamp * 1000).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <span className={`text-xs px-2 py-1 rounded ${
                          order.isResolved ? 'bg-purple-100 text-purple-800' :
                          order.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100'
                        }`}>
                          {order.isResolved ? 'Settled' : order.isActive ? 'Active' : 'Completed'}
                        </span>
                        {order.isActive && (
                          <button
                            onClick={() => cancelOrder(order.id)}
                            className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No orders found</p>
              )}
            </div>
          ) : (
            <div>
              <h3 className="font-semibold mb-2">Claim Profit</h3>
              <p className="mb-4">If the market has been resolved and you have winning positions, you can claim your profit.</p>
              <button
                onClick={claimProfit}
                disabled={loading || marketInfo?.status !== 1}
                className="p-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 w-full"
              >
                {loading ? 'Processing...' : 'Claim Profit'}
              </button>
              {marketInfo?.status !== 1 && (
                <p className="text-sm text-gray-500 mt-2">* Market is not resolved yet, cannot claim profit</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* error */}
      {error && <div className="text-red-600 p-3 bg-red-50 rounded">Error: {error}</div>}

      {/* logs */}
      <div className="border rounded p-4 bg-gray-50">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">Activity Log</h3>
          <button 
            onClick={() => setLogs([])}
            className="text-xs text-gray-500 hover:text-gray-800"
          >
            Clear
          </button>
        </div>
        <div className="text-xs font-mono max-h-64 overflow-y-auto">
          {logs.length > 0 ? (
            logs.map((l, i) => <div key={i} className="py-1 border-b border-gray-100">{l}</div>)
          ) : (
            <div className="text-gray-500">No logs</div>
          )}
        </div>
      </div>
    </div>
  );
}