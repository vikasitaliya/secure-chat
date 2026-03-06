// public/wallet.js - HD Wallet Derivation from ECDH Keys
import { ethers } from 'ethers';

// BIP44 path structure: m / purpose' / coin_type' / account' / change / address_index
// coin_type: 60 for Ethereum, 137 for Polygon, etc.
const ETH_COIN_TYPE = 60;
const POLYGON_COIN_TYPE = 137;
const ARBITRUM_COIN_TYPE = 9001;

/**
 * Derive an Ethereum wallet from the master ECDH key
 * @param {CryptoKey} masterPrivateKey - The user's ECDH private key
 * @returns {Promise<ethers.Wallet>} An ethers.js Wallet instance
 */
export async function deriveWalletFromMasterKey(masterPrivateKey) {
    try {
        // Export the raw private key material
        const exported = await crypto.subtle.exportKey('pkcs8', masterPrivateKey);
        const rawKey = new Uint8Array(exported);
        
        // Create a seed from the raw key (simplified - in production use proper KDF)
        const seed = await crypto.subtle.digest('SHA-256', rawKey);
        
        // Use the seed to generate an HD wallet
        // For now, we'll create a simple deterministic wallet
        // In production, implement full BIP32/BIP44 derivation [citation:4]
        const privateKeyHex = Buffer.from(seed.slice(0, 32)).toString('hex');
        
        // Create ethers wallet
        const wallet = new ethers.Wallet('0x' + privateKeyHex);
        
        console.log('Derived wallet address:', wallet.address);
        return wallet;
    } catch (error) {
        console.error('Wallet derivation failed:', error);
        throw error;
    }
}

/**
 * Derive separate keys for different blockchains
 * @param {CryptoKey} masterPrivateKey - The master ECDH key
 * @param {number} coinType - BIP44 coin type (60 for ETH, 137 for Polygon, etc.)
 * @returns {Promise<ethers.Wallet>} Wallet for the specified blockchain
 */
export async function deriveChainWallet(masterPrivateKey, coinType) {
    // In a full implementation, we would use the coin type in the derivation path
    // For now, we'll use a different salt per chain
    const exported = await crypto.subtle.exportKey('pkcs8', masterPrivateKey);
    const rawKey = new Uint8Array(exported);
    
    // Combine raw key with coin type to create chain-specific seed
    const coinTypeBuffer = new Uint8Array(4);
    new DataView(coinTypeBuffer.buffer).setUint32(0, coinType, false);
    
    const combined = new Uint8Array(rawKey.length + coinTypeBuffer.length);
    combined.set(rawKey);
    combined.set(coinTypeBuffer, rawKey.length);
    
    const seed = await crypto.subtle.digest('SHA-256', combined);
    const privateKeyHex = Buffer.from(seed.slice(0, 32)).toString('hex');
    
    return new ethers.Wallet('0x' + privateKeyHex);
}