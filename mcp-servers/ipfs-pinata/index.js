/**
 * MCP Server: IPFS Pinata
 * Millionaire Resilience LLC
 * 
 * This MCP server provides tools for pinning content to IPFS
 * via Pinata for UCC-1 documents and ABI proofs.
 * 
 * Tools provided:
 *   - pin_json: Pin JSON content to IPFS
 *   - pin_file: Pin a file to IPFS
 *   - get_pin_status: Check pin status
 *   - list_pins: List all pinned content
 *   - unpin: Remove a pin
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
import FormData from 'form-data';

// Configuration
const CONFIG = {
  pinataApiUrl: 'https://api.pinata.cloud',
  pinataGateway: process.env.PINATA_GATEWAY || 'https://lavender-neat-urial-76.mypinata.cloud',
  projectRoot: process.env.PROJECT_ROOT || '/home/azureuser/blockchain/Millionaire-Resilience-LLC-JAH'
};

// Create MCP Server
const server = new Server(
  {
    name: 'ipfs-pinata',
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
    name: 'pin_json',
    description: 'Pin JSON content to IPFS via Pinata',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'object',
          description: 'JSON content to pin'
        },
        name: {
          type: 'string',
          description: 'Name for the pinned content'
        },
        keyValues: {
          type: 'object',
          description: 'Metadata key-value pairs'
        }
      },
      required: ['content', 'name']
    }
  },
  {
    name: 'pin_file',
    description: 'Pin a file from the project to IPFS',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to file (relative to project root)'
        },
        name: {
          type: 'string',
          description: 'Name for the pinned content'
        }
      },
      required: ['filePath']
    }
  },
  {
    name: 'pin_abi_proof',
    description: 'Generate and pin ABI proof to IPFS',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_pin_status',
    description: 'Check the status of a pinned CID',
    inputSchema: {
      type: 'object',
      properties: {
        cid: {
          type: 'string',
          description: 'IPFS CID to check'
        }
      },
      required: ['cid']
    }
  },
  {
    name: 'list_pins',
    description: 'List all pinned content',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of pins to return',
          default: 10
        },
        name: {
          type: 'string',
          description: 'Filter by name (contains)'
        }
      }
    }
  },
  {
    name: 'unpin',
    description: 'Remove a pin from Pinata',
    inputSchema: {
      type: 'object',
      properties: {
        cid: {
          type: 'string',
          description: 'IPFS CID to unpin'
        }
      },
      required: ['cid']
    }
  },
  {
    name: 'get_gateway_url',
    description: 'Get the gateway URL for a CID',
    inputSchema: {
      type: 'object',
      properties: {
        cid: {
          type: 'string',
          description: 'IPFS CID'
        }
      },
      required: ['cid']
    }
  }
];

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Helper functions
function getAuthHeaders() {
  const jwt = process.env.PINATA_JWT;
  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_API_KEY;
  
  if (jwt) {
    return { 'Authorization': `Bearer ${jwt}` };
  } else if (apiKey && secretKey) {
    return {
      'pinata_api_key': apiKey,
      'pinata_secret_api_key': secretKey
    };
  }
  
  return null;
}

// Tool implementations
async function pinJson(content, name, keyValues = {}) {
  const headers = getAuthHeaders();
  if (!headers) {
    return {
      success: false,
      error: 'Pinata credentials not set. Set PINATA_JWT or PINATA_API_KEY + PINATA_SECRET_API_KEY'
    };
  }
  
  try {
    const body = {
      pinataContent: content,
      pinataMetadata: {
        name: name,
        keyvalues: keyValues
      }
    };
    
    const response = await fetch(`${CONFIG.pinataApiUrl}/pinning/pinJSONToIPFS`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    const result = await response.json();
    
    if (result.IpfsHash) {
      return {
        success: true,
        cid: result.IpfsHash,
        name: name,
        size: result.PinSize,
        timestamp: result.Timestamp,
        gatewayUrl: `${CONFIG.pinataGateway}/ipfs/${result.IpfsHash}`
      };
    }
    
    return {
      success: false,
      error: result.error?.message || 'Failed to pin JSON'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function pinFile(filePath, name = null) {
  const headers = getAuthHeaders();
  if (!headers) {
    return {
      success: false,
      error: 'Pinata credentials not set'
    };
  }
  
  const fullPath = path.join(CONFIG.projectRoot, filePath);
  
  if (!fs.existsSync(fullPath)) {
    return {
      success: false,
      error: `File not found: ${filePath}`
    };
  }
  
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(fullPath));
    
    const metadata = JSON.stringify({
      name: name || path.basename(filePath)
    });
    formData.append('pinataMetadata', metadata);
    
    const response = await fetch(`${CONFIG.pinataApiUrl}/pinning/pinFileToIPFS`, {
      method: 'POST',
      headers: headers,
      body: formData
    });
    
    const result = await response.json();
    
    if (result.IpfsHash) {
      return {
        success: true,
        cid: result.IpfsHash,
        name: name || path.basename(filePath),
        size: result.PinSize,
        gatewayUrl: `${CONFIG.pinataGateway}/ipfs/${result.IpfsHash}`
      };
    }
    
    return {
      success: false,
      error: result.error?.message || 'Failed to pin file'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function pinAbiProof() {
  // Generate ABI proof from compiled contracts
  const contracts = [
    'StoryAttestationService', 'StoryOrchestrationService', 'StoryAttestationBridge',
    'SLAPSIPSpvLoan', 'GladiatorHoldingsSpvLoan', 'PILLoanEnforcement',
    'StablecoinIPEscrow', 'AngelCoin', 'ResilienceToken',
    'SlapsStreaming', 'SlapsSPV', 'UCC1FilingIntegration'
  ];
  
  const abiProof = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    compilationConfig: {
      solcVersion: '0.8.26',
      evmVersion: 'cancun',
      viaIR: true,
      optimizer: { enabled: true, runs: 200 }
    },
    contracts: {}
  };
  
  for (const contractName of contracts) {
    const artifactPath = path.join(
      CONFIG.projectRoot,
      'artifacts/contracts',
      `${contractName}.sol`,
      `${contractName}.json`
    );
    
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
      const { ethers } = await import('ethers');
      
      abiProof.contracts[contractName] = {
        abi: artifact.abi,
        bytecodeKeccak256: ethers.keccak256(artifact.bytecode),
        deployedBytecodeKeccak256: ethers.keccak256(artifact.deployedBytecode),
        deployedBytecodeSize: (artifact.deployedBytecode.length - 2) / 2
      };
    }
  }
  
  // Pin the ABI proof
  const result = await pinJson(abiProof, 'abi-proof.json', {
    type: 'ABI_BYTECODE_PROOF',
    version: '1.0.0',
    contractCount: Object.keys(abiProof.contracts).length
  });
  
  if (result.success) {
    // Save locally as well
    fs.writeFileSync(
      path.join(CONFIG.projectRoot, 'abi-proof.json'),
      JSON.stringify(abiProof, null, 2)
    );
  }
  
  return {
    ...result,
    contractCount: Object.keys(abiProof.contracts).length
  };
}

async function getPinStatus(cid) {
  const headers = getAuthHeaders();
  if (!headers) {
    return { success: false, error: 'Pinata credentials not set' };
  }
  
  try {
    const response = await fetch(
      `${CONFIG.pinataApiUrl}/data/pinList?hashContains=${cid}`,
      { headers }
    );
    
    const result = await response.json();
    
    if (result.rows && result.rows.length > 0) {
      const pin = result.rows[0];
      return {
        success: true,
        cid: pin.ipfs_pin_hash,
        name: pin.metadata?.name,
        size: pin.size,
        datePinned: pin.date_pinned,
        gatewayUrl: `${CONFIG.pinataGateway}/ipfs/${pin.ipfs_pin_hash}`
      };
    }
    
    return {
      success: false,
      error: 'CID not found in pinned content'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function listPins(limit = 10, nameFilter = null) {
  const headers = getAuthHeaders();
  if (!headers) {
    return { success: false, error: 'Pinata credentials not set' };
  }
  
  try {
    let url = `${CONFIG.pinataApiUrl}/data/pinList?pageLimit=${limit}`;
    if (nameFilter) {
      url += `&metadata[name]=${encodeURIComponent(nameFilter)}`;
    }
    
    const response = await fetch(url, { headers });
    const result = await response.json();
    
    return {
      success: true,
      count: result.count,
      pins: result.rows.map(pin => ({
        cid: pin.ipfs_pin_hash,
        name: pin.metadata?.name,
        size: pin.size,
        datePinned: pin.date_pinned,
        gatewayUrl: `${CONFIG.pinataGateway}/ipfs/${pin.ipfs_pin_hash}`
      }))
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function unpin(cid) {
  const headers = getAuthHeaders();
  if (!headers) {
    return { success: false, error: 'Pinata credentials not set' };
  }
  
  try {
    const response = await fetch(
      `${CONFIG.pinataApiUrl}/pinning/unpin/${cid}`,
      { method: 'DELETE', headers }
    );
    
    if (response.ok) {
      return {
        success: true,
        cid,
        message: `Successfully unpinned ${cid}`
      };
    }
    
    const result = await response.json();
    return {
      success: false,
      error: result.error?.message || 'Failed to unpin'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getGatewayUrl(cid) {
  return {
    success: true,
    cid,
    gatewayUrl: `${CONFIG.pinataGateway}/ipfs/${cid}`,
    publicGateway: `https://ipfs.io/ipfs/${cid}`
  };
}

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    let result;
    
    switch (name) {
      case 'pin_json':
        result = await pinJson(args.content, args.name, args?.keyValues);
        break;
        
      case 'pin_file':
        result = await pinFile(args.filePath, args?.name);
        break;
        
      case 'pin_abi_proof':
        result = await pinAbiProof();
        break;
        
      case 'get_pin_status':
        result = await getPinStatus(args.cid);
        break;
        
      case 'list_pins':
        result = await listPins(args?.limit, args?.name);
        break;
        
      case 'unpin':
        result = await unpin(args.cid);
        break;
        
      case 'get_gateway_url':
        result = getGatewayUrl(args.cid);
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
  console.error('IPFS Pinata MCP Server started');
}

main().catch(console.error);
