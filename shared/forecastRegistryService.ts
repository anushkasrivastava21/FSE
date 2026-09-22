import { ethers } from "ethers";

const ForecastRegistryABI = [
  "function submitForecast(bytes32 forecastHash) external returns (uint256)",
  "function getForecast(uint256 id) external view returns (address provider, bytes32 forecastHash, uint256 timestamp)"
];

export class ForecastRegistryService {
  private contract: ethers.Contract;

  constructor(contractAddress: string, providerOrSigner: ethers.Provider | ethers.Signer) {
    this.contract = new ethers.Contract(contractAddress, ForecastRegistryABI, providerOrSigner);
  }

  async submitForecast(forecastHash: string): Promise<ethers.ContractTransactionResponse> {
    const tx = await this.contract.submitForecast(forecastHash);
    return tx;
  }

  async getForecast(id: number) {
    return await this.contract.getForecast(id);
  }
}