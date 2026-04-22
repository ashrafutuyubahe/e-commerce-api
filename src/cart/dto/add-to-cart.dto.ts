import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class AddToCartDto {
  @ApiProperty({ description: 'Product UUID' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}
