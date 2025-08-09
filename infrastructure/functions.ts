// Centralized functions configuration that imports from all module serverless.yml files
// This approach maintains modularity while keeping the main serverless.yml clean

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Interface for serverless function configuration
interface ServerlessFunction {
  handler: string;
  description?: string;
  timeout?: number;
  memorySize?: number;
  events?: Array<{
    httpApi?: {
      path: string;
      method: string;
    };
  }>;
  environment?: Record<string, string>;
}

// Interface for module configuration
interface ModuleConfig {
  functions: Record<string, ServerlessFunction>;
}

// Interface for the final functions export
interface FunctionsConfig {
  [functionName: string]: ServerlessFunction;
}

/**
 * Load and parse YAML files with proper error handling
 */
function loadYamlFile(filePath: string): ModuleConfig {
  try {
    const fullPath = path.resolve(__dirname, filePath);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const parsed = yaml.load(fileContents) as ModuleConfig;
    
    if (!parsed || !parsed.functions) {
      console.warn(`Warning: No functions found in ${filePath}`);
      return { functions: {} };
    }
    
    return parsed;
  } catch (error) {
    console.error(`Error loading ${filePath}:`, (error as Error).message);
    return { functions: {} };
  }
}

/**
 * Load all module configurations and merge them
 */
function loadAllFunctions(): FunctionsConfig {
  // Define all module paths
  const modulePaths = [
    '../src/functions/health/serverless.yml',
    '../src/functions/auth/serverless.yml',
    '../src/functions/templates/serverless.yml',
    '../src/functions/fields/serverless.yml',
    '../src/functions/files/serverless.yml',
    '../src/functions/pdf/serverless.yml',
  ];

  // Load all configurations
  const moduleConfigs = modulePaths.map(loadYamlFile);

  // Merge all functions into a single configuration
  const allFunctions: FunctionsConfig = {};
  
  moduleConfigs.forEach((config, index) => {
    const moduleName = modulePaths[index].split('/').slice(-2, -1)[0]; // Extract module name
    
    Object.entries(config.functions).forEach(([functionName, functionConfig]) => {
      if (allFunctions[functionName]) {
        console.warn(`Warning: Function '${functionName}' is defined in multiple modules. Using the one from ${moduleName}.`);
      }
      allFunctions[functionName] = functionConfig;
    });
  });

  return allFunctions;
}

// Export the merged functions configuration
const functions = loadAllFunctions();

// Log the loaded functions for debugging (only in development)
if (process.env.NODE_ENV !== 'production') {
  console.log(`Loaded ${Object.keys(functions).length} functions from modules:`, Object.keys(functions));
}

export = functions;