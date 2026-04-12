/**
 * MCP Server: Azure Key Vault
 * Millionaire Resilience LLC
 * 
 * This MCP server provides secure access to Azure Key Vault secrets
 * for smart contract deployment credentials.
 * 
 * Tools provided:
 *   - get_secret: Retrieve a secret from Key Vault
 *   - list_secrets: List available secrets
 *   - load_deployment_secrets: Load all deployment secrets to environment
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

// Configuration
const CONFIG = {
  keyVaultName: process.env.AZURE_KEY_VAULT_NAME || 'kv-blockchain-deploy',
  keyVaultUrl: `https://${process.env.AZURE_KEY_VAULT_NAME || 'kv-blockchain-deploy'}.vault.azure.net`,
  deploymentSecrets: [
    { name: 'deployer-private-key', envVar: 'DEPLOYER_PRIVATE_KEY' },
    { name: 'storyscan-api-key', envVar: 'STORYSCAN_API_KEY' },
    { name: 'etherscan-api-key', envVar: 'ETHERSCAN_API_KEY' },
    { name: 'alchemy-api-key', envVar: 'ALCHEMY_API_KEY' },
    { name: 'pinata-jwt', envVar: 'PINATA_JWT' },
    { name: 'pinata-api-key', envVar: 'PINATA_API_KEY' },
    { name: 'pinata-secret-key', envVar: 'PINATA_SECRET_API_KEY' }
  ]
};

// Create Azure credential and client
let secretClient = null;

function getSecretClient() {
  if (!secretClient) {
    const credential = new DefaultAzureCredential();
    secretClient = new SecretClient(CONFIG.keyVaultUrl, credential);
  }
  return secretClient;
}

// Create MCP Server
const server = new Server(
  {
    name: 'azure-keyvault',
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
    name: 'get_secret',
    description: 'Retrieve a specific secret from Azure Key Vault',
    inputSchema: {
      type: 'object',
      properties: {
        secretName: {
          type: 'string',
          description: 'Name of the secret to retrieve'
        },
        setEnv: {
          type: 'boolean',
          description: 'Set as environment variable',
          default: false
        },
        envVarName: {
          type: 'string',
          description: 'Environment variable name (if setEnv is true)'
        }
      },
      required: ['secretName']
    }
  },
  {
    name: 'list_secrets',
    description: 'List all available secrets in the Key Vault (names only)',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'load_deployment_secrets',
    description: 'Load all deployment secrets into environment variables',
    inputSchema: {
      type: 'object',
      properties: {
        verbose: {
          type: 'boolean',
          description: 'Show which secrets were loaded',
          default: true
        }
      }
    }
  },
  {
    name: 'check_keyvault_connection',
    description: 'Verify connection to Azure Key Vault',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'set_secret',
    description: 'Store a new secret in Azure Key Vault',
    inputSchema: {
      type: 'object',
      properties: {
        secretName: {
          type: 'string',
          description: 'Name for the secret'
        },
        secretValue: {
          type: 'string',
          description: 'Value of the secret'
        }
      },
      required: ['secretName', 'secretValue']
    }
  }
];

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Tool implementations
async function getSecret(secretName, setEnv = false, envVarName = null) {
  try {
    const client = getSecretClient();
    const secret = await client.getSecret(secretName);
    
    if (setEnv) {
      const varName = envVarName || secretName.toUpperCase().replace(/-/g, '_');
      process.env[varName] = secret.value;
      
      return {
        success: true,
        secretName,
        environmentVariable: varName,
        message: `Secret loaded and set as ${varName}`
      };
    }
    
    return {
      success: true,
      secretName,
      value: secret.value.substring(0, 10) + '...',  // Partial value for security
      createdOn: secret.properties.createdOn,
      updatedOn: secret.properties.updatedOn
    };
  } catch (error) {
    return {
      success: false,
      secretName,
      error: error.message
    };
  }
}

async function listSecrets() {
  try {
    const client = getSecretClient();
    const secrets = [];
    
    for await (const secretProperties of client.listPropertiesOfSecrets()) {
      secrets.push({
        name: secretProperties.name,
        enabled: secretProperties.enabled,
        createdOn: secretProperties.createdOn,
        updatedOn: secretProperties.updatedOn
      });
    }
    
    return {
      success: true,
      keyVault: CONFIG.keyVaultName,
      secretCount: secrets.length,
      secrets
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function loadDeploymentSecrets(verbose = true) {
  const results = {
    success: true,
    loaded: [],
    failed: [],
    timestamp: new Date().toISOString()
  };
  
  const client = getSecretClient();
  
  for (const { name, envVar } of CONFIG.deploymentSecrets) {
    try {
      const secret = await client.getSecret(name);
      process.env[envVar] = secret.value;
      results.loaded.push({ name, envVar });
    } catch (error) {
      results.failed.push({ name, envVar, error: error.message });
    }
  }
  
  if (results.failed.length > 0) {
    results.success = false;
    results.message = `Loaded ${results.loaded.length}/${CONFIG.deploymentSecrets.length} secrets`;
  } else {
    results.message = `All ${results.loaded.length} deployment secrets loaded successfully`;
  }
  
  return results;
}

async function checkKeyVaultConnection() {
  try {
    const client = getSecretClient();
    
    // Try to list secrets (limited to 1) to verify connection
    const iterator = client.listPropertiesOfSecrets();
    await iterator.next();
    
    return {
      success: true,
      keyVault: CONFIG.keyVaultName,
      keyVaultUrl: CONFIG.keyVaultUrl,
      message: 'Connection successful'
    };
  } catch (error) {
    return {
      success: false,
      keyVault: CONFIG.keyVaultName,
      keyVaultUrl: CONFIG.keyVaultUrl,
      error: error.message,
      suggestion: 'Ensure VM has managed identity with Key Vault access'
    };
  }
}

async function setSecret(secretName, secretValue) {
  try {
    const client = getSecretClient();
    const result = await client.setSecret(secretName, secretValue);
    
    return {
      success: true,
      secretName,
      createdOn: result.properties.createdOn,
      message: `Secret '${secretName}' stored successfully`
    };
  } catch (error) {
    return {
      success: false,
      secretName,
      error: error.message
    };
  }
}

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    let result;
    
    switch (name) {
      case 'get_secret':
        result = await getSecret(args.secretName, args?.setEnv, args?.envVarName);
        break;
        
      case 'list_secrets':
        result = await listSecrets();
        break;
        
      case 'load_deployment_secrets':
        result = await loadDeploymentSecrets(args?.verbose);
        break;
        
      case 'check_keyvault_connection':
        result = await checkKeyVaultConnection();
        break;
        
      case 'set_secret':
        result = await setSecret(args.secretName, args.secretValue);
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
  console.error('Azure Key Vault MCP Server started');
}

main().catch(console.error);
