import { useMemo } from "react";
import { ethers } from "ethers";
import PolyPredictMarketAbi from "@/abi/PolyPredictMarket.json";
import PredictionMarketAbi from "@/abi/PredictionMarket.json";
import CLOBExchangeAbi from "@/abi/CLOBExchange.json";
import TokenManagerAbi from "@/abi/TokenManager.json";
import { CONTRACT_ADDRESSES } from "@/constants/contracts";

export function useContracts(providerOrSigner: ethers.Provider | ethers.Signer | null) {
  return useMemo(() => {
    if (!providerOrSigner) return null;

    return {
      polyPredictMarket: new ethers.Contract(
        CONTRACT_ADDRESSES.POLY_PREDICT_MARKET,
        PolyPredictMarketAbi,
        providerOrSigner
      ),
      predictionMarket: new ethers.Contract(
        CONTRACT_ADDRESSES.PREDICTION_MARKET,
        PredictionMarketAbi,
        providerOrSigner
      ),
      clobExchange: new ethers.Contract(
        CONTRACT_ADDRESSES.CLOB_EXCHANGE,
        CLOBExchangeAbi,
        providerOrSigner
      ),
      tokenManager: new ethers.Contract(
        CONTRACT_ADDRESSES.TOKEN_MANAGER,
        TokenManagerAbi,
        providerOrSigner
      )
    };
  }, [providerOrSigner]);
}