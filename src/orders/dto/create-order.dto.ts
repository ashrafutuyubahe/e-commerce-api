import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsPostalCode,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ShippingAddressDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '123 Main St' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ example: 'New York' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'NY' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: '10001' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({ example: 'US' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: ShippingAddressDto })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiPropertyOptional({ example: 'Please leave at front door' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string;
}
