import hashlib
import warnings as _warnings
# Fernet is used here to encrypt the OTP secret key on the hard drive
# so it isn't stored in plain text.
from cryptography.fernet import Fernet
import base64
import hmac
import datetime
import binascii
import ssl
import os       # Added: Required for file path operations
import sys      # Added: Required for sys.argv
import argparse # Added: Required for argument parsing

# --- Constants ---
# TIME_STEP: The validity period of a token (usually 30 seconds).
TIME_STEP = 30
# TOTP_LENGTH: The number of digits in the final OTP (usually 6 or 8).
TOTP_LENGTH = 6
# TOTP_DIVISOR: Used to perform the modulo operation to get the final N digits.
# 10 ** 6 = 1,000,000
TOTP_DIVISOR = 10 ** TOTP_LENGTH


def generate_random_key(length=40):
    """
    Generates a cryptographically strong random key.
    It ensures characters are within the printable ASCII range (32-126).
    """
    random_key_b = b''
    count = 0
    # Loop until we have the desired length of valid bytes
    while count <= length:
        # ssl.RAND_bytes uses the OS's cryptographically secure random generator
        v = ssl.RAND_bytes(1)
        # Check if the byte is a printable ASCII character
        if 32 <= v[0] <= 126:
            random_key_b = random_key_b + v
            count = count + 1

    # Encode the random bytes to Base32 for standard storage compatibility
    random_key_b32 = base64.b32encode(random_key_b)
    cwd = os.getcwd()
    pathfile = os.path.join(cwd, 'ft_rand.key')

    # Save the generated key to a file
    with open(pathfile, 'wb') as f:
        f.write(random_key_b32)
    return pathfile

def create_random_key(length=40):
    """
    Generates a cryptographically strong random key.
    It ensures characters are within the printable ASCII range (32-126).
    """
    random_key_b = b''
    count = 0
    # Loop until we have the desired length of valid bytes
    while count <= length:
        # ssl.RAND_bytes uses the OS's cryptographically secure random generator
        v = ssl.RAND_bytes(1)
        # Check if the byte is a printable ASCII character
        if 32 <= v[0] <= 126:
            random_key_b = random_key_b + v
            count = count + 1

    # Encode the random bytes to Base32 for standard storage compatibility
    random_key_b32 = base64.b32encode(random_key_b)
    #cwd = os.getcwd()
    #pathfile = os.path.join(cwd, 'ft_rand.key')

    # Save the generated key to a file
    #with open(pathfile, 'wb') as f:
    #    f.write(random_key_b32)
    #return pathfile
    return random_key_b32

def user_correct_length(argument):
    """
    Takes a user-provided passphrase/secret, encodes it to Base32,
    and saves it to a file.
    """
    user_key_b = bytearray(argument, 'utf-8')
    user_key_b32 = base64.b32encode(user_key_b)
    cwd = os.getcwd()
    pathfile = os.path.join(cwd, 'ft_user.key')
    with open(pathfile, 'wb') as f:
        f.write(user_key_b32)
    return pathfile


def correct_length(file):
    """
    Validator function used by argparse.
    Ensures the provided key file contains a valid Hexadecimal string
    of appropriate length (>= 64 chars) and acts as a sanity check.
    """
    cwd = os.getcwd()
    pathfile = os.path.join(cwd, file)

    # 1. Check if file exists
    if os.path.isfile(pathfile):
        # 2. Check read permissions
        if os.access(pathfile, os.R_OK):
            # 3. Read content
            with open(pathfile, 'rb') as f:
                text = f.read().strip()

            # 4. Validate Length
            size = len(text)
            if size >= 64:
                # 4bis. Check padding/alignment (hex strings are usually even,
                # but base32 padding implies multiples of 8, here checking multiple of 4)
                if (size % 4) == 0:
                    # 5. Validate Hexadecimal characters
                    is_valid_hex = True
                    hex_chars = b'0123456789ABCDEF'
                    for char in text.upper():
                        # Note: This iterates over bytes, checking against hex_chars
                        if char not in hex_chars:
                            is_valid_hex = False
                            break
                    del text # Clear memory
                    if is_valid_hex:
                        return pathfile
                    else:
                        parser.error("Key is not an Hexadecimal File")
                else:
                    msg = f"Key Length {size} must be a multiple of 4"
                    parser.error(msg)
            else:
                parser.error(f"Key length of {size} is smaller than 64")
        else:
            parser.error(f"Can not read {pathfile}")
    else:
        parser.error(f"File {pathfile} does not exist")


def correct_filename(argument):
    """
    Validator to check if a file exists and is readable before processing.
    """
    if argument is None:
        parser.error(f"Missing file name '{argument}'")
    else:
        try:
            cwd = os.getcwd()
            filepath = os.path.join(cwd, argument)
            if os.path.isfile(filepath):
                if not os.access(filepath, os.R_OK):
                    parser.error(f"can not read'{argument}'")
                else:
                    return filepath
        except FileNotFoundError:
            parser.error(f"Can not find '{argument}'")


