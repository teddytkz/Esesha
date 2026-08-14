# Proof of Concept: Pure Go PPK to PEM Conversion

## Goal
Validate that `github.com/edutko/putty-go` can successfully replace `puttygen.exe` for converting PPK files to OpenSSH PEM format.

## What This Proves
1. Library can parse PPK v2 and v3 formats
2. Library handles encrypted PPK files with passphrases
3. Conversion to OpenSSH PEM format works correctly
4. Error handling for wrong passphrases is clear
5. No external dependencies required

## How to Run

```powershell
# Install dependencies
go mod init ppk-poc
go get github.com/edutko/putty-go@latest
go get golang.org/x/crypto/ssh

# Run the proof of concept
go run main.go
```

## Test Cases
- ✅ PPK v2 unencrypted (RSA key)
- ✅ PPK v3 encrypted with passphrase (RSA key)
- ✅ Wrong passphrase detection
- ✅ Invalid PPK file detection

## Expected Output
The program will:
1. Parse test PPK files
2. Convert them to OpenSSH PEM format
3. Validate the conversion succeeded
4. Print success/failure for each test case

## Findings
See `results.md` for detailed findings and recommendation.
