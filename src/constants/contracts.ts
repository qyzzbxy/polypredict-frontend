import { getAddress } from "ethers"; // ethers v6 自动校验地址合法性

export const CONTRACT_ADDRESSES = {
  POLY_PREDICT_MARKET: getAddress('0xed3d8dacfc869be57e1de12c9726cde762fe735d'),
  CLOB_EXCHANGE: getAddress('0x6c88a4539ece6a1c7f446a56b439e87e938a5c48'),
  PREDICTION_MARKET: getAddress('0xbac1cf5bd6d6f3451500f061f05486b7de80b926'),
  TOKEN_MANAGER: getAddress('0x239beae2d840048625da527b224fbce60d4d6d66'),
};