def create_argument_parser():
    """
    Sets up the Command Line Interface (CLI) arguments.
    """
    msg = """
    Allows saving an initial password/secret, and is capable
    of generating a new password every time it is requested."""

    parser = argparse.ArgumentParser(
        prog='ft_otp',
        description=msg,
        epilog='End of help message'
    )
    parser.add_argument('--show', help='Shows secret key', action='store_true')

    # Mutually exclusive group ensures user only performs one main action at a time
    group = parser.add_mutually_exclusive_group(required=True)

    group.add_argument('-s',
                       help='Generate a continuous sequence of TOTPs based on the encrypted file.',
                       type=correct_filename)
    group.add_argument('-k',
                       help='Generate a single TOTP based on the encrypted file.',
                       type=correct_filename)
    group.add_argument('-g',
                       help='Save a hexadecimal key (>64 chars) into ft_otp.key (encrypted).',
                       type=correct_length)
    group.add_argument('-u',
                       help='Save a user phrase into ft_user.key (encrypted).',
                       type=user_correct_length)
    group.add_argument('-r',
                       help='Generate a random key into ft_rand.key.',
                       action='store_true')
    group.add_argument('--GUI',
                       help='Run application with Graphic Interface (Not implemented in snippet).',
                       action='store_true')
    return parser


def encrypt_key(path_to_key):
    """
    Encrypts a plain text key file using a master key stored in ~/.ssh/.encrypt.key.
    This ensures the TOTP secret is not sitting clearly on the disk.
    """
    path_file = os.path.split(path_to_key)
    path = path_file[0]

    # Retrieve the Master Encryption Key (Symmetric)
    # WARNING: This assumes the user has created this key previously.
    cwd = os.getcwd()
    cifer_key_path = os.path.join(os.environ["HOME"], ".ssh/.encrypt.key")
    try:
        with open(cifer_key_path, 'rb') as f:
            cifer_key = f.read()

        # Initialize Fernet (Symmetric Encryption)
        fernet = Fernet(cifer_key)

        # Read the TOTP secret the user wants to save
        with open(path_to_key, 'rb') as f:
            totp_key_to_encrypt = f.read().strip()

        # Encrypt the TOTP secret
        totp_key_encrypted = fernet.encrypt(totp_key_to_encrypt)

        # Overwrite/Write the encrypted version to 'ft_otp.key'
        with open(os.path.join(path, "ft_otp.key"), 'wb') as f:
            f.write(totp_key_encrypted)
        msg = "ft_otp.key has been created"
        print(msg)
    except FileNotFoundError:
        msg = "Encryption Key not found. Execute 'generate_encrypt_key.py'"
        print(msg)


def decrypt_key(path_to_key):
    """
    Reads the encrypted 'ft_otp.key' and decrypts it using the master key
    so it can be used to generate a token.
    """
    path_file = os.path.split(path_to_key)
    path = path_file[0]

    # Read the master key
    cifer_key_path = os.path.join(os.environ["HOME"], ".ssh/.encrypt.key")
    try:
        with open(cifer_key_path, 'rb') as f:
            cifer_key = f.read()
    except FileNotFoundError:
        msg = f"Not found {cifer_key_path}. "
        msg = msg + "Execute 'generate_encrypt_key.py"
        raise ValueError(msg)

    # Initialize Fernet
    fernet = Fernet(cifer_key)

    # Read the Encrypted TOTP Key
    with open(path_to_key, 'rb') as f:
        totp_key_encrypted = f.read()

    # Decrypt to get the raw secret
    key_cyphered = fernet.decrypt(totp_key_encrypted)

    return key_cyphered


