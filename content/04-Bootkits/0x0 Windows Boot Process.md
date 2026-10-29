---
title: 0x0 Windows Boot Process
description: Essential information for Windows bootkits
permalink:
tags:
  - bootkit
  - knowledge
draft: "false"
publish: "true"
date:
completed: "false"
difficulty:
---
> [!Note] This note is heavily inspired by the awesome book [Rootkits and Bootkits](https://bootkits.io/) written by Alex Matrosov, Eugene Rodionov, and Sergey Bratus! You should give it a read!

# 1 - Overview of the Windows Boot Process

![[windows-boot-process-overview.excalidraw|1000]]

# 2 - BIOS & the Preboot Environment
# 3 - Master Boot Record
> [!Note] Note: When dealing with hard drives that are larger than 2TB, the 32-bit design of the LBA fields in the partition table begins to "overflow". This created a modernized version of MBR called the GUID Partition Table (GPT), which is made to replace MBR

The Master Boot Record (MBR) is a data structure containing information on hard drive partitions and the boot code.
```c
typedef struct _MASTER_BOOT_RECORD{
	BYTE bootCode[0x1BE];  // space to hold actual boot code
	MBR_PARTITION_TABLE_ENTRY partitionTable[4];
	USHORT mbrSignature; // set to 0xAA55 to indicate PC MBR format
} MASTER_BOOT_RECORD, *PMASTER_BOOT_RECORD;
```
## Partition Table
The partition table is an array of four elements, each described by the `MBR_PARTITION_TABLE_ENTRY` structure shown below:
```c
typedef struct _MBR_PARTITION_TABLE_ENTRY {
    UCHAR BootIndicator;       // 0x00: Boot indicator (0x80 = active/bootable, 0x00 = inactive)
    UCHAR StartHead;           // 0x01: Starting Head (CHS addressing)
    UCHAR StartSector;         // 0x02: Starting Sector (Bits 0-5) and Starting Cylinder high bits (Bits 6-7)
    UCHAR StartCylinder;       // 0x03: Starting Cylinder low bits
    UCHAR PartitionType;       // 0x04: Partition type/system ID (e.g., 0x07 for NTFS, 0x83 for Linux)
    UCHAR EndHead;             // 0x05: Ending Head (CHS addressing)
    UCHAR EndSector;           // 0x06: Ending Sector and Ending Cylinder high bits
    UCHAR EndCylinder;         // 0x07: Ending Cylinder low bits
    ULONG StartingLBA;         // 0x08: Logical Block Address (LBA) of the first sector in the partition
    ULONG PartitionLength;     // 0x0C: Total number of sectors in the partition
} MBR_PARTITION_TABLE_ENTRY, *PMBR_PARTITION_TABLE_ENTRY;
```
- `BootIndicator` signifies wheter the partition is active or not. Only one partition may be marked as active at a time.
- `PartitionType` tells us what type of partition we are dealing with (FAT12, FAT16, NTFS etc.). Type 0 means unused.
- `StartingLBA` and `PartitionLength` define the location of the partition on disk, expressed in sectors. The `StartingLBA` field contains the offset of the partition from the beginning of the hard drive.
## Microsoft Windows Drive Layout
Below we can see a typical bootable hard drive with two partitions:

![[windows-boot-hard-drive-layout.excalidraw|500]]
# 4 - Volume Boot Record & the Initial Program Loader

![[windows-boot-vbr.excalidraw|1000]]
# 5 - The bootmgr & Boot Configuration Data

## Real Mode vs Protected Mode
**Real mode** is a legacy execution mode for the CPU that uses a 16-bit memory model in which each byte in RAM is addressed by a pointer consisting of two words (2 bytes): `segment_start:segment:offset` . The reason for this is to be backwards compatible. The consequence of this is that the available RAM is limited to ish 1MB, which is not enough for modern systems. We then need another mode that gives us more possibilities.

**Protected mode**, called "long mode" on 64-bit systems, is turned on when the `bootmgr` takes over from the VBR & IPL.

Therefore, `bootmgr` consists of 16-bit **real-mode** code and a compressed PE image, which, when uncompressed, is executed in **protected-mode**. The 16-bit code extracts and uncompressed the PE from the `bootmgr` images, switches the processor into protected mode, and passed control to the uncompressed module.

> [!Note] Note: Bootkits must handle this transition from real to protected mode properly to maintain control, which can be a sophisticated problem to solve.
## BCD Boot Variables
Once the uncompressed PE stored in `bootmgr` recieves control, it loads boot configuration information from the **Boot Configuration Data** (BCD) which is stored on the hard drive with the same layout as a registry hive. (You can use `regedit` and navigate to `HKEY_LOCAL_MACHINE\BCD000000` to browse it's contents).


> [!Note] Note: To read from the hard drive, `bootmgr`, operating in protected mode, uses the `INT 13h` disk service, which is intended to be run in real-mode. To solve this, `bootmgr` saves the execution context of the processor in temp variables, temporarily switches to real-mode, executes the `INT 13h` handler, and then returns to protected mode, restoring the saved context.

The BCD contains all the information `bootmgr` needs in order to load the OS, including the path to the partition containing the OS instance to load, available boot applications, code integrity options, and parameters instructing the OS to oad in preinstallation mode, safe mode etc.

For bootkit developers, these are the BCD variables of greatest interest:

| Variable name                                 | Description                                                                                                                                                                 | Parameter Type | Parameter ID |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------ |
| `BcdLibraryBoolean_DisableIntegrityCheck`     | Disables [[0x1 Boot Process Security#Kernel-Mode Code Signing Policy\|kernel-mode code integrity checks]]                                                                   | Boolean        | `0x16000048` |
| `BcdOSLoaderBoolean_WinPEMode`                | Tells the kernel to load in preinstallation mode, disabling [[0x1 Boot Process Security#Kernel-Mode Code Signing Policy\|kernel-mode code integrity checks]] as a byproduct | Boolean        | `0x26000022` |
| `BcdLibraryBoolean_AllowPrereleaseSignatures` | Enables test signing (TESTSIGNING)                                                                                                                                          | Boolean        | `0x16000004` |

