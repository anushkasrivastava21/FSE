import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from "@nestjs/swagger";
import { IpfsService } from "./ipfs.service";

@ApiTags("IPFS")
@Controller("ipfs")
export class IpfsController {
  constructor(private readonly ipfsService: IpfsService) {}

  @Post("upload")
  @ApiOperation({ summary: "Upload a file to IPFS via Pinata" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "The file to upload (photo, document, etc.)",
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    }),
  )
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    const result = await this.ipfsService.uploadFile(file.buffer, file.originalname);

    return {
      success: true,
      cid: result.cid,
      uri: result.uri,
      filename: file.originalname,
      size: file.size,
    };
  }
}
