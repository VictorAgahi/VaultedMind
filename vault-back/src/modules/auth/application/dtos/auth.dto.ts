import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  ValidateBy,
  ValidationOptions,
} from 'class-validator';

// bcrypt silently ignores everything after 72 bytes
const BCRYPT_MAX_BYTES = 72;

function MaxByteLength(max: number, options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'maxByteLength',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= max,
        defaultMessage: () =>
          `Le mot de passe ne doit pas dépasser ${max} octets`,
      },
    },
    options,
  );
}

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(10, {
    message: 'Le mot de passe doit contenir au moins 10 caractères',
  })
  @MaxByteLength(BCRYPT_MAX_BYTES)
  @Matches(/^(?=.*\p{L})(?=.*[^\p{L}]).*$/u, {
    message:
      'Le mot de passe doit contenir au moins une lettre et un chiffre ou symbole',
  })
  password!: string;
}

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MaxLength(256)
  password!: string;
}
