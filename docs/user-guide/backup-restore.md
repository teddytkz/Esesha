# Backup & Restore Guide

## Overview

Esesha menyediakan fitur backup dan restore untuk melindungi data connection dan private keys Anda. Backup mencakup semua connection credentials dan file private keys yang digunakan.

## Quick Start

### Creating a Backup

1. Buka aplikasi Esesha
2. Klik menu atau tombol "Backup"
3. Backup otomatis dibuat di folder `backup/` di lokasi executable
4. Anda akan menerima konfirmasi dengan path file backup

### Restoring from Backup

1. Buka aplikasi Esesha
2. Klik menu atau tombol "Restore"
3. Pilih file backup JSON yang ingin di-restore
4. Konfirmasi restore operation
5. Aplikasi akan import semua connections dari backup

## Backup Contents

### What's Included

Setiap backup operation membuat dua komponen:

#### 1. Connection Data (JSON File)

**Filename:** `esesha-backup-YYYYMMDD-HHMMSS.json`

**Contents:**
- Connection profiles (name, host, port, username)
- Plaintext passwords (untuk portability)
- Private key paths
- DPAPI-encrypted private key content
- Host key fingerprints
- Timestamps (created, updated)

**Format Example:**
```json
{
  "connections": [
    {
      "id": 1,
      "name": "Production Server",
      "host": "prod.example.com",
      "port": 22,
      "username": "admin",
      "password": "decrypted-password-here",
      "privateKeyPath": "D:\\App\\keys\\id_rsa",
      "encrypted_private_key": [/* DPAPI encrypted bytes */],
      "createdAt": 1723694490,
      "updatedAt": 1723694490
    }
  ],
  "host_keys": [
    {
      "hostname": "prod.example.com:22",
      "fingerprint": "SHA256:abc123...",
      "updated_at": "2026-08-15T04:25:58.314Z"
    }
  ]
}
```

#### 2. Keys Directory (Folder)

**Foldername:** `keys-YYYYMMDD-HHMMSS/`

**Contents:**
- Semua file private keys dari folder `keys/`
- Preserved filenames dan structure
- Plain text key files (tidak encrypted)

### What's NOT Included

- SSH session history atau terminal output
- Open connections atau active sessions
- Temporary files atau cached data
- Application settings (window size, theme, etc.)

## Backup Location

```
executable-directory/
├── esesha.exe
├── keys/
│   ├── id_rsa
│   └── production.pem
└── backup/
    ├── esesha-backup-20260815-112130.json
    ├── keys-20260815-112130/
    │   ├── id_rsa
    │   └── production.pem
    ├── esesha-backup-20260815-143000.json
    └── keys-20260815-143000/
        └── ...
```

## Backup Strategies

### Manual Backup

**When to Use:**
- Before major configuration changes
- Before software updates
- After adding important connections
- Before OS reinstall atau hardware migration

**How Often:**
- Before risky operations: Always
- Regular backups: Weekly or monthly
- Critical systems: Daily

### Automated Backup

**Using Task Scheduler (Windows):**

1. Create backup script:

```powershell
# backup-esesha.ps1
$exePath = "D:\Apps\esesha\esesha.exe"
$backupDir = "D:\Apps\esesha\backup"

# Launch app and trigger backup via API or hotkey
# (Manual implementation - app needs API endpoint)

# Alternative: Copy entire folder
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$destination = "E:\Backups\esesha-$timestamp"
Copy-Item -Path "D:\Apps\esesha" -Destination $destination -Recurse
```

2. Schedule with Task Scheduler:
   - Open Task Scheduler
   - Create Basic Task
   - Trigger: Daily at 2:00 AM
   - Action: Start PowerShell script
   - Settings: Run whether user logged on or not

### Cloud Backup

**Using OneDrive/Google Drive:**

1. Move backup folder ke synced directory:

```powershell
# Create symbolic link
$backupDir = "D:\Apps\esesha\backup"
$cloudDir = "C:\Users\YourName\OneDrive\Esesha-Backups"

# Move existing backups
Move-Item $backupDir\* $cloudDir\

# Create symbolic link
New-Item -ItemType SymbolicLink -Path $backupDir -Target $cloudDir
```

2. Backups otomatis sync ke cloud
3. Accessible dari multiple devices

⚠️ **Security Warning:** Cloud storage may be less secure. Consider encrypting backup files before upload.

## Restore Process

### Full Restore

Restore semua connections dari backup file.

**Steps:**

1. **Prepare:**
   - Close all active SSH sessions
   - Optionally backup current state
   - Note: Restore akan ADD connections, not replace

2. **Execute:**
   - Click "Restore" button
   - Select backup JSON file
   - Confirm operation

3. **Verify:**
   - Check ListConnections untuk imported entries
   - Test beberapa connections
   - Verify passwords dan keys working

### Partial Restore

Restore hanya sebagian connections (manual process).

**Steps:**

1. Open backup JSON file di text editor
2. Copy connection entry yang diinginkan
3. Create new connection manually di aplikasi
4. Copy/paste credentials dari JSON

### Key Files Restore

Restore private key files dari backup.

**Steps:**

1. Navigate ke backup folder
2. Locate `keys-YYYYMMDD-HHMMSS/` folder
3. Copy desired key files ke `keys/` folder
4. Verify file permissions (0600)
5. Test connections yang menggunakan keys tersebut

## Migration Scenarios

### Moving to New Computer

**Steps:**

