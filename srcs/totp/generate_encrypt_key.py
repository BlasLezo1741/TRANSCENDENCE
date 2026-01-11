#!/usr/bin/env python3
"""
generate_encrypt_key.py

Generates a Fernet encryption key and saves it to ~/.ssh/.encrypt.key
This key is used by ft_otp.py to encrypt/decrypt TOTP secret keys.
"""

import os
from cryptography.fernet import Fernet


def generate_encrypt_key():
    """
    Generates a Fernet encryption key and saves it to ~/.ssh/.encrypt.key
    
    The Fernet key is used to encrypt/decrypt TOTP secrets in ft_otp.py
    """
    # Get the home directory
    home_dir = os.environ.get("HOME")
    if not home_dir:
        raise ValueError("HOME environment variable not set")
    
    # Define the .ssh directory path
    ssh_dir = os.path.join(home_dir, ".ssh")
    
    # Create .ssh directory if it doesn't exist
    if not os.path.exists(ssh_dir):
        os.makedirs(ssh_dir, mode=0o700)
        print(f"Created directory: {ssh_dir}")
    
    # Define the encryption key file path
    encrypt_key_path = os.path.join(ssh_dir, ".encrypt.key")
    
    # Check if key already exists
    if os.path.exists(encrypt_key_path):
        response = input(f"Key file already exists at {encrypt_key_path}\n"
                        "Do you want to overwrite it? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            print("Operation cancelled. Existing key preserved.")
            return
        print("Overwriting existing key...")
    
    # Generate a new Fernet key
    fernet_key = Fernet.generate_key()
    
    # Write the key to file with restricted permissions
    with open(encrypt_key_path, 'wb') as f:
        f.write(fernet_key)
    
    # Set file permissions to 600 (read/write for owner only)
    os.chmod(encrypt_key_path, 0o600)
    
    print(f"✓ Encryption key successfully created at: {encrypt_key_path}")
    print(f"✓ File permissions set to 600 (owner read/write only)")
    print(f"\nYou can now use ft_otp.py to encrypt and generate TOTP codes.")
    

if __name__ == "__main__":
    try:
        generate_encrypt_key()
    except Exception as e:
        print(f"Error: {e}")
        exit(1)