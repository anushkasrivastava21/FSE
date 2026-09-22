import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PinataSDK } from "pinata";

/**
 * IPFS upload service using Pinata.
 * Uploads listing photos and returns the CID for on-chain metadataURI.
 */
@Injectable()
export class IpfsService {
  private readonly logger = new Logger(IpfsService.name);
  private pinata: PinataSDK | null = null;

  constructor(private readonly config: ConfigService) {
    const jwt = this.config.get<string>("PINATA_JWT");
    if (jwt) {
      this.pinata = new PinataSDK({ pinataJwt: jwt });
      this.logger.log("Pinata SDK initialized");
    } else {
      this.logger.warn("PINATA_JWT not set — IPFS uploads will be disabled");
    }
  }

  /**
   * Upload a file buffer to IPFS via Pinata.
   * Returns the IPFS CID (content identifier).
   */
  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
  ): Promise<{ cid: string; uri: string }> {
    if (!this.pinata) {
      throw new Error("Pinata not configured. Set PINATA_JWT in .env");
    }

    try {
      const file = new File([fileBuffer as any], filename);
      const result = await this.pinata.upload.file(file as any);

      const cid = (result as any).cid || (result as any).IpfsHash;
      const uri = `ipfs://${cid}`;

      this.logger.log(`Uploaded ${filename} → ${uri}`);
      return { cid, uri };
    } catch (error) {
      this.logger.error(`IPFS upload failed for ${filename}`, error);
      throw error;
    }
  }

  /**
   * Upload JSON metadata to IPFS.
   * Used for listing metadata that includes description, photos array, etc.
   */
  async uploadJson(
    data: Record<string, any>,
    name: string,
  ): Promise<{ cid: string; uri: string }> {
    if (!this.pinata) {
      throw new Error("Pinata not configured. Set PINATA_JWT in .env");
    }

    try {
      const result = await this.pinata.upload.json(data);
      const cid = (result as any).cid || (result as any).IpfsHash;
      const uri = `ipfs://${cid}`;

      this.logger.log(`Uploaded JSON "${name}" → ${uri}`);
      return { cid, uri };
    } catch (error) {
      this.logger.error(`IPFS JSON upload failed for "${name}"`, error);
      throw error;
    }
  }
}
