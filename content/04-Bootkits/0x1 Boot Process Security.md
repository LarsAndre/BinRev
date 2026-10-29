---
title: 0x0 Windows Boot Process
description: Essential information for Windows bootkits
permalink:
tags:
  - bootkit
  - knowledge
draft: "true"
publish: "false"
date:
completed: "false"
difficulty:
---
> [!Note] This note is heavily inspired by the awesome book [Rootkits and Bootkits](https://bootkits.io/) written by Alex Matrosov, Eugene Rodionov, and Sergey Bratus! You should give it a read!
# Kernel-Mode Code Signing Policy
Introduced with Windows Vista, the Kernel-Mode Code Signing Policy created a new challenge for bootkit developers. Now, in order to execute kernel-mode drivers you would have to have a valid digital signature. This meant that unsigned malicious kernel-mode drivers would not load.

Now, techniques to bypass this policy can be divided into four different categories:
```mermaid
---
title: Kernel-Mode-Code-Signing-Policy
---
flowchart LR
    Index[Bypassing integrity check techniques]
    A[Windows built-in functionality]
    B[Exploiting vulnerable kernel module]
    C[System boot process vulnerability]
    D[System firmware modification]
```
# Secure Boot