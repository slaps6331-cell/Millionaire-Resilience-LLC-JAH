/**
 * MCP Server: Multi-Signature Manager
 * Millionaire Resilience LLC
 * 
 * This MCP server provides tools for managing multi-signature
 * verification for Morpho Protocol transactions.
 * 
 * Tools provided:
 *   - generate_signature_payload: Generate EIP-191 hash for signing
 *   - verify_signature: Verify a single signature
 *   - verify_multisig: Verify 2/2 multi-signature requirement
 *   - get_signature_status: Get current signature status
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  projectRoot: process.env.PROJECT_ROOT || '/home/azureuser/blockchain/Millionaire-Resilience-LLC-JAH',
  storyDeployerAddress: process.env.STORY_DEPLOYER_ADDRESS || '0x597856e93f19877a399f686D2F43b298e2268618',
  coinbaseWalletAddress: process.env.COINBASE_WALLET_ADDRESS || '0xDc2aFCd0a97c1e878FdD64497806E52Cc530f02a',
  requiredSignatures: parseInt(process.env.REQUIRED_SIGNATURES || '2'),
  ucc1Cid: 'bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a',
  signerName: 'Clifton Kelly Bell',
  documentType: 'UCC-1_FINANCING_STATEMENT'
};

// Create MCP Server
const server = new Server(
  {
    name: 'multisig-manager',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const TOOLS = [
  {
    name: 'generate_signature_payload',
    description: 'Generate EIP-191 hash for multi-signature signing',
    inputSchema: {
      type: 'object',
      properties: {
        signerName: {
          type: 'string',
          description: 'Name of the authorized signer',
          default: 'Clifton Kelly Bell'
        },
        documentType: {
          type: 'string',
          description: 'Type of document being signed',
          default: 'UCC-1_FINANCING_STATEMENT'
        },
        ucc1Cid: {
          type: 'string',
          description: 'IPFS CID of the UCC-1 filing',
          default: 'bafkreialofdl6qhrgyomohyo6giijf7stzl26r6sbvq6gnwakgqpbqoe4a'
        }
      }
    }
  },
  {
    name: 'verify_signature',
    description: 'Verify a single signature against the expected signer',
    inputSchema: {
      type: 'object',
      properties: {
        signature: {
          type: 'string',
          description: 'The signature to verify (132-char hex)'
        },
        expectedSigner: {
          type: 'string',
          description: 'Expected signer address'
        },
        messageHash: {
          type: 'string',
          description: 'The EIP-191 hash that was signed (optional - reads from config if not provided)'
        }
      },
      required: ['signature', 'expectedSigner']
    }
  },
  {
    name: 'verify_multisig',
    description: 'Verify that both required signatures are valid',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_signature_status',
    description: 'Get current status of multi-signature collection',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'add_signature',
    description: 'Add a signature to the configuration',
    inputSchema: {
      type: 'object',
      properties: {
        wallet: {
          type: 'string',
          enum: ['story', 'coinbase'],
          description: 'Which wallet signed'
        },
        signature: {
          type: 'string',
          description: 'The signature (132-char hex)'
        }
      },
      required: ['wallet', 'signature']
    }
  },
  {
    name: 'sign_with_private_key',
    description: 'Sign the payload with the deployer private key (if available)',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Helper functions
function getConfigPath() {
  return path.join(CONFIG.projectRoot, 'signature-morpho-config.json');
}

function readConfig() {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
  return null;
}

function writeConfig(config) {
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Tool implementations
async function generateSignaturePayload(signerName, documentType, ucc1Cid) {
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Create the payload to be hashed
  const abiCoder = new ethers.AbiCoder();
  const signatureData = abiCoder.encode(
    ['string', 'string', 'string', 'uint256'],
    [signerName, documentType, ucc1Cid, timestamp]
  );
  
  // Compute raw hash
  const signatureHash = ethers.keccak256(signatureData);
  
  // Compute EIP-191 hash (what wallets actually sign)
  const eip191Hash = ethers.hashMessage(ethers.getBytes(signatureHash));
  
  const config = {
    signer: signerName,
    documentType: documentType,
    ucc1Cid: ucc1Cid,
    ucc1Url: `https://lavender-neat-urial-76.mypinata.cloud/ipfs/${ucc1Cid}`,
    timestamp: timestamp,
    signatureHash: signatureHash,
    eip191Hash: eip191Hash,
    multisigSigners: {
      story: CONFIG.storyDeployerAddress,
      coinbase: CONFIG.coinbaseWalletAddress
    },
    requiredSignatures: CONFIG.requiredSignatures,
    signatures: {
      story: null,
      coinbase: null
    },
    generatedAt: new Date().toISOString()
  };
  
  writeConfig(config);
  
  return {
    success: true,
    eip191Hash: eip191Hash,
    signatureHash: signatureHash,
    message: 'Sign this hash with both wallets:',
    hashToSign: eip191Hash,
    signers: [
      { label: 'Story Deployer', address: CONFIG.storyDeployerAddress },
      { label: 'Coinbase Wallet', address: CONFIG.coinbaseWalletAddress }
    ],
    configPath: getConfigPath()
  };
}

async function verifySignature(signature, expectedSigner, messageHash = null) {
  const config = readConfig();
  
  if (!messageHash && config) {
    messageHash = config.eip191Hash;
  }
  
  if (!messageHash) {
    return {
      success: false,
      error: 'No message hash provided and no config file found'
    };
  }
  
  try {
    // Recover the signer address from the signature
    const recoveredAddress = ethers.recoverAddress(
      messageHash,
      signature
    );
    
    const isValid = recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
    
    return {
      success: true,
      signature: signature.substring(0, 20) + '...',
      expectedSigner: expectedSigner,
      recoveredAddress: recoveredAddress,
      isValid: isValid,
      message: isValid ? '✓ Signature is valid' : '✗ Signature is INVALID - recovered address does not match'
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to verify signature: ${error.message}`
    };
  }
}

async function verifyMultisig() {
  const config = readConfig();
  
  if (!config) {
    return {
      success: false,
      error: 'No signature config found. Run generate_signature_payload first.'
    };
  }
  
  const results = {
    eip191Hash: config.eip191Hash,
    requiredSignatures: config.requiredSignatures,
    signers: [],
    validCount: 0
  };
  
  // Verify Story Deployer signature
  if (config.signatures?.story) {
    const storyResult = await verifySignature(
      config.signatures.story,
      CONFIG.storyDeployerAddress,
      config.eip191Hash
    );
    results.signers.push({
      label: 'Story Deployer',
      address: CONFIG.storyDeployerAddress,
      hasSigned: true,
      isValid: storyResult.isValid
    });
    if (storyResult.isValid) results.validCount++;
  } else {
    results.signers.push({
      label: 'Story Deployer',
      address: CONFIG.storyDeployerAddress,
      hasSigned: false,
      isValid: false
    });
  }
  
  // Verify Coinbase Wallet signature
  if (config.signatures?.coinbase) {
    const coinbaseResult = await verifySignature(
      config.signatures.coinbase,
      CONFIG.coinbaseWalletAddress,
      config.eip191Hash
    );
    results.signers.push({
      label: 'Coinbase Wallet',
      address: CONFIG.coinbaseWalletAddress,
      hasSigned: true,
      isValid: coinbaseResult.isValid
    });
    if (coinbaseResult.isValid) results.validCount++;
  } else {
    results.signers.push({
      label: 'Coinbase Wallet',
      address: CONFIG.coinbaseWalletAddress,
      hasSigned: false,
      isValid: false
    });
  }
  
  results.success = results.validCount >= config.requiredSignatures;
  results.message = results.success
    ? `✓ ${results.validCount}/${config.requiredSignatures} signatures verified - ready for deployment`
    : `✗ ${results.validCount}/${config.requiredSignatures} signatures verified - need more signatures`;
  
  return results;
}

async function getSignatureStatus() {
  const config = readConfig();
  
  if (!config) {
    return {
      success: false,
      hasConfig: false,
      message: 'No signature config found. Run generate_signature_payload first.'
    };
  }
  
  return {
    success: true,
    hasConfig: true,
    eip191Hash: config.eip191Hash,
    generatedAt: config.generatedAt,
    signatures: {
      story: {
        address: CONFIG.storyDeployerAddress,
        hasSigned: !!config.signatures?.story,
        signature: config.signatures?.story ? config.signatures.story.substring(0, 20) + '...' : null
      },
      coinbase: {
        address: CONFIG.coinbaseWalletAddress,
        hasSigned: !!config.signatures?.coinbase,
        signature: config.signatures?.coinbase ? config.signatures.coinbase.substring(0, 20) + '...' : null
      }
    },
    requiredSignatures: config.requiredSignatures,
    currentSignatures: (config.signatures?.story ? 1 : 0) + (config.signatures?.coinbase ? 1 : 0)
  };
}

async function addSignature(wallet, signature) {
  const config = readConfig();
  
  if (!config) {
    return {
      success: false,
      error: 'No signature config found. Run generate_signature_payload first.'
    };
  }
  
  // Validate signature format
  if (!signature.match(/^0x[a-fA-F0-9]{130}$/)) {
    return {
      success: false,
      error: 'Invalid signature format. Expected 132-character hex string starting with 0x'
    };
  }
  
  // Verify the signature before adding
  const expectedSigner = wallet === 'story' ? CONFIG.storyDeployerAddress : CONFIG.coinbaseWalletAddress;
  const verification = await verifySignature(signature, expectedSigner, config.eip191Hash);
  
  if (!verification.isValid) {
    return {
      success: false,
      error: `Signature verification failed: ${verification.message}`,
      recoveredAddress: verification.recoveredAddress,
      expectedAddress: expectedSigner
    };
  }
  
  // Add signature to config
  config.signatures = config.signatures || {};
  config.signatures[wallet] = signature;
  writeConfig(config);
  
  return {
    success: true,
    wallet: wallet,
    address: expectedSigner,
    message: `✓ ${wallet} signature added and verified`,
    currentSignatures: (config.signatures.story ? 1 : 0) + (config.signatures.coinbase ? 1 : 0),
    requiredSignatures: config.requiredSignatures
  };
}

async function signWithPrivateKey() {
  const config = readConfig();
  
  if (!config) {
    return {
      success: false,
      error: 'No signature config found. Run generate_signature_payload first.'
    };
  }
  
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    return {
      success: false,
      error: 'DEPLOYER_PRIVATE_KEY not set. Load secrets from Key Vault first.'
    };
  }
  
  try {
    const wallet = new ethers.Wallet(privateKey);
    
    // Verify wallet address matches Story Deployer
    if (wallet.address.toLowerCase() !== CONFIG.storyDeployerAddress.toLowerCase()) {
      return {
        success: false,
        error: `Private key does not match Story Deployer address. Got ${wallet.address}, expected ${CONFIG.storyDeployerAddress}`
      };
    }
    
    // Sign the hash
    const signature = await wallet.signMessage(ethers.getBytes(config.signatureHash));
    
    // Add to config
    config.signatures = config.signatures || {};
    config.signatures.story = signature;
    writeConfig(config);
    
    return {
      success: true,
      wallet: 'story',
      address: wallet.address,
      signature: signature.substring(0, 20) + '...',
      message: '✓ Story Deployer signature created and added',
      note: 'Coinbase Wallet signature still required (use MyEtherWallet to sign with Coinbase)'
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to sign: ${error.message}`
    };
  }
}

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    let result;
    
    switch (name) {
      case 'generate_signature_payload':
        result = await generateSignaturePayload(
          args?.signerName || CONFIG.signerName,
          args?.documentType || CONFIG.documentType,
          args?.ucc1Cid || CONFIG.ucc1Cid
        );
        break;
        
      case 'verify_signature':
        result = await verifySignature(args.signature, args.expectedSigner, args?.messageHash);
        break;
        
      case 'verify_multisig':
        result = await verifyMultisig();
        break;
        
      case 'get_signature_status':
        result = await getSignatureStatus();
        break;
        
      case 'add_signature':
        result = await addSignature(args.wallet, args.signature);
        break;
        
      case 'sign_with_private_key':
        result = await signWithPrivateKey();
        break;
        
      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true
        };
    }
    
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Multi-Signature Manager MCP Server started');
}

main().catch(console.error);
