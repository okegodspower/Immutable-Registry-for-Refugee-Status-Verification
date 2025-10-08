# 🌍 Immutable Registry for Refugee Status Verification

Welcome to a secure, blockchain-powered solution for verifying refugee status! This project uses the Stacks blockchain and Clarity smart contracts to create an immutable registry that helps refugees prove their identity and status without relying on easily lost or forged physical documents. It addresses real-world challenges like bureaucratic delays, fraud, and lack of access to records in conflict zones, enabling faster aid distribution, border crossings, and integration into host countries.

## ✨ Features

🔒 Immutable storage of refugee profiles and status updates  
📋 Secure registration of personal details and document hashes  
✅ Instant verification by authorized parties (e.g., NGOs, governments)  
🛡️ Role-based access control for authorities and verifiers  
📜 Audit trails for all changes and verifications  
🚨 Dispute resolution mechanism to handle contested statuses  
🔄 Integration hooks for external systems like aid distribution apps  
💰 Optional incentive tokens for verifiers to encourage participation  
🌐 Cross-border accessibility without centralized servers  

## 🛠 How It Works

This project leverages 8 Clarity smart contracts to ensure modularity, security, and scalability. Each contract handles a specific aspect of the registry, allowing for easy upgrades and audits.

### Smart Contracts Overview

1. **UserRegistry.clar**: Manages refugee profile creation and basic updates (e.g., name, birthdate, hashed ID documents).  
2. **StatusManager.clar**: Handles status assignments (e.g., "registered refugee," "asylum granted") by authorized entities.  
3. **DocumentHasher.clar**: Stores and verifies hashes of supporting documents (e.g., passports, birth certificates) to prove authenticity without revealing sensitive data.  
4. **AuthorityControl.clar**: Defines roles (e.g., admin, verifier, refugee) and manages permissions using STX principals.  
5. **AuditLogger.clar**: Records all actions (registrations, verifications, disputes) in an immutable log for transparency.  
6. **DisputeResolver.clar**: Allows filing and resolving disputes over status claims, with voting by trusted verifiers.  
7. **TokenIncentive.clar**: Issues fungible tokens (e.g., via SIP-010) to reward verifiers for accurate reviews.  
8. **IntegrationGateway.clar**: Provides read-only APIs for external dApps or systems to query statuses without direct contract calls.

### For Refugees

- Generate hashes of your identity documents (e.g., using SHA-256).  
- Call `register-profile` in UserRegistry with your details and hashes.  
- Once approved by an authority (via StatusManager), your status is immutable and verifiable.  
- Use `get-my-status` to retrieve your profile for sharing with aid organizations.

Boom! Your status is now securely stored on the blockchain, accessible anywhere.

### For Authorities/Verifiers (e.g., UNHCR, Governments)

- Register as a verifier via AuthorityControl.  
- Review and approve registrations using StatusManager's `assign-status`.  
- Verify a refugee's status instantly with `verify-status` in StatusManager.  
- Check document integrity using DocumentHasher's `validate-hash`.  
- Earn tokens from TokenIncentive for validated actions.

That's it! Quick, tamper-proof verifications to streamline humanitarian efforts.

### For Auditors/Researchers

- Query the AuditLogger for historical data on registrations and changes.  
- Use DisputeResolver to view resolved cases and ensure fairness.

## 🚀 Getting Started

1. Set up a Stacks wallet and Clarity development environment.  
2. Deploy the contracts in order (starting with AuthorityControl for permissions).  
3. Test with sample data: Register a profile, assign status, and verify.  

This project promotes trust and efficiency in refugee management while respecting privacy through hashing. Let's build a more equitable world!