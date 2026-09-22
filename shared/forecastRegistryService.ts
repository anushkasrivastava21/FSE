import { ethers } from "ethers";
import ForecastRegistryABI from "./abi/ForecastRegistry.json";

export class ForecastRegistryService {
  private contract: ethers.Contract;

  constructor(contractAddress: string, providerOrSigner: ethers.Provider | ethers.Signer) {
    this.contract = new ethers.Contract(contractAddress, ForecastRegistryABI, providerOrSigner);
  }

  async submitForecast(period: number, expectedQuantity: number): Promise<ethers.ContractTransactionResponse> {
    const tx = await this.contract.submitForecast(period, expectedQuantity);
    return tx;
  }

  async getNGOAccuracyHistory(ngoAddress: string) {
    return await this.contract.getNGOAccuracyHistory(ngoAddress);
  }
}