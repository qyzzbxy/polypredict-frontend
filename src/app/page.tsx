/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect } from "react";
import WalletConnectButton from "@/components/ui/WalletConnectButton";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "@/constants/contracts";
import PolyPredictMarketAbi from "@/abi/PolyPredictMarket.json";
import TokenManagerAbi from "@/abi/TokenManager.json";

export default function HomePage() {
  // -----------------------------
  // React state hooks
  // -----------------------------
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [contractAddresses, setContractAddresses] = useState({
    polyPredictMarket: CONTRACT_ADDRESSES.POLY_PREDICT_MARKET ?? "未设置",
    tokenManager: CONTRACT_ADDRESSES.TOKEN_MANAGER ?? "未设置",
    predictionMarket: "未获取",
    exchange: "未获取",
  });
  const [logOutput, setLogOutput] = useState<string[]>([]);
  const [depositAmount, setDepositAmount] = useState("0.001");
  const [isLoading, setIsLoading] = useState(false);
  const [polyContract, setPolyContract] = useState<ethers.Contract | null>(null);
  const [tokenContract, setTokenContract] = useState<ethers.Contract | null>(null);

  // -----------------------------
  // Helper utilities
  // -----------------------------
  const addLog = (message: unknown) => {
    // bigints cannot be stringified directly – convert to string first
    const safeMsg =
      typeof message === "bigint"
        ? message.toString()
        : typeof message === "object"
        ? JSON.stringify(message, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
        : (message as string);
    console.log(safeMsg);
    setLogOutput((prev) => [...prev, safeMsg]);
  };

  const clearLog = () => setLogOutput([]);

  // -----------------------------
  // Wallet connection callback
  // -----------------------------
  const handleWalletConnect = (
    prov: ethers.BrowserProvider,
    sgnr: ethers.Signer,
    addr: string,
  ) => {
    console.log("Wallet connected:", addr);
    setProvider(prov);
    setSigner(sgnr);
    setAddress(addr);
  };

  // -----------------------------
  // Initialise contract instances when signer is ready
  // -----------------------------
  useEffect(() => {
    if (!signer) return;

    try {
      const poly = new ethers.Contract(
        CONTRACT_ADDRESSES.POLY_PREDICT_MARKET,
        PolyPredictMarketAbi,
        signer,
      );
      const token = new ethers.Contract(
        CONTRACT_ADDRESSES.TOKEN_MANAGER,
        TokenManagerAbi,
        signer,
      );
      setPolyContract(poly);
      setTokenContract(token);
      addLog("合约实例已初始化");
    } catch (err) {
      addLog(`初始化合约失败: ${(err as Error).message}`);
    }
  }, [signer]);

  // =====================================================================
  // Test helpers — converted to ethers v6 (BigInt + utils.* removed)
  // =====================================================================

  /**
   * TEST 1 — fetch contract addresses held by coordinator contract
   */
  const fetchContractAddresses = async () => {
    clearLog();
    setIsLoading(true);
    addLog("===== 测试1: 获取并验证合约地址 =====");

    if (!signer) {
      addLog("需要先连接钱包");
      setIsLoading(false);
      return;
    }

    try {
      const poly = new ethers.Contract(
        CONTRACT_ADDRESSES.POLY_PREDICT_MARKET,
        PolyPredictMarketAbi,
        signer,
      );
      addLog(`使用常量中的PolyPredictMarket地址: ${CONTRACT_ADDRESSES.POLY_PREDICT_MARKET}`);

      // TokenManager 地址验证
      const tokenManagerAddress: string = await poly.getTokenManagerAddress();
      addLog(`从合约获取的TokenManager地址: ${tokenManagerAddress}`);
      setContractAddresses((prev) => ({ ...prev, tokenManager: tokenManagerAddress }));
      if (
        CONTRACT_ADDRESSES.TOKEN_MANAGER.toLowerCase() !== tokenManagerAddress.toLowerCase()
      ) {
        addLog(
          `⚠️ 常量中的TOKEN_MANAGER地址 (${CONTRACT_ADDRESSES.TOKEN_MANAGER}) 与合约返回的不一致!`,
        );
      } else {
        addLog("✅ TOKEN_MANAGER地址验证通过");
      }

      // PredictionMarket
      const predictionMarketAddress: string = await poly.getMarketAddress();
      addLog(`从合约获取的PredictionMarket地址: ${predictionMarketAddress}`);
      setContractAddresses((prev) => ({ ...prev, predictionMarket: predictionMarketAddress }));

      // Exchange
      const exchangeAddress: string = await poly.getExchangeAddress();
      addLog(`从合约获取的Exchange地址: ${exchangeAddress}`);
      setContractAddresses((prev) => ({ ...prev, exchange: exchangeAddress }));

      // 余额
      if (address && tokenManagerAddress) {
        try {
          const token = new ethers.Contract(tokenManagerAddress, TokenManagerAbi, signer);
          const balance: bigint = await token.getAvailableBalance(address);
          addLog(`通过getAvailableBalance获取的余额: ${balance.toString()}`);
          const directBalance: bigint = await token.balances(address);
          addLog(`通过直接访问balances映射获取的余额: ${directBalance.toString()}`);
        } catch (error) {
          addLog(`查询余额失败: ${(error as Error).message}`);
        }
      }
    } catch (err) {
      addLog(`获取合约地址失败: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * TEST 2 — analyse ABI methods
   */
  const analyzeContractMethods = async () => {
    clearLog();
    setIsLoading(true);
    addLog("===== 测试2: 分析合约方法 =====");

    try {
      const poly = new ethers.Contract(
        CONTRACT_ADDRESSES.POLY_PREDICT_MARKET,
        PolyPredictMarketAbi,
        signer,
      );
      const token = new ethers.Contract(CONTRACT_ADDRESSES.TOKEN_MANAGER, TokenManagerAbi, signer);

      // PolyPredictMarket methods
      addLog("检查PolyPredictMarket合约:");
      const polyFns = poly.interface.fragments.filter((f: any) => f.type === "function").map((f: any) => f.name).sort();
      addLog(`发现 ${polyFns.length} 个方法`);
      polyFns.forEach((fn) => addLog(`- ${fn}`));
      addLog(polyFns.includes("deposit") ? "✅ deposit方法存在" : "⚠️ 缺少deposit方法");

      // TokenManager methods
      addLog("\n检查TokenManager合约:");
      const tokenFns = token.interface.fragments.filter((f: any) => f.type === "function").map((f: any) => f.name).sort();
      addLog(`发现 ${tokenFns.length} 个方法`);
      tokenFns.forEach((fn) => addLog(`- ${fn}`));
      addLog(tokenFns.includes("deposit") ? "✅ deposit方法存在" : "⚠️ 缺少deposit方法");
    } catch (err) {
      addLog(`分析合约方法失败: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * TEST 3 — direct deposit to TokenManager
   */
  const testDirectDeposit = async () => {
    clearLog();
    setIsLoading(true);
    addLog("===== 测试3: 直接通过TokenManager存款 =====");

    if (!address) {
      addLog("⚠️ 请先连接钱包");
      setIsLoading(false);
      return;
    }

    try {
      const token = new ethers.Contract(CONTRACT_ADDRESSES.TOKEN_MANAGER, TokenManagerAbi, signer);
      addLog(`使用TokenManager地址: ${CONTRACT_ADDRESSES.TOKEN_MANAGER}`);

      let initialBalance: bigint = 0n;
      try {
        initialBalance = await token.balances(address);
        addLog(`初始余额: ${initialBalance.toString()} wei`);
        addLog(`格式化: ${ethers.formatEther(initialBalance)} ETH`);
      } catch (e) {
        addLog(`查询初始余额失败: ${(e as Error).message}`);
      }

      const value = ethers.parseEther(depositAmount);
      addLog(`准备存入: ${depositAmount} ETH (${value.toString()} wei)`);

      const tx = await token.deposit({ value });
      addLog(`交易已提交，哈希: ${tx.hash}`);
      const receipt = await tx.wait();
      addLog(`交易状态: ${receipt.status === 1n ? "成功" : "失败"}`);

      await new Promise((res) => setTimeout(res, 8000));
      const newBalance: bigint = await token.balances(address);
      addLog(`更新后余额: ${newBalance.toString()} wei`);
      addLog(`格式化: ${ethers.formatEther(newBalance)} ETH`);

      const diff = newBalance - initialBalance;
      addLog(`余额变化: ${diff.toString()} wei (${ethers.formatEther(diff)} ETH)`);
      addLog(diff === 0n ? "⚠️ 余额没有变化，存款可能失败!" : "✅ 余额已更新，存款成功!");
    } catch (err) {
      addLog(`直接通过TokenManager存款失败: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * TEST 4 — deposit via PolyPredictMarket
   */
  const testPolyDeposit = async () => {
    clearLog();
    setIsLoading(true);
    addLog("===== 测试4: 通过PolyPredictMarket存款 =====");

    if (!address) {
      addLog("⚠️ 请先连接钱包");
      setIsLoading(false);
      return;
    }

    try {
      const poly = new ethers.Contract(
        CONTRACT_ADDRESSES.POLY_PREDICT_MARKET,
        PolyPredictMarketAbi,
        signer,
      );
      const token = new ethers.Contract(CONTRACT_ADDRESSES.TOKEN_MANAGER, TokenManagerAbi, signer);

      let initialBalance: bigint = 0n;
      try {
        initialBalance = await token.balances(address);
        addLog(`初始余额: ${ethers.formatEther(initialBalance)} ETH`);
      } catch (e) {
        addLog(`查询初始余额失败: ${(e as Error).message}`);
      }

      const value = ethers.parseEther(depositAmount);
      addLog(`准备通过PolyPredictMarket存入: ${depositAmount} ETH (${value.toString()} wei)`);
      const tx = await poly.deposit({ value });
      addLog(`交易已提交，哈希: ${tx.hash}`);
      const receipt = await tx.wait();
      addLog(`交易状态: ${receipt.status === 1n ? "成功" : "失败"}`);

      await new Promise((res) => setTimeout(res, 10000));
      const newBalance: bigint = await token.balances(address);
      const diff = newBalance - initialBalance;
      addLog(`更新后余额: ${ethers.formatEther(newBalance)} ETH`);
      addLog(`余额变化: ${ethers.formatEther(diff)} ETH`);
      addLog(diff === 0n ? "⚠️ 余额没有变化，存款可能失败!" : "✅ 存款成功!");
    } catch (err) {
      addLog(`通过PolyPredictMarket存款失败: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * TEST 5 — cross‑contract diagnosis (kept简化，仍使用 bigint)
   */
  const diagnoseContractIssues = async () => {
    clearLog();
    setIsLoading(true);
    addLog("===== 测试5: 诊断合约交叉调用问题 =====");

    if (!address) {
      addLog("⚠️ 请先连接钱包");
      setIsLoading(false);
      return;
    }

    try {
      const poly = new ethers.Contract(
        CONTRACT_ADDRESSES.POLY_PREDICT_MARKET,
        PolyPredictMarketAbi,
        signer,
      );
      const token = new ethers.Contract(CONTRACT_ADDRESSES.TOKEN_MANAGER, TokenManagerAbi, signer);

      // 地址检查
      const tokenManagerAddrFromPoly: string = await poly.getTokenManagerAddress();
      addLog(`PolyPredictMarket引用的TokenManager地址: ${tokenManagerAddrFromPoly}`);
      addLog(
        tokenManagerAddrFromPoly.toLowerCase() === CONTRACT_ADDRESSES.TOKEN_MANAGER.toLowerCase()
          ? "✅ 地址匹配"
          : "⚠️ 地址不匹配",
      );

      // ABI deposit payable check
      const polyDepositFunc = PolyPredictMarketAbi.find(
        (i: any) => i.name === "deposit" && i.type === "function",
      );
      addLog(
        polyDepositFunc && polyDepositFunc.stateMutability === "payable"
          ? "✅ PolyPredictMarket.deposit 是 payable"
          : "⚠️ deposit 未标记 payable",
      );

      // 小额交易测试
      try {
        const initialBalance: bigint = await token.balances(address);
        const smallValue = ethers.parseEther("0.0001");
        const tx = await poly.deposit({ value: smallValue, gasLimit: 200_000 });
        addLog(`小额交易提交: ${tx.hash}`);
        await tx.wait();
        const newBalance: bigint = await token.balances(address);
        const diff = newBalance - initialBalance;
        addLog(
          diff === 0n
            ? "⚠️ 小额交易后余额无变化"
            : `✅ 小额交易成功，余额增 ${ethers.formatEther(diff)} ETH`,
        );
      } catch (e) {
        addLog(`小额交易失败: ${(e as Error).message}`);
      }
    } catch (err) {
      addLog(`诊断失败: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // -----------------------------
  // JSX rendering
  // -----------------------------
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4 text-center">Welcome to PolyPredict</h1>
      <p className="mb-6 text-gray-600 text-center">
        A decentralized prediction market where you can bet on future outcomes.
      </p>

      <div className="mb-6 flex justify-center">
        <WalletConnectButton onConnect={handleWalletConnect} />
      </div>

      {address && (
        <div className="text-sm text-gray-500 mb-4 text-center">Connected wallet: {address}</div>
      )}

      {/* Deposit amount input */}
      <div className="mb-6 flex justify-center">
        <div className="max-w-xs w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">存款金额 (ETH)</label>
          <input
            type="number"
            min="0.0001"
            step="0.001"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>
      </div>

      {signer && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6 max-w-4xl mx-auto">
          <button
            onClick={fetchContractAddresses}
            disabled={isLoading}
            className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            测试1: 验证合约地址
          </button>
          <button
            onClick={analyzeContractMethods}
            disabled={isLoading}
            className="p-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            测试2: 分析合约方法
          </button>
          <button
            onClick={testDirectDeposit}
            disabled={isLoading}
            className="p-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
          >
            测试3: 直接通过TokenManager存款
          </button>
          <button
            onClick={testPolyDeposit}
            disabled={isLoading}
            className="p-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-400"
          >
            测试4: 通过PolyPredictMarket存款
          </button>
          <button
            onClick={diagnoseContractIssues}
            disabled={isLoading}
            className="p-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
          >
            测试5: 诊断合约交叉调用
          </button>
          <button
            onClick={clearLog}
            disabled={isLoading || logOutput.length === 0}
            className="p-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400"
          >
            清除日志
          </button>
        </div>
      )}

      {/* Contract addresses display */}
      <div className="border rounded-lg p-4 mb-4 max-w-2xl mx-auto">
        <h2 className="text-lg font-semibold mb-2">合约地址信息</h2>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">PolyPredictMarket:</span> {contractAddresses.polyPredictMarket}
          </div>
          <div>
            <span className="font-medium">TokenManager:</span> {contractAddresses.tokenManager}
          </div>
          <div>
            <span className="font-medium">PredictionMarket:</span> {contractAddresses.predictionMarket}
          </div>
          <div>
            <span className="font-medium">Exchange:</span> {contractAddresses.exchange}
          </div>
          <div>
            <span className="font-medium">常量中的TOKEN_MANAGER:</span> {CONTRACT_ADDRESSES.TOKEN_MANAGER}
          </div>
        </div>
      </div>

      {/* Log output */}
      {logOutput.length > 0 && (
        <div className="border rounded-lg p-4 max-w-2xl mx-auto">
          <h2 className="text-lg font-semibold mb-2">测试日志</h2>
          <div className="bg-gray-50 p-3 rounded max-h-96 overflow-y-auto">
            {logOutput.map((log, idx) => {
              const cls = log.includes("⚠️")
                ? "text-orange-600 font-semibold"
                : log.includes("✅")
                ? "text-green-600 font-semibold"
                : log.includes("=====")
                ? "font-bold text-blue-800 mt-2 mb-2"
                : "";
              return (
                <div key={idx} className={`text-xs font-mono mb-1 ${cls}`}>{log}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