def get_totp_token(secret):
    """
    CORE FUNCTION: Implements the TOTP Algorithm (RFC 6238).
    Formula: TOTP = Truncate(HMAC-SHA1(K, T))
    """
    try:
        # Decode the secret from Base32. If padding is missing, try to handle it.
        # 'map01' maps '0' to 'O' and '1' to 'L' to fix common typos in Base32.
        secret_b32 = base64.b32decode(secret.decode(), True, map01='l')

    except binascii.Error:
        # Fallback to Base64 if Base32 fails
        secret_b32 = base64.b64decode(secret.decode())
        print("secret b32 = ", secret_b32)

    # --- Step 1: Calculate the Counter (T) ---
    # Get current UTC time in seconds
    int_dt_utc = int(datetime.datetime.now(datetime.timezone.utc).timestamp())

    # N = (Current Time - T0) / X
    # Here T0 is 0 and X is TIME_STEP (30s)
    N = int_dt_utc // TIME_STEP

    # Convert the integer counter N into an 8-byte big-endian binary string.
    # This is required for the HMAC function.
    m = int.to_bytes(N, length=8, byteorder='big')

    # --- Step 2: HMAC-SHA1 Generation ---
    # Hash the Time Counter (m) using the Secret Key.
    # Result is a 20-byte SHA1 hash.
    # HS = HMAC-SHA-1(K, C)
    hash = hmac.new(secret_b32, m, hashlib.sha1).digest()

    # --- Step 3: Dynamic Truncation ---
    # We need to extract 4 bytes from the 20-byte hash to get an integer.
    # We use the last nibble (4 bits) of the hash to determine the start index (offset).
    offset = hash[19] & 0xF  # Perform bitwise AND with 1111 (15)

    # Grab 4 bytes starting at the calculated offset
    signed_4b_hash = hash[offset:offset + 4]

    # --- Step 4: Masking ---
    # We ignore the most significant bit (MSB) to avoid signed/unsigned confusion.
    # 0x7fffffff mask ensures the first bit is 0.
    mask = bytes.fromhex('7fffffff')
    un_signed_4b_hash = bytes([h & m for h, m in zip(signed_4b_hash, mask)])

    # Convert the 4 bytes into a standard integer
    gross_totp = int.from_bytes(un_signed_4b_hash, byteorder='big')

    # --- Step 5: Modulo ---
    # We only want the last 6 digits.
    net_totp = gross_totp % TOTP_DIVISOR

    # Convert to string and pad with '0' if the number is small (e.g., 123 -> 000123)
    str_totp = str(net_totp)
    while len(str_totp) < TOTP_LENGTH:
        str_totp = '0' + str_totp

    return str_totp


def generate_qr(shared_secret_key, issuer, email):
    """
    Generates a QR image with the information requested by
    public 2fA autenthicator as Microsoft, Google
    PARAMETERS
        shared_secret_key:bytes string secret to construct OTP
        issuer           :Hold the account's name holder
        mail             :Hold email for account holder
    RETURNS
        Image in format png
    """
    chunk1 = "otpauth://totp/"
    chunk2 = issuer.upper() + ":"
    chunk3 = email + "?"
    chunk4 = "secret=" + shared_secret_key + "&"
    chunk5 = "issuer=" + issuer.upper()
    qr_data = chunk1 + chunk2 + chunk3 + chunk4 + chunk5
    print(qr_data)
    #img = qrcode.make(qr_data,)
    # Saving as an image file
    #img.save('MyQRCode1.png')
    #cwd = os.getcwd()
    #imagepath = os.path.join(cwd, 'MyQRCode1.png')
    #return imagepath
    return qr_data

if __name__ == "__main__":
    parser = create_argument_parser()
    # Parse arguments excluding the script name itself
    args = parser.parse_args(sys.argv[1:])

    print("These are my arguments: ", args)

    if args.GUI:
        print("GUI mode requested (not implemented)")
    else:
        # Option -g: Encrypt provided hex key
        if args.g is not None:
            msg = f"Received key {args.g}. Encrypting into ft_otp.key..."
            print(msg)
            encrypt_key(args.g)

        # Option -u: Encrypt provided user passphrase
        if args.u is not None:
            msg = f"Received user phrase '{args.u}'. Encrypting into ft_user.key..."
            print(msg)
            encrypt_key(args.u)

        # Option -r: Generate and encrypt random key
        if args.r:
            msg = "Generating random key in ft_rand.key..."
            print(msg)
            file = generate_random_key()
            encrypt_key(file)

        # Option -k: Generate ONE token based on encrypted key file
        if args.k is not None:
            msg = f"Generating next OTP based on file {args.k}..."
            print(msg)
            totp_key = decrypt_key(args.k)
            if args.show:
                print(f"Secret Key = {totp_key}")
            print(get_totp_token(totp_key))

        # Option -s: Generate CONTINUOUS tokens (like Google Authenticator)
        if args.s is not None:
            msg = f"Generating OTP sequence based on file {args.s}..."
            print(msg)
            totp_key = decrypt_key(args.s)
            if args.show:
                print(f"Secret Key = {totp_key}")

            # Print first token
            totp = get_totp_token(totp_key)
            print(totp, end="\n")
            print("-" * TOTP_LENGTH, end="\n")

            # Loop to update token every TIME_STEP (30s)
            s = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
            while True:
                aux = datetime.datetime.now(datetime.timezone.utc)
                n = int(aux.timestamp())
                elapsed_time = n - s

                # If 30 seconds have passed, generate new token
                if elapsed_time >= TIME_STEP:
                    totp = get_totp_token(totp_key)
                    print(totp, "                ", end="\n")
                    print("-" * TOTP_LENGTH, end="\n")
                    s = n
                else:
                    # Update countdown timer on the same line
                    msg = f"Elapsed_time:{TIME_STEP - elapsed_time:0>2}"
                    print(msg, end="\r")



