import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class RecordDeployDto {
  @IsString()
  @IsNotEmpty()
  wallet: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  txHash: string;

  @IsOptional()
  @IsString()
  name?: string;
}
