import { IsString, Length } from 'class-validator';

export class CompleteProfileDto {
  @IsString()
  @Length(2, 2)
  country: string;

  @IsString()
  @Length(2, 2)
  language: string;
}