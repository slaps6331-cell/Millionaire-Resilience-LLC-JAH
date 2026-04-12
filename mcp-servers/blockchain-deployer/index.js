/**
 * MCP Server: Blockchain Deployer
 * Millionaire Resilience LLC
 * 
 * This MCP server provides tools for deploying smart contracts
 * to Story Protocol (Chain 1514) and Base L2 (Chain 8453).
 * 
 * Tools provided:
 *   - compile_contracts: Compile Solidity contracts with Hardhat/Foundry
 *   - deploy_to_story: Deploy contracts to Story Protocol mainnet
 *   - deploy_to_base: Deploy contracts to Base L2 mainnet
 *   - get_deployment_status: Check deployment status and addresses
 *   - estimate_gas: Estimate deployment gas costs
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ethers } from 'ethers';
import { execSync, exec } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  storyRpcUrl: process.env.STORY_RPC_URL || 'https://mainnet.storyrpc.io',
  baseRpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  storyChainId: 1514,
  baseChainId: 8453,
  projectRoot: process.env.PROJECT_ROOT || '/home/azureuser/blockchain/Millionaire-Resilience-LLC-JAH',
  contracts: [
    'StoryAttestationService',
    'StoryOrchestrationService',
    'StoryAttestationBridge',
    'SLAPSIPSpvLoan',
    'GladiatorHoldingsSpvLoan',
    'PILLoanEnforcement',
    'StablecoinIPEscrow',
    'AngelCoin',
    'ResilienceToken',
    'SlapsStreaming',
    'SlapsSPV',
    'UCC1FilingIntegration'
  ]
};

// Create MCP Server
const server = new Server(
  {
    name: 'blockchain-deployer',
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
    name: 'compile_contracts',
    description: 'Compile all Solidity smart contracts using Hardhat and Foundry',
    inputSchema: {
      type: 'object',
      properties: {
        force: {
          type: 'boolean',
          description: 'Force recompilation (clear cache)',
          default: false
        },
        compiler: {
          type: 'string',
          enum: ['hardhat', 'foundry', 'both'],
          description: 'Which compiler to use',
          default: 'hardhat'
        }
      }
    }
  },
  {
    name: 'deploy_to_story',
    description: 'Deploy smart contracts to Story Protocol mainnet (Chain 1514)',
    inputSchema: {
      type: 'object',
      properties: {
        contracts: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of contract names to deploy (empty for all)'
        },
        dryRun: {
          type: 'boolean',
          description: 'Simulate deployment without broadcasting',
          default: false
        }
      }
    }
  },
  {
    name: 'deploy_to_base',
    description: 'Deploy smart contracts to Base L2 mainnet (Chain 8453)',
    inputSchema: {
      type: 'object',
      properties: {
        contracts: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of contract names to deploy (empty for all)'
        },
        dryRun: {
          type: 'boolean',
          description: 'Simulate deployment without broadcasting',
          default: false
        }
      }
    }
  },
  {
    name: 'get_deployment_status',
    description: 'Get current deployment status and contract addresses',
    inputSchema: {
      type: 'object',
      properties: {
        network: {
          type: 'string',
          enum: ['story', 'base', 'both'],
          description: 'Network to check',
          default: 'both'
        }
      }
    }
  },
  {
    name: 'estimate_gas',
    description: 'Estimate gas costs for deployment on specified network',
    inputSchema: {
      type: 'object',
      properties: {
        network: {
          type: 'string',
          enum: ['story', 'base'],
          description: 'Network to estimate for'
        },
        contracts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Contracts to estimate (empty for all)'
        }
      },
      required: ['network']
    }
  },
  {
    name: 'check_wallet_balance',
    description: 'Check deployer wallet balance on specified network',
    inputSchema: {
      type: 'object',
      properties: {
        network: {
          type: 'string',
          enum: ['story', 'base', 'both'],
          description: 'Network to check balance',
          default: 'both'
        },
        address: {
          type: 'string',
          description: 'Wallet address (default: deployer wallet)'
        }
      }
    }
  },
  {
    name: 'get_contract_bytecode',
    description: 'Get compiled bytecode for a specific contract',
    inputSchema: {
      type: 'object',
      properties: {
        contractName: {
          type: 'string',
          description: 'Name of the contract'
        }
      },
      required: ['contractName']
    }
  }
];

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Tool implementation functions
async function compileContracts(force = false, compiler = 'hardhat') {
  const results = { hardhat: null, foundry: null };
  
  try {
    process.chdir(CONFIG.projectRoot);
    
    if (compiler === 'hardhat' || compiler === 'both') {
      const cmd = force ? 'npx hardhat compile --force' : 'npx hardhat compile';
      const output = execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
      results.hardhat = { success: true, output };
    }
    
    if (compiler === 'foundry' || compiler === 'both') {
      const cmd = force ? 'forge build --force' : 'forge build';
      const output = execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
      results.foundry = { success: true, output };
    }
    
    // Get bytecode sizes
    const sizes = {};
    for (const contract of CONFIG.contracts) {
      const artifactPath = path.join(
        CONFIG.projectRoot,
        'artifacts/contracts',
        `${contract}.sol`,
        `${contract}.json`
      );
      if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
        const bytecode = artifact.deployedBytecode.replace('0x', '');
        sizes[contract] = Math.floor(bytecode.length / 2);
      }
    }
    
    return {
      success: true,
      results,
      contractSizes: sizes,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

async function deployToNetwork(network, contracts = [], dryRun = false) {
  const rpcUrl = network === 'story' ? CONFIG.storyRpcUrl : CONFIG.baseRpcUrl;
  const chainId = network === 'story' ? CONFIG.storyChainId : CONFIG.baseChainId;
  
  try {
    process.chdir(CONFIG.projectRoot);
    
    // Check for private key
    if (!process.env.DEPLOYER_PRIVATE_KEY) {
      return {
        success: false,
        error: 'DEPLOYER_PRIVATE_KEY not set. Load secrets from Key Vault first.',
        network,
        chainId
      };
    }
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    const balanceEth = ethers.formatEther(balance);
    
    if (parseFloat(balanceEth) < 0.01) {
      return {
        success: false,
        error: `Insufficient balance: ${balanceEth} ${network === 'story' ? 'IP' : 'ETH'}`,
        network,
        chainId,
        balance: balanceEth
      };
    }
    
    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        network,
        chainId,
        deployer: wallet.address,
        balance: balanceEth,
        contracts: contracts.length ? contracts : CONFIG.contracts,
        message: 'Dry run successful. Ready to deploy.'
      };
    }
    
    // Execute deployment script
    const networkFlag = network === 'story' ? '--network story' : '--network base';
    const cmd = `npx hardhat run scripts/deploy.cjs ${networkFlag}`;
    const output = execSync(cmd, { 
      encoding: 'utf-8', 
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env }
    });
    
    // Read deployment config
    const configPath = path.join(CONFIG.projectRoot, `deployment-config.${network}.json`);
    let deploymentConfig = null;
    if (fs.existsSync(configPath)) {
      deploymentConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    
    return {
      success: true,
      network,
      chainId,
      deployer: wallet.address,
      balance: balanceEth,
      output,
      deploymentConfig,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      network,
      chainId,
      timestamp: new Date().toISOString()
    };
  }
}

async function getDeploymentStatus(network = 'both') {
  const status = {};
  
  const networks = network === 'both' ? ['story', 'base'] : [network];
  
  for (const net of networks) {
    const configPath = path.join(CONFIG.projectRoot, `deployment-config.${net}.json`);
    
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      status[net] = {
        deployed: true,
        config,
        explorer: net === 'story' ? 'https://www.storyscan.io' : 'https://basescan.org'
      };
    } else {
      status[net] = {
        deployed: false,
        message: 'No deployment config found'
      };
    }
  }
  
  return status;
}

async function estimateGas(network, contracts = []) {
  const rpcUrl = network === 'story' ? CONFIG.storyRpcUrl : CONFIG.baseRpcUrl;
  
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const gasPrice = await provider.getFeeData();
    
    const contractList = contracts.length ? contracts : CONFIG.contracts;
    const estimates = {};
    
    for (const contract of contractList) {
      const artifactPath = path.join(
        CONFIG.projectRoot,
        'artifacts/contracts',
        `${contract}.sol`,
        `${contract}.json`
      );
      
      if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
        const bytecode = artifact.bytecode;
        
        // Estimate based on bytecode size (rough estimate)
        const bytecodeSize = (bytecode.length - 2) / 2;
        const baseGas = 21000 + (bytecodeSize * 200); // Rough estimate
        
        const gasCostWei = BigInt(baseGas) * gasPrice.gasPrice;
        const gasCostEth = ethers.formatEther(gasCostWei);
        
        estimates[contract] = {
          bytecodeSize,
          estimatedGas: baseGas,
          estimatedCost: gasCostEth,
          unit: network === 'story' ? 'IP' : 'ETH'
        };
      }
    }
    
    return {
      success: true,
      network,
      gasPrice: ethers.formatUnits(gasPrice.gasPrice, 'gwei') + ' gwei',
      estimates,
      totalEstimatedCost: Object.values(estimates)
        .reduce((sum, e) => sum + parseFloat(e.estimatedCost), 0)
        .toFixed(6) + (network === 'story' ? ' IP' : ' ETH')
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      network
    };
  }
}

async function checkWalletBalance(network = 'both', address = null) {
  const deployerAddress = address || '0x597856e93f19877a399f686D2F43b298e2268618';
  const balances = {};
  
  const networks = network === 'both' ? ['story', 'base'] : [network];
  
  for (const net of networks) {
    const rpcUrl = net === 'story' ? CONFIG.storyRpcUrl : CONFIG.baseRpcUrl;
    
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const balance = await provider.getBalance(deployerAddress);
      
      balances[net] = {
        address: deployerAddress,
        balance: ethers.formatEther(balance),
        unit: net === 'story' ? 'IP' : 'ETH',
        chainId: net === 'story' ? CONFIG.storyChainId : CONFIG.baseChainId
      };
    } catch (error) {
      balances[net] = {
        error: error.message
      };
    }
  }
  
  return balances;
}

async function getContractBytecode(contractName) {
  const artifactPath = path.join(
    CONFIG.projectRoot,
    'artifacts/contracts',
    `${contractName}.sol`,
    `${contractName}.json`
  );
  
  if (!fs.existsSync(artifactPath)) {
    return {
      success: false,
      error: `Contract artifact not found: ${contractName}. Run compile first.`
    };
  }
  
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
  
  return {
    success: true,
    contractName,
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    deployedBytecode: artifact.deployedBytecode,
    bytecodeSize: (artifact.deployedBytecode.length - 2) / 2
  };
}

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    let result;
    
    switch (name) {
      case 'compile_contracts':
        result = await compileContracts(args?.force, args?.compiler);
        break;
        
      case 'deploy_to_story':
        result = await deployToNetwork('story', args?.contracts, args?.dryRun);
        break;
        
      case 'deploy_to_base':
        result = await deployToNetwork('base', args?.contracts, args?.dryRun);
        break;
        
      case 'get_deployment_status':
        result = await getDeploymentStatus(args?.network);
        break;
        
      case 'estimate_gas':
        result = await estimateGas(args.network, args?.contracts);
        break;
        
      case 'check_wallet_balance':
        result = await checkWalletBalance(args?.network, args?.address);
        break;
        
      case 'get_contract_bytecode':
        result = await getContractBytecode(args.contractName);
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
  console.error('Blockchain Deployer MCP Server started');
}

main().catch(console.error);
