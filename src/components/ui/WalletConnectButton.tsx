"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";

export default function WalletConnectButton({
  onConnect
}: {
  onConnect?: (provider: ethers.BrowserProvider, signer: ethers.Signer, address: string) => void;
}) {
  const [account, setAccount] = useState<string | null>(null);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setAccount(address);
      onConnect?.(provider, signer, address);
    } catch (err) {
      console.error("Wallet connection error:", err);
    }
  };

  useEffect(() => {
    if (typeof window.ethereum !== "undefined") {
      window.ethereum.on("accountsChanged", () => window.location.reload());
    }
  }, []);

  return (
    <button
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      onClick={connectWallet}
    >
      {account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : "Connect Wallet"}
    </button>
  );
}
