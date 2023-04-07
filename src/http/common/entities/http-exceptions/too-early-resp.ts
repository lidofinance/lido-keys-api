import { HttpException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

type tooEarlyCode = 425;
type tooEarlyMessage = 'Too early response';

const TOO_EARLY_CODE: tooEarlyCode = 425;
const TOO_EARLY_MESSAGE: tooEarlyMessage = 'Too early response';

export class TooEarlyResponse {
  @ApiProperty({ enum: [TOO_EARLY_CODE], default: TOO_EARLY_CODE })
  statusCode!: tooEarlyCode;

  @ApiProperty({ enum: [TOO_EARLY_MESSAGE], default: TOO_EARLY_MESSAGE })
  message!: tooEarlyMessage;
}

export function httpExceptionTooEarlyResp() {
  return new HttpException(TOO_EARLY_MESSAGE, TOO_EARLY_CODE);
}
