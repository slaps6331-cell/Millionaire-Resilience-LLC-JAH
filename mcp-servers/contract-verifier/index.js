/**
 * MCP Server: Contract Verifier
 * Millionaire Resilience LLC
 * 
 * This MCP server provides tools for verifying smart contracts
 * on StoryScan and BaseScan block explorers.
 * 
 * Tools provided:
 *   - verify_on_storyscan: Verify contract on StoryScan
 *   - verify_on_basescan: Verify contract on BaseScan
 *   - check_verification_status: Check if contract is verified
 *   - get_verified_source: Get verified source code
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  storyscanApiUrl: process.env.STORYSCAN_API_URL || 'https://www.storyscan.io/api',
  basescanApiUrl: process.env.BASESCAN_API_URL || 'https://api.basescan.org/api',
  projectRoot: process.env.PROJECT_ROOT || '/home/azureuser/blockchain/Millionaire-Resilience-LLC-JAH',
  compilerVersion: 'v0.8.26+commit.8a97fa7a',
  evmVersion: 'cancun',
  optimizerEnabled: true,
  optimizerRuns: 200
};

// Create MCP Server
const server = new Server(
  {
    name: 'contract-verifier',
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
    name: 'verify_on_storyscan',
    description: 'Verify a smart contract on StoryScan (Story Protocol)',
    inputSchema: {
      type: 'object',
      properties: {
        contractAddress: {
          type: 'string',
          description: 'Deployed contract address'
        },
        contractName: {
          type: 'string',
          description: 'Contract name (e.g., AngelCoin)'
        },
        constructorArgs: {
          type: 'string',
          description: 'ABI-encoded constructor arguments (hex)',
          default: ''
        }
      },
      required: ['contractAddress', 'contractName']
    }
  },
  {
    name: 'verify_on_basescan',
    description: 'Verify a smart contract on BaseScan (Base L2)',
    inputSchema: {
      type: 'object',
      properties: {
        contractAddress: {
          type: 'string',
          description: 'Deployed contract address'
        },
        contractName: {
          type: 'string',
          description: 'Contract name (e.g., AngelCoin)'
        },
        constructorArgs: {
          type: 'string',
          description: 'ABI-encoded constructor arguments (hex)',
          default: ''
        }
      },
      required: ['contractAddress', 'contractName']
    }
  },
  {
    name: 'check_verification_status',
    description: 'Check if a contract is verified on the explorer',
    inputSchema: {
      type: 'object',
      properties: {
        contractAddress: {
          type: 'string',
          description: 'Contract address to check'
        },
        network: {
          type: 'string',
          enum: ['story', 'base'],
          description: 'Network to check'
        }
      },
      required: ['contractAddress', 'network']
    }
  },
  {
    name: 'get_verified_source',
    description: 'Get the verified source code of a contract',
    inputSchema: {
      type: 'object',
      properties: {
        contractAddress: {
          type: 'string',
          description: 'Contract address'
        },
        network: {
          type: 'string',
          enum: ['story', 'base'],
          description: 'Network'
        }
      },
      required: ['contractAddress', 'network']
    }
  },
  {
    name: 'verify_all_contracts',
    description: 'Verify all deployed contracts on a network',
    inputSchema: {
      type: 'object',
      properties: {
        network: {
          type: 'string',
          enum: ['story', 'base'],
          description: 'Network to verify on'
        }
      },
      required: ['network']
    }
  }
];

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Helper function to get flattened source
function getFlattenedSource(contractName) {
  const sourcePath = path.join(CONFIG.projectRoot, 'contracts', `${contractName}.sol`);
  
  if (!fs.existsSync(sourcePath)) {
    return null;
  }
  
  // For now, return the single file source
  // In production, use hardhat flatten
  return fs.readFileSync(sourcePath, 'utf-8');
}

// Helper function to get API key
function getApiKey(network) {
  if (network === 'story') {
    return process.env.STORYSCAN_API_KEY;
  }
  return process.env.ETHERSCAN_API_KEY;
}

// Tool implementations
async function verifyContract(network, contractAddress, contractName, constructorArgs = '') {
  const apiUrl = network === 'story' ? CONFIG.storyscanApiUrl : CONFIG.basescanApiUrl;
  const apiKey = getApiKey(network);
  
  if (!apiKey) {
    return {
      success: false,
      error: `${network.toUpperCase()}_API_KEY not set`,
      network,
      contractAddress
    };
  }
  
  const sourceCode = getFlattenedSource(contractName);
  if (!sourceCode) {
    return {
      success: false,
      error: `Source code not found for ${contractName}`,
      network,
      contractAddress
    };
  }
  
  // Determine optimizer runs (StoryAttestationService uses runs=1)
  const optimizerRuns = contractName === 'StoryAttestationService' ? 1 : CONFIG.optimizerRuns;
  
  try {
    const params = new URLSearchParams({
      apikey: apiKey,
      module: 'contract',
      action: 'verifysourcecode',
      contractaddress: contractAddress,
      sourceCode: sourceCode,
      codeformat: 'solidity-single-file',
      contractname: contractName,
      compilerversion: CONFIG.compilerVersion,
      optimizationUsed: CONFIG.optimizerEnabled ? '1' : '0',
      runs: optimizerRuns.toString(),
      evmversion: CONFIG.evmVersion,
      constructorArguements: constructorArgs  // Note: API uses this spelling
    });
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    const result = await response.json();
    
    if (result.status === '1') {
      return {
        success: true,
        network,
        contractAddress,
        contractName,
        guid: result.result,
        message: 'Verification submitted. Check status with GUID.',
        explorerUrl: network === 'story' 
          ? `https://www.storyscan.io/address/${contractAddress}`
          : `https://basescan.org/address/${contractAddress}`
      };
    } else {
      return {
        success: false,
        network,
        contractAddress,
        contractName,
        error: result.result || result.message
      };
    }
  } catch (error) {
    return {
      success: false,
      network,
      contractAddress,
      contractName,
      error: error.message
    };
  }
}

async function checkVerificationStatus(contractAddress, network) {
  const apiUrl = network === 'story' ? CONFIG.storyscanApiUrl : CONFIG.basescanApiUrl;
  const apiKey = getApiKey(network);
  
  if (!apiKey) {
    return {
      success: false,
      error: `${network.toUpperCase()}_API_KEY not set`
    };
  }
  
  try {
    const params = new URLSearchParams({
      apikey: apiKey,
      module: 'contract',
      action: 'getsourcecode',
      address: contractAddress
    });
    
    const response = await fetch(`${apiUrl}?${params}`);
    const result = await response.json();
    
    if (result.status === '1' && result.result && result.result[0]) {
      const contract = result.result[0];
      const isVerified = contract.SourceCode && contract.SourceCode.length > 0;
      
      return {
        success: true,
        contractAddress,
        network,
        isVerified,
        contractName: contract.ContractName || null,
        compilerVersion: contract.CompilerVersion || null,
        optimizationUsed: contract.OptimizationUsed || null,
        explorerUrl: network === 'story'
          ? `https://www.storyscan.io/address/${contractAddress}`
          : `https://basescan.org/address/${contractAddress}`
      };
    }
    
    return {
      success: false,
      contractAddress,
      network,
      error: result.message || 'Failed to check verification status'
    };
  } catch (error) {
    return {
      success: false,
      contractAddress,
      network,
      error: error.message
    };
  }
}

async function getVerifiedSource(contractAddress, network) {
  const apiUrl = network === 'story' ? CONFIG.storyscanApiUrl : CONFIG.basescanApiUrl;
  const apiKey = getApiKey(network);
  
  if (!apiKey) {
    return {
      success: false,
      error: `${network.toUpperCase()}_API_KEY not set`
    };
  }
  
  try {
    const params = new URLSearchParams({
      apikey: apiKey,
      module: 'contract',
      action: 'getsourcecode',
      address: contractAddress
    });
    
    const response = await fetch(`${apiUrl}?${params}`);
    const result = await response.json();
    
    if (result.status === '1' && result.result && result.result[0]) {
      const contract = result.result[0];
      
      return {
        success: true,
        contractAddress,
        network,
        contractName: contract.ContractName,
        sourceCode: contract.SourceCode,
        abi: contract.ABI,
        compilerVersion: contract.CompilerVersion,
        optimizationUsed: contract.OptimizationUsed,
        runs: contract.Runs
      };
    }
    
    return {
      success: false,
      contractAddress,
      network,
      error: 'Contract not verified or not found'
    };
  } catch (error) {
    return {
      success: false,
      contractAddress,
      network,
      error: error.message
    };
  }
}

async function verifyAllContracts(network) {
  const configPath = path.join(CONFIG.projectRoot, `deployment-config.${network}.json`);
  
  if (!fs.existsSync(configPath)) {
    return {
      success: false,
      error: `No deployment config found for ${network}`,
      network
    };
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const contracts = config.contracts || {};
  
  const results = {
    network,
    total: Object.keys(contracts).length,
    verified: [],
    failed: [],
    timestamp: new Date().toISOString()
  };
  
  for (const [contractName, address] of Object.entries(contracts)) {
    const result = await verifyContract(network, address, contractName);
    
    if (result.success) {
      results.verified.push({ contractName, address, guid: result.guid });
    } else {
      results.failed.push({ contractName, address, error: result.error });
    }
    
    // Rate limiting - wait between requests
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  results.success = results.failed.length === 0;
  results.message = `Verified ${results.verified.length}/${results.total} contracts`;
  
  return results;
}

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    let result;
    
    switch (name) {
      case 'verify_on_storyscan':
        result = await verifyContract('story', args.contractAddress, args.contractName, args?.constructorArgs);
        break;
        
      case 'verify_on_basescan':
        result = await verifyContract('base', args.contractAddress, args.contractName, args?.constructorArgs);
        break;
        
      case 'check_verification_status':
        result = await checkVerificationStatus(args.contractAddress, args.network);
        break;
        
      case 'get_verified_source':
        result = await getVerifiedSource(args.contractAddress, args.network);
        break;
        
      case 'verify_all_contracts':
        result = await verifyAllContracts(args.network);
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
  console.error('Contract Verifier MCP Server started');
}

main().catch(console.error);