1. **On Old Computer:**
   - Create backup menggunakan Backup button
   - Copy backup JSON dan keys folder
   - Transfer files ke new computer (USB drive, network, cloud)

2. **On New Computer:**
   - Install Esesha
   - Copy backup files ke new executable directory
   - Run restore operation
   - Copy keys folder ke `keys/` directory
   - Test connections

⚠️ **DPAPI Limitation:** Encrypted private keys dalam database akan TIDAK WORK di komputer berbeda. Anda perlu private key files dari backup keys folder.

### Upgrading Esesha Version

**Steps:**

1. Create backup dengan current version
2. Close Esesha application
3. Download new version executable
4. Replace old executable dengan new one
5. Launch new version
6. Verify connections working
7. If issues: Restore dari backup dan rollback executable

### Disaster Recovery

**Scenario:** Hard drive failure, OS corruption, ransomware

**Recovery Steps:**

1. Install fresh OS
2. Install Esesha executable
3. Retrieve backup dari external source (cloud, external drive)
4. Place executable di desired location
5. Copy backup JSON ke `backup/` folder
6. Copy keys backup ke `keys/` folder
7. Run restore operation
8. Verify all connections

## Security Considerations

### Backup Security

⚠️ **Backup files contain sensitive data:**
- Plaintext passwords
- Private key files
- Server information

**Best Practices:**

1. **Encrypt Backups:**
   ```powershell
   # Encrypt backup folder dengan 7-Zip
   7z a -p -mhe=on backup-encrypted.7z backup\
   ```

2. **Secure Storage:**
   - Store backups di encrypted drive
   - Use BitLocker (Windows) atau VeraCrypt
   - Restrict file permissions

3. **Access Control:**
   - Limit backup access to administrators only
   - Use strong passwords untuk encrypted archives
   - Enable two-factor authentication pada cloud storage

4. **Regular Cleanup:**
   - Delete old backups securely (not just recycle bin)
   - Keep hanya last N backups (e.g., last 10)
   - Comply dengan data retention policies

### Backup Encryption Example

**Using GPG:**

```powershell
# Encrypt backup
gpg --symmetric --cipher-algo AES256 esesha-backup-20260815-112130.json

# Encrypt keys folder
7z a -p -mhe=on keys-encrypted.7z keys-20260815-112130\

# Decrypt when needed
gpg esesha-backup-20260815-112130.json.gpg
7z x keys-encrypted.7z
```

## Troubleshooting

### Restore Failed

**Problem:** Error during restore operation

**Solutions:**
1. Verify JSON file format is valid
2. Check file permissions (read access required)
3. Ensure database not corrupted
4. Try restoring to fresh installation

### Keys Not Working After Restore

**Problem:** Connections fail dengan key authentication error

**Solutions:**
1. Verify key files copied ke `keys/` folder
2. Check file permissions (must be 0600)
3. Verify key paths di connection settings
4. Test key with `ssh -i keys/id_rsa user@host`

### Duplicate Connections

**Problem:** Restore creates duplicate entries

**Cause:** Restore adds connections, tidak replace existing ones

**Solutions:**
1. Delete existing connections sebelum restore (if desired)
2. Manually merge atau delete duplicates
3. Use different connection names untuk avoid confusion

### Missing Keys

**Problem:** Key files tidak ada di backup

**Cause:** Keys folder mungkin tidak ada saat backup dibuat

**Solutions:**
1. Check backup folder untuk `keys-YYYYMMDD-HHMMSS/`
2. Locate original key files dari source location
3. Re-add keys manually ke connections

### Backup Too Large

**Problem:** Backup menghabiskan terlalu banyak disk space

**Solutions:**
1. Implement backup rotation (keep last 10 backups)
2. Compress backups dengan 7-Zip atau WinRAR
3. Move old backups ke archive storage
4. Delete unused key files

## Best Practices

### Regular Backups

- **Daily:** For production-critical systems
- **Weekly:** For active development environments
- **Monthly:** For personal atau low-change setups
- **Before changes:** Always backup sebelum major updates

### Backup Verification

1. Periodically test restore process
2. Verify backup files are readable
3. Test restored connections
4. Ensure keys are accessible

### Backup Retention

- **Keep 3-2-1 rule:**
  - 3 copies of data
  - 2 different storage types
  - 1 offsite backup

- **Example retention policy:**
  - Daily backups: Keep last 7 days
  - Weekly backups: Keep last 4 weeks
  - Monthly backups: Keep last 12 months

### Documentation

- Document backup schedule
- Record backup locations
- Note encryption keys/passwords (securely)
- Maintain recovery procedures

## Advanced Topics

### Scripted Backup Automation

Future enhancement could include CLI interface:

```bash
# Proposed CLI commands
esesha backup --output=E:\Backups\manual-backup.json
esesha restore --input=backup.json --merge
esesha backup --auto --retain=10
```

### Selective Restore

Future enhancement: GUI untuk select individual connections:

- Checkbox list of connections dari backup
- Preview connection details sebelum import
- Conflict resolution (skip, rename, replace)

### Backup Encryption Built-in

Future enhancement: Native encryption di aplikasi:

- Master password untuk backup
- AES-256 encryption
- Password-protected restore

## See Also

- [Key File Management](../features/key-file-management.md)
- [Secure Key Storage](../features/secure-key-storage.md)
- [File Manager User Guide](file-manager.md)
- [PEM Encryption Technical Docs](../technical/pem-encryption.md)